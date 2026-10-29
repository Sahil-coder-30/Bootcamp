"""Unit tests for the deterministic building blocks: taxonomy, patterns, sections,
levels (gates and thresholds), signals, documents, S3 storage (moto) and the DB layer."""

from __future__ import annotations

import pytest

from resume_service import documents, levels, patterns, sections, signals
from resume_service.documents import DocumentError, Line
from resume_service.levels import Unit
from resume_service.taxonomy import get_taxonomy, slugify

# --- taxonomy -----------------------------------------------------------------------


def test_taxonomy_boundaries_and_weak_aliases():
    tax = get_taxonomy()
    ids = lambda text, sec="projects": [h.skill.id for h in tax.find_in_text(text, sec)]  # noqa: E731
    assert ids("Built it in C++ and C# on .NET with Node.js") == ["cpp", "csharp", "dotnet", "nodejs"]
    assert "java" not in ids("Wrote JavaScript")
    assert ids("Took a rest and went to spring fest") == []  # weak aliases ignored in narrative text
    assert ids("REST, Spring", "skills") == ["rest-api", "spring"]
    assert ids("Languages: C, C++, R", "skills") == ["c", "cpp", "r"]
    assert ids("Grade C in maths") == []


def test_canonicalize():
    tax = get_taxonomy()
    assert tax.canonicalize("ReactJS")[0].id == "react"  # type: ignore[union-attr]
    assert tax.canonicalize("Postgre SQL")[0].id == "postgresql"  # type: ignore[union-attr]
    assert tax.canonicalize("Kubernetis")[1] == "fuzzy"
    assert tax.canonicalize("Go")[0].id == "go"  # type: ignore[union-attr]
    assert tax.canonicalize("Xy")[0] is None
    assert tax.canonicalize("Underwater basket weaving")[0] is None
    assert tax.canonicalize("  ")[1] == "none"
    assert slugify("Banking Domain!") == "banking-domain"


# --- patterns -----------------------------------------------------------------------


def test_contacts():
    c = patterns.find_contacts("Ravi | ravi.k@mail.co.in | (+91) 98765-43210 | https://github.com/ravik/ | x.com")
    assert c.email == "ravi.k@mail.co.in" and c.phone == "+919876543210"
    assert "github.com/ravik" in (c.links or [])
    intl = patterns.find_contacts("Tel +1 415 555 0134")
    assert intl.phone == "+14155550134"


@pytest.mark.parametrize("raw,expected", [
    ("Jan 2025", "2025-01"), ("Sept. 2024", "2024-09"), ("03/2023", "2023-03"), ("2022-11", "2022-11"),
    ("Summer 2025", "2025-05"), ("Present", "present"), ("2021", "2021"), ("jun '24", "2024-06"), ("foo", None),
])
def test_normalize_date(raw, expected):
    assert patterns.normalize_date(raw) == expected


def test_date_ranges_and_months():
    assert patterns.find_date_range("Intern, May 2025 – Jul 2025")[:2] == ("2025-05", "2025-07")
    assert patterns.find_date_range("2023 - Present")[:2] == ("2023", "present")
    assert patterns.find_date_range("Graduated 2024")[:2] == ("2024", None)
    assert patterns.find_date_range("no dates")[0] is None
    assert patterns.months_between("2025-05", "2025-07") == 3
    assert patterns.months_between("2024", "2024") == 12
    assert patterns.months_between("2026-01", "present", today=(2026, 10)) == 10
    assert patterns.months_between(None, "2025") is None


def test_scores():
    assert patterns.find_score("CGPA: 8.7/10") == "8.7 CGPA"
    assert patterns.find_score("3.6/4 GPA") == "3.6/4 GPA"
    assert patterns.find_score("Scored 91.4% in XII") == "91.4%"
    assert patterns.find_score("nothing") is None


def test_competitive():
    tiers = lambda t: sorted((s.kind, s.tier) for s in patterns.find_competitive(t))  # noqa: E731
    assert tiers("Solved 450+ problems on LeetCode") == [("solved", 1)]
    assert tiers("LeetCode rating 1750") == [("rating", 2)]
    assert tiers("Codeforces Specialist") == [("rating", 2)]
    assert tiers("ICPC Asia Regional 2024") == [("top_rank", 3)]
    assert tiers("Global rank 120 / 25,000 in CodeChef Starters") == [("top_rank", 3)]
    assert tiers("Top 3% in a coding contest") == [("top_rank", 3)]
    assert tiers("CodeChef 5 star") == [("top_rank", 3)]
    assert tiers("Volunteered in 2019 - 2020") == []


# --- signals ------------------------------------------------------------------------


def test_signals():
    s = signals.detect("Led a team of 4 and shipped to production, cutting latency by 40%")
    assert s.leadership and s.quantified and s.production and not s.creation
    assert signals.detect("Published a paper at IEEE").creation
    assert signals.hackathon_result("Top 10 finalist") == "Top 10"
    assert signals.hackathon_result("Top 1 at HackX") == "Winner"
    assert signals.is_podium("Top 3") and not signals.is_podium("Top 10") and not signals.is_podium(None)
    assert signals.cert_issuer("AWS Certified Solutions Architect") == "AWS"
    assert signals.cert_is_professional("AWS Certified Solutions Architect – Associate")
    cats = {c for c, *_ in signals.soft_signals("Handled 30 customer tickets daily\nGave a talk at PyCon")}
    assert cats == {"COMM"}


# --- sections -----------------------------------------------------------------------


def test_heading_classification():
    assert sections.classify_heading("WORK EXPERIENCE") == "experience"
    assert sections.classify_heading("Technical Skills:") == "skills"
    assert sections.classify_heading("Projets") == "projects"  # typo, fuzzy
    assert sections.classify_heading("Positions of Responsibility") == "positions"
    assert sections.classify_heading("Built a scalable system") is None
    assert sections.classify_heading("x" * 60) is None


def test_split_sections_inline_and_fallback():
    lines = [Line("Jane Doe", size=18, bold=True), Line("Skills: Python, SQL"), Line("Languages: Go, Rust"),
             Line("EDUCATION"), Line("B.Tech, ABC Institute, 2025")]
    secs, warnings = sections.split_sections(lines)
    names = [s.name for s in secs]
    assert names == ["header", "skills", "education"]
    assert "Languages: Go, Rust" in secs[1].text
    assert warnings == []
    _, w = sections.split_sections([Line("Just some text without headings")])
    assert w == ["segmentation_fallback"]


# --- levels -------------------------------------------------------------------------


def u(kind: str, base: float = 1.5, **kw) -> Unit:
    return Unit("COD", kind, base, kw.pop("ref", kind), "evidence", **kw)


def test_thresholds():
    assert [levels.points_to_level(p) for p in (0, 0.5, 2, 3, 5, 7, 10, 12, 15, 30)] == [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    assert levels.bloom(5) == "AS" and levels.bloom(10) == "CR"


def test_gates():
    listed_only = levels.score_category("COD", [u("listed", 0.5, ref=f"s{i}") for i in range(10)])
    assert listed_only.level == 2 and listed_only.confidence == "low"  # listed cap 1.0, G-AP
    one_project = levels.score_category("COD", [u("project", 10.0)])
    assert one_project.level == 4 and one_project.gate_applied == "G-AS"
    two = levels.score_category("COD", [u("project", 10.0, ref="a"), u("project", 10.0, ref="b")])
    assert two.level == 6 and two.gate_applied == "G-EV" and "no lead/design" in two.basis
    lead = [u("experience", 10.0, leadership=True), u("project", 5.0)]
    assert levels.score_category("COD", lead).level == 8  # G-CR caps at 8
    novel = lead + [u("project", 5.0, ref="c", creation=True)]
    assert levels.score_category("COD", novel).level == 10
    cert = levels.score_category("CLOUD", [Unit("CLOUD", "certification", 1.5, "AWS SAA")])
    assert (cert.level, cert.confidence) == (3, "medium")


def test_depth_recency_and_hint():
    assert u("project", 2.0, quantified=True, leadership=True).points == pytest.approx(3.0)
    assert u("project", 2.0, old=True).points == pytest.approx(1.6)
    assert levels.skill_level_hint([]) is None
    assert levels.skill_level_hint([u("project", 1.5)]) == 3
    soft = [Unit("COMM", "soft_signal", 1.0, f"s{i}") for i in range(6)]
    assert levels.score_category("COMM", soft).points == pytest.approx(3.0)  # 3 soft units max
    assert len(levels.infer_levels([u("project")])) == 12


# --- documents ----------------------------------------------------------------------


def test_clean_text_and_kinds():
    assert documents.clean_text(" ● Built ﬁles fast") == "- Built files fast"
    assert documents.clean_text("-12% cost") == "-12% cost"
    assert documents.sniff_kind(b"%PDF-1.7", "x") == "pdf"
    assert documents.sniff_kind(b"PK\x03\x04", "cv.docx") == "docx"
    assert documents.sniff_kind(b"hello", "cv.md") == "text"
    with pytest.raises(DocumentError) as e:
        documents.parse_document(b"PK\x03\x04junk", "cv.docx")
    assert e.value.code == "unreadable_document"
    with pytest.raises(DocumentError) as e:
        documents.parse_document(b"tiny", "cv.txt")
    assert e.value.code == "unreadable_document"


def test_scanned_pdf_and_password():
    import pymupdf

    blank = pymupdf.open()
    blank.new_page()
    with pytest.raises(DocumentError) as e:
        documents.parse_document(blank.tobytes(), "scan.pdf")
    assert e.value.code == "scanned_pdf_ocr_unavailable"

    doc = pymupdf.open()
    doc.new_page().insert_text((50, 50), "secret resume " * 10)
    locked = doc.tobytes(encryption=pymupdf.PDF_ENCRYPT_AES_256, user_pw="pw", owner_pw="pw")
    with pytest.raises(DocumentError):
        documents.parse_document(locked, "locked.pdf")


def test_running_header_removed_and_hyphen_join():
    import pymupdf

    doc = pymupdf.open()
    for i in range(2):
        page = doc.new_page()
        page.insert_text((50, 20), "Ananya Rao - Resume")
        page.insert_text((50, 100), f"Body text on page {i + 1} with enough characters to count as content.")
        page.insert_text((50, 820), f"Page {i + 1} of 2")
    parsed = documents.parse_document(doc.tobytes(), "two-page.pdf")
    texts = [ln.text for ln in parsed.lines]
    assert texts.count("Ananya Rao - Resume") == 1  # kept on page 1 (contact info lives there)
    assert not any(t.startswith("Page ") for t in texts)
    joined = documents.parse_text("Built a distri-\nbuted system")
    assert [ln.text for ln in joined.lines] == ["Built a distributed system"]


# --- storage ------------------------------------------------------------------------


def test_s3_storage_with_moto(monkeypatch):
    boto3 = pytest.importorskip("boto3")
    from moto import mock_aws

    from resume_service.settings import Settings
    from resume_service.storage import S3Storage, make_storage, object_key

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        boto3.client("s3", region_name="ap-south-1").create_bucket(
            Bucket="resumes-test", CreateBucketConfiguration={"LocationConstraint": "ap-south-1"})
        st = make_storage(Settings(s3_bucket="resumes-test", s3_region="ap-south-1"))  # type: ignore[call-arg]
        assert isinstance(st, S3Storage) and st.backend == "s3" and st.ping()
        key = object_key("resume-files", "ab" * 32, "pdf")
        st.put(key, b"%PDF-data", "application/pdf")
        assert st.get(key) == b"%PDF-data"
        url = st.presign(key, "cv.pdf")
        assert url and "resumes-test" in url and "X-Amz-Signature" in url
        st.delete(key)
        from resume_service.storage import StorageError

        with pytest.raises(StorageError):
            st.get(key)
        assert not S3Storage("missing-bucket", "ap-south-1", None).ping()


def test_api_with_s3_backend(monkeypatch, tmp_path, texts):
    boto3 = pytest.importorskip("boto3")
    from fastapi.testclient import TestClient
    from moto import mock_aws

    from conftest import make_pdf
    from resume_service.main import create_app
    from resume_service.settings import Settings

    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "testing")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "testing")
    with mock_aws():
        s3 = boto3.client("s3", region_name="us-east-1")
        s3.create_bucket(Bucket="cv-bucket")
        settings = Settings(database_url=f"sqlite:///{tmp_path / 'db.sqlite'}", s3_bucket="cv-bucket",  # type: ignore[call-arg]
                            s3_region="us-east-1")
        with TestClient(create_app(settings)) as c:
            data = make_pdf(texts["ananya_rao"])
            rec = c.post("/resumes", files={"file": ("a.pdf", data, "application/pdf")}).json()
            obj = s3.get_object(Bucket="cv-bucket", Key=f"resume-files/{rec['sha256']}.pdf")
            assert obj["Body"].read() == data and obj["ServerSideEncryption"] == "AES256"
            r = c.get(f"/resumes/{rec['resume_id']}/file", params={"redirect": "true"}, follow_redirects=False)
            assert r.status_code == 307 and "X-Amz-Signature" in r.headers["location"]
            assert c.get("/health").json()["storage"] == "s3"


def test_local_storage_rejects_traversal(tmp_path):
    from resume_service.storage import LocalStorage, StorageError

    st = LocalStorage(tmp_path)
    with pytest.raises(StorageError):
        st.put("../evil.txt", b"x", "text/plain")
    with pytest.raises(StorageError):
        st.get("resume-files/missing.pdf")
    assert st.presign("k", "f") is None


# --- db -----------------------------------------------------------------------------


def test_db_url_normalization_and_ping(tmp_path):
    from resume_service.db import ResumeRepo, _normalize_url, make_engine

    assert _normalize_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    assert _normalize_url("postgresql://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
    repo = ResumeRepo(make_engine(f"sqlite:///{tmp_path / 'x' / 'r.db'}"))
    repo.create_schema()
    assert repo.ping()
    assert repo.update(__import__("uuid").uuid4(), status="failed") is None
    bad = ResumeRepo(make_engine("postgresql://nobody:pw@127.0.0.1:1/none"))
    assert bad.ping() is False


def test_nlp_fallback(monkeypatch):
    from resume_service import nlp

    nlp.get_nlp.cache_clear()
    monkeypatch.setenv("RESUME_SPACY_MODEL", "off")
    try:
        assert nlp.get_nlp() is None and nlp.model_name() is None
        assert nlp.find_orgs("Google") == [] and nlp.find_location("Delhi") is None
        assert nlp.find_name(["ANANYA RAO", "ananya@x.com"], "ananya@x.com") == ("Ananya Rao", "high")
        assert nlp.find_name(["Resume"], None) == (None, "low")
    finally:
        nlp.get_nlp.cache_clear()
    monkeypatch.setenv("RESUME_SPACY_MODEL", "no_such_model_xyz")
    try:
        assert nlp.get_nlp() is None
    finally:
        nlp.get_nlp.cache_clear()
