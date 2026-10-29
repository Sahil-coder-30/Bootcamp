"""End-to-end parsing of the four sample candidates (text, PDF, DOCX) and the
relational invariants from the role-2 plan (section 3.8)."""

from __future__ import annotations

import statistics

import pytest

from conftest import CANDIDATES, make_docx, make_pdf, make_two_column_pdf
from resume_service.contract import CATEGORY_CODES, ResumeExtraction
from resume_service.pipeline import parse_resume, parse_resume_text, rescore


@pytest.fixture(scope="module")
def parsed(texts) -> dict[str, ResumeExtraction]:
    return {n: parse_resume_text(t, f"{n}.txt") for n, t in texts.items()}


def lv(p: dict[str, ResumeExtraction], who: str, code: str) -> int:
    return p[who].category_levels[code]


def test_contract_shape(parsed):
    for ext in parsed.values():
        assert set(ext.category_levels) == set(CATEGORY_CODES)
        assert set(ext.category_level_details) == set(CATEGORY_CODES)
        assert ext.meta.llm_calls == 0
        assert ext.source_type == "resume"
        for s in ext.skills:
            assert s.evidence, "every skill carries evidence (anti-hallucination gate)"
            assert len(s.evidence) <= 200
            assert s.category_code in (*CATEGORY_CODES, "OTHER")
        # contract: no evidence -> level 1, confidence low, basis "no evidence"
        for d in ext.category_level_details.values():
            if d.points == 0:
                assert (d.level, d.confidence, d.basis) == (1, "low", "no evidence")
        ResumeExtraction.model_validate_json(ext.model_dump_json())


def test_contact_and_education(parsed):
    a = parsed["ananya_rao"]
    assert a.candidate.name == "Ananya Rao"
    assert a.candidate.email == "ananya.rao@example.com"
    assert a.candidate.phone == "+919876543210"
    assert "github.com/ananyarao" in a.candidate.links
    assert a.education[0].score == "8.7 CGPA"
    assert a.education[0].year == "2026"
    assert a.field_confidence["name"] == "high"
    p = parsed["priya_menon"]
    assert p.candidate.phone == "+919123456780"
    assert [e.score for e in p.education] == ["78%", "88%"]
    assert p.role == "Software Engineer"


def test_experience_and_projects(parsed):
    exp = parsed["ananya_rao"].experience[0]
    assert (exp.title, exp.org, exp.kind) == ("SDE Intern", "Acme Payments Pvt Ltd", "internship")
    assert (exp.start, exp.end, exp.months) == ("2025-05", "2025-07", 3)
    assert "Go" in exp.skills and "Message Queues" in exp.skills
    names = [p.name for p in parsed["rohan_verma"].projects]
    assert names == ["DevFlow (open source)", "Smart Campus Assistant", "Concurrent Web Crawler"]
    # the tech stack after "|" in a project heading counts as that project's skills
    assert "Generative AI / LLMs" in parsed["rohan_verma"].projects[1].skills
    assert parsed["rohan_verma"].hackathons[0].result == "Runner-up"
    assert parsed["ananya_rao"].hackathons[0].name == "Smart India Hackathon"


def test_skill_confidence_rule(parsed):
    skills = {s.canonical_id: s for s in parsed["priya_menon"].skills}
    assert skills["sql"].confidence == "high"  # used in the internship
    assert skills["css"].confidence == "medium"  # only listed
    assert skills["oracle-db"].section in ("certifications", "skills")
    assert any(w.startswith("unmapped_skill") for w in parsed["priya_menon"].meta.warnings) is False


def test_relational_invariants(parsed):
    p = parsed
    assert lv(p, "ananya_rao", "SYSD") > lv(p, "karthik_subramaniam", "SYSD")
    assert lv(p, "ananya_rao", "OS") > lv(p, "karthik_subramaniam", "OS")
    assert lv(p, "ananya_rao", "DSA") >= lv(p, "karthik_subramaniam", "DSA") + 2
    assert lv(p, "karthik_subramaniam", "SQL") > lv(p, "ananya_rao", "SQL")
    assert lv(p, "karthik_subramaniam", "AI") > lv(p, "ananya_rao", "AI")
    means = {n: statistics.mean(e.category_levels.values()) for n, e in p.items()}
    assert min(means, key=means.get) == "priya_menon"  # type: ignore[arg-type]
    assert max(means, key=means.get) == "rohan_verma"  # type: ignore[arg-type]
    priya = list(p["priya_menon"].category_levels.values())
    assert lv(p, "priya_menon", "COMM") >= statistics.median(priya) + 2
    assert lv(p, "priya_menon", "SQL") >= 4
    for other in ("ananya_rao", "karthik_subramaniam", "priya_menon"):
        wins = sum(lv(p, "rohan_verma", c) >= lv(p, other, c) for c in CATEGORY_CODES)
        assert wins >= 8, other
    names = list(p)
    for i, a in enumerate(names):
        for b in names[i + 1:]:
            l1 = sum(abs(lv(p, a, c) - lv(p, b, c)) for c in CATEGORY_CODES)
            assert l1 >= 12, (a, b, l1)


def test_keyword_stuffing_does_not_pay():
    stuffed = "Jane Doe\njane@x.com\n\nSkills\nSQL, MySQL, PostgreSQL, PL/SQL, Oracle, SQLite, MongoDB, Redis\n"
    ext = parse_resume_text(stuffed)
    assert ext.category_levels["SQL"] == 2
    assert ext.category_level_details["SQL"].confidence == "low"


def test_rescore_is_deterministic_and_reacts_to_edits(parsed):
    base = parsed["priya_menon"]
    again = rescore(ResumeExtraction.model_validate(base.model_dump()))
    assert again.category_levels == base.category_levels
    edited = ResumeExtraction.model_validate(base.model_dump())
    edited.projects[0].description += " Built REST APIs with Docker and Kubernetes, deployed on AWS for 200 users."
    assert rescore(edited).category_levels["CLOUD"] > base.category_levels["CLOUD"]


@pytest.mark.parametrize("name", CANDIDATES)
def test_pdf_and_docx_match_text(texts, parsed, name):
    """Format invariance: the same resume as PDF or DOCX gives (almost) the same levels."""
    for data, fname in ((make_pdf(texts[name]), f"{name}.pdf"), (make_docx(texts[name]), f"{name}.docx")):
        ext = parse_resume(data, fname)
        diffs = [abs(ext.category_levels[c] - parsed[name].category_levels[c]) for c in CATEGORY_CODES]
        assert max(diffs) <= 1, (fname, ext.category_levels, parsed[name].category_levels)
        assert ext.candidate.email == parsed[name].candidate.email
        ref = {s.canonical_id for s in parsed[name].skills}
        got = {s.canonical_id for s in ext.skills}
        assert len(ref & got) / len(ref | got) >= 0.85, fname
        assert ext.meta.doc_sha256 and len(ext.meta.doc_sha256) == 64


def test_pdf_layout_meta(texts):
    ext = parse_resume(make_pdf(texts["ananya_rao"]), "ananya.pdf")
    assert ext.meta.layout == "single"
    assert ext.meta.page_count == 1
    assert {"education", "experience", "projects", "skills"} <= set(ext.meta.sections_found)


def test_two_column_pdf_keeps_sections_apart():
    sidebar = ["CONTACT", "neha@example.com", "+91 91234 56780", "SKILLS", "Python", "Docker", "Kubernetes",
               "PostgreSQL", "Git", "Linux"]
    main = ["EXPERIENCE", "Backend Intern | Zeta Pvt Ltd | Jan 2025 - Jun 2025",
            "- Built Python microservices on Kubernetes, cutting p95 latency by 30%",
            "- Designed PostgreSQL schemas for 1M rows", "PROJECTS", "Log Analyzer | Python",
            "- Parsed 10 GB of Linux logs with Python and Docker", "EDUCATION", "B.Tech CSE, NIT Trichy, 2025"]
    ext = parse_resume(make_two_column_pdf(sidebar, main, "Neha Kapoor"), "neha.pdf")
    assert ext.meta.layout == "two_column"
    assert ext.candidate.name == "Neha Kapoor"
    assert ext.candidate.email == "neha@example.com"
    assert ext.experience and ext.experience[0].org == "Zeta Pvt Ltd"
    assert "Kubernetes" in ext.experience[0].skills
    listed = {s.canonical_id for s in ext.skills if s.section == "skills"}
    assert "git" in listed


def test_docx_table_layout_and_header(texts):
    data = make_docx(texts["priya_menon"], header_line="priya.menon@example.com | 9123456780", table_layout=True)
    ext = parse_resume(data, "priya.docx")
    assert ext.candidate.email == "priya.menon@example.com"
    assert ext.experience[0].org == "Infozen Solutions Pvt Ltd"
    assert ext.meta.layout == "docx"


def test_docx_bullets_without_list_style(texts):
    """Real-world DOCX often has bullets as plain paragraphs; action verbs still mark the body."""
    import io

    import docx

    d = docx.Document()
    for line in texts["ananya_rao"].splitlines():
        if line.strip():
            d.add_paragraph(line[2:] if line.startswith("- ") else line)
    buf = io.BytesIO()
    d.save(buf)
    ext = parse_resume(buf.getvalue(), "plain.docx")
    assert [p.name for p in ext.projects] == ["Raft KV Store", "Distributed Rate Limiter", "Mini Shell"]
    assert "PostgreSQL" in ext.experience[0].skills
