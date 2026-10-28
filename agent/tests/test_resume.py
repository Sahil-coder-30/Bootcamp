"""
test_resume.py
==============
Comprehensive unit and integration tests for Role 2: Resume Parsing.
Validates PII masking, Bloom gates (lv-1.0), grounding checks, and API routes.
"""

from __future__ import annotations

from fastapi.testclient import TestClient

from openradix_agents.api.main import app
from talent_match.resume.models import Line
from talent_match.resume.patterns import find_contacts, find_scores, redact_pii
from talent_match.resume.samples import get_sample_extraction
from talent_match.resume.sections import classify_heading, segment

client = TestClient(app)


def test_patterns_and_pii_redaction():
    sample_text = """
    Ananya Rao
    ananya.rao@jssaten.ac.in | +91 98765 43210
    github.com/ananyarao | linkedin.com/in/ananyarao
    B.Tech in Computer Science, 8.85 CGPA
    """
    contact = find_contacts(sample_text)
    assert contact.name == "Ananya Rao"
    assert contact.email == "ananya.rao@jssaten.ac.in"
    assert contact.phone == "+919876543210"
    assert len(contact.links) >= 1

    scores = find_scores(sample_text)
    assert any("8.85" in s for s in scores)

    redacted = redact_pii(sample_text, contact)
    assert "ananya.rao@jssaten.ac.in" not in redacted
    assert "[EMAIL]" in redacted
    assert "+91 98765 43210" not in redacted
    assert "[PHONE]" in redacted


def test_section_classification_and_segmentation():
    line_exp = Line(text="WORK EXPERIENCE", font_size=14.0, is_bold=True)
    assert classify_heading(line_exp) == "experience"

    line_proj = Line(text="Key Technical Projects:", font_size=12.0, is_bold=True)
    assert classify_heading(line_proj) == "projects"

    line_body = Line(text="Built microservices using Go and Kafka", font_size=10.0, is_bold=False)
    assert classify_heading(line_body) is None

    lines = [
        Line(text="Ananya Rao", font_size=16.0, is_bold=True),
        Line(text="Summary of candidate qualifications", font_size=10.0),
        Line(text="EXPERIENCE", font_size=14.0, is_bold=True),
        Line(text="- SDE Intern at Acme", font_size=10.0),
        Line(text="TECHNICAL SKILLS", font_size=14.0, is_bold=True),
        Line(text="Languages: Python, Go", font_size=10.0),
    ]
    sections = segment(lines)
    sec_names = [s.name for s in sections]
    assert "experience" in sec_names
    assert "skills" in sec_names


def test_levels_bloom_gating_rules():
    ananya = get_sample_extraction("ananya")
    assert ananya.category_levels["SYSD"] >= 5
    assert ananya.category_levels["DSA"] >= 7
    assert ananya.category_level_details["SYSD"].bloom in ("AS", "EV")
    assert ananya.category_level_details["SYSD"].confidence == "high"

    priya = get_sample_extraction("priya")
    assert priya.category_levels["COMM"] >= 4
    # Priya's mean should be entry-level
    assert sum(priya.category_levels.values()) / 12 < sum(ananya.category_levels.values()) / 12

    # Relational Invariants from plan.md section 3.8
    karthik = get_sample_extraction("karthik")
    assert ananya.category_levels["SYSD"] >= karthik.category_levels["SYSD"]
    assert karthik.category_levels["SQL"] >= ananya.category_levels["SQL"]


def test_fastapi_endpoints():
    res_sample = client.get("/extract/resume/sample/ananya")
    assert res_sample.status_code == 200
    data = res_sample.json()
    assert data["candidate"]["name"] == "Ananya Rao"
    assert len(data["skills"]) > 5
    assert len(data["category_levels"]) == 12

    # Re-infer levels endpoint
    res_infer = client.post("/levels/infer", json={"extraction": data})
    assert res_infer.status_code == 200
    infer_data = res_infer.json()
    assert "category_levels" in infer_data
    assert infer_data["latency_ms"] < 50


def test_full_pipeline_parse_resume():
    from talent_match.resume.pipeline import parse_resume

    sample_cv = b"""
    Ananya Rao
    ananya.rao@jssaten.ac.in | +91 98765 43210
    github.com/ananyarao | linkedin.com/in/ananyarao

    EDUCATION
    B.Tech in Computer Science, JSS Academy of Technical Education, 2026, 8.85 CGPA

    EXPERIENCE
    Software Engineering Intern at CloudScale Technologies
    2025-05 to 2025-07
    - Engineered scalable microservices in Go and Python processing 10k req/s with Kafka.
    - Optimized PostgreSQL database queries reducing latency by 40%.
    - Deployed Docker containers to AWS ECS with CI/CD pipeline.

    PROJECTS
    Distributed KV Store
    - Implemented Raft consensus in Go with gRPC communication.
    - Designed distributed cache using Redis and WebSockets.

    SKILLS
    Languages: Go, Python, TypeScript, Java, C++
    Frameworks & Tools: React, Docker, Kubernetes, Kafka, Redis, PostgreSQL, Git, Linux
    """
    res = parse_resume(sample_cv, file_name="ananya_resume.txt", mime="text/plain")
    assert res.candidate.name == "Ananya Rao"
    assert len(res.skills) > 0
    assert "SYSD" in res.category_levels
    assert res.meta["grounding_rate"] > 0.5


def test_taxonomy_and_merge():
    from talent_match.resume.merge import merge_skills
    from talent_match.resume.models import RawSkill
    from talent_match.resume.taxonomy import canonicalize

    assert canonicalize("python") == ("python", "COD")
    assert canonicalize("kubernetes") == ("kubernetes", "CLOUD")
    assert canonicalize("reactjs") == ("react", "SWE")
    assert canonicalize("unknown-super-tech")[1] == "SWE"

    raw = [
        RawSkill(
            skill_name="Go",
            category_code="COD",
            evidence="Built Go backend",
            confidence="high",
            section="experience",
        ),
        RawSkill(
            skill_name="Go",
            category_code="COD",
            evidence="Go microservice",
            confidence="medium",
            section="projects",
        ),
        RawSkill(
            skill_name="PostgreSQL",
            category_code="SQL",
            evidence="PostgreSQL queries",
            confidence="high",
            section="experience",
        ),
    ]
    skills, rate, warnings = merge_skills(raw, "Built Go backend and PostgreSQL queries")
    assert len(skills) == 2
    assert rate >= 0.5


def test_layout_normalize_and_gutter():
    from talent_match.resume.layout import detect_gutter, extract_document_lines, normalize

    assert normalize("hello   world\uf0a7") == "hello world"
    lines = extract_document_lines(b"Line 1\nLine 2", "test.txt", "text/plain")
    assert len(lines) == 2
    assert detect_gutter([], page_w=595.0, body_top=50.0, body_bot=800.0) is None


def test_router_json_and_upload():
    import base64

    # JSON endpoint with sample key
    res = client.post("/extract/resume/json", json={"sample_key": "karthik"})
    assert res.status_code == 200
    assert res.json()["candidate"]["name"] == "Karthik Subramaniam"

    # JSON endpoint with base64 content
    b64 = base64.b64encode(
        b"Ananya Rao\nananya@example.com\nEXPERIENCE\n- SDE Intern with Python"
    ).decode()
    res2 = client.post("/extract/resume/json", json={"content_b64": b64, "file_name": "test.txt"})
    assert res2.status_code == 200

    # Multipart upload endpoint
    files = {"file": ("resume.txt", b"Ananya Rao\nananya@example.com\nSKILLS\nPython, Docker", "text/plain")}
    res3 = client.post("/extract/resume", files=files)
    assert res3.status_code == 200

    # Default fallback when no file is uploaded
    res_none = client.post("/extract/resume")
    assert res_none.status_code == 200
    assert res_none.json()["candidate"]["name"] == "Ananya Rao"
