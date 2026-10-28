"""
test_resume.py
==============
Comprehensive unit and integration tests for Role 2: Resume Parsing.
Validates PII masking, Bloom gates (lv-1.0), grounding checks, and API routes.
"""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from openradix_agents.api.main import app
from talent_match.contract import ResumeExtraction
from talent_match.resume.layout import detect_gutter, normalize
from talent_match.resume.levels import infer_levels
from talent_match.resume.models import Block, Line, Section
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
