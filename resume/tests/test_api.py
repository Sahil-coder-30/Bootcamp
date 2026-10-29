"""HTTP API: upload, dedupe cache, ownership via X-User-Id, file download, profile
draft (the shape Talent Check reads), reparse, delete, errors."""

from __future__ import annotations

import uuid

from conftest import make_docx, make_pdf
from resume_service.contract import CATEGORY_CODES

PDF = "application/pdf"


def upload(client, content: bytes, name: str = "ananya.pdf", mime: str = PDF, **kw):
    return client.post("/resumes", files={"file": (name, content, mime)}, **kw)


def test_probes_and_health(client):
    assert client.get("/healthz").json() == {"status": "ok"}
    assert client.get("/readyz").status_code == 200
    h = client.get("/health").json()
    assert h["llm_calls"] == 0
    assert h["storage"] == "local" and h["storage_ok"] and h["db_ok"]
    assert h["taxonomy_skills"] > 80
    assert h["levels_version"] == "lv-1.0"


def test_stateless_parse_and_text(client, texts):
    r = client.post("/parse", files={"file": ("a.pdf", make_pdf(texts["ananya_rao"]), PDF)})
    assert r.status_code == 200
    body = r.json()
    assert body["candidate"]["email"] == "ananya.rao@example.com"
    assert set(body["category_levels"]) == set(CATEGORY_CODES)
    r = client.post("/parse/text", json={"text": texts["priya_menon"], "source_file": "priya.txt"})
    assert r.status_code == 200 and r.json()["source_file"] == "priya.txt"
    assert client.get("/resumes").json()["total"] == 0  # stateless routes store nothing


def test_upload_store_dedupe_and_get(client, texts, settings):
    data = make_pdf(texts["ananya_rao"])
    r = upload(client, data)
    assert r.status_code == 201
    rec = r.json()
    rid = rec["resume_id"]
    assert uuid.UUID(rid)
    assert rec["cached"] is False and rec["extraction"]["extraction_id"] == rid
    key = f"resume-files/{rec['sha256']}.pdf"
    assert (settings.storage_dir / key).read_bytes() == data

    again = upload(client, data)
    assert again.status_code == 200
    assert again.json()["resume_id"] == rid and again.json()["cached"] is True
    assert again.json()["extraction"]["meta"]["cached"] is True

    forced = upload(client, data, params={"force": "true"})
    assert forced.status_code == 200 and forced.json()["cached"] is False

    got = client.get(f"/resumes/{rid}").json()
    assert got["extraction"]["candidate"]["name"] == "Ananya Rao"
    f = client.get(f"/resumes/{rid}/file")
    assert f.status_code == 200 and f.content == data and f.headers["content-type"] == PDF
    # local storage has no presigned URLs: redirect falls back to streaming
    assert client.get(f"/resumes/{rid}/file", params={"redirect": "true"}).content == data


def test_user_scoping(client, texts):
    alice, bob = str(uuid.uuid4()), str(uuid.uuid4())
    data = make_docx(texts["priya_menon"])
    docx_mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    r = upload(client, data, "priya.docx", docx_mime, headers={"X-User-Id": alice})
    assert r.status_code == 201 and r.json()["user_id"] == alice
    rid = r.json()["resume_id"]
    # same file, other user -> separate row
    r2 = upload(client, data, "priya.docx", docx_mime, data={"user_id": bob})
    assert r2.status_code == 201 and r2.json()["resume_id"] != rid

    assert client.get(f"/resumes/{rid}", headers={"X-User-Id": bob}).status_code == 404
    assert client.get(f"/resumes/{rid}", headers={"X-User-Id": alice}).status_code == 200
    mine = client.get("/resumes", headers={"X-User-Id": alice}).json()
    assert mine["total"] == 1 and mine["items"][0]["extraction"] is None
    full = client.get("/resumes", params={"email": "PRIYA.menon@example.com", "include_extraction": "true"}).json()
    assert full["total"] == 2 and full["items"][0]["extraction"] is not None
    assert client.get(f"/resumes/{rid}", headers={"X-User-Id": "not-a-uuid"}).status_code == 422


def test_attach_user(client, texts):
    rid = upload(client, make_pdf(texts["rohan_verma"]), "rohan.pdf").json()["resume_id"]
    user = str(uuid.uuid4())
    r = client.patch(f"/resumes/{rid}", json={"user_id": user})
    assert r.status_code == 200 and r.json()["user_id"] == user
    assert client.patch(f"/resumes/{rid}", json={"user_id": str(uuid.uuid4())}).status_code == 404


def test_profile_draft_matches_talent_check_shape(client, texts):
    rid = upload(client, make_pdf(texts["ananya_rao"])).json()["resume_id"]
    draft = client.get(f"/resumes/{rid}/profile-draft").json()
    assert draft["email"] == "ananya.rao@example.com"
    assert draft["resume_extraction_id"] == rid
    assert draft["cv_file"].startswith("resume-files/")
    assert draft["education"].startswith("B.Tech")
    assert set(draft["skill_levels"]) == set(CATEGORY_CODES)
    for row in draft["skill_levels"].values():
        assert row["source"] == "resume_inferred"
        assert 1 <= row["level"] <= 10 and row["inferred_level"] == row["level"]
        assert row["confidence"] in ("high", "medium", "low") and row["basis"]
    assert draft["internships"][0]["org"] == "Acme Payments Pvt Ltd"


def test_levels_infer_and_reparse(client, texts):
    ext = client.post("/parse/text", json={"text": texts["priya_menon"]}).json()
    ext["hackathons"].append({"name": "Smart India Hackathon", "result": "Winner", "year": "2025"})
    r = client.post("/levels/infer", json=ext)
    assert r.status_code == 200
    assert r.json()["category_levels"]["APTI"] > ext["category_levels"]["APTI"]

    rid = upload(client, make_pdf(texts["priya_menon"]), "priya.pdf").json()["resume_id"]
    rep = client.post(f"/resumes/{rid}/reparse")
    assert rep.status_code == 200 and rep.json()["resume_id"] == rid


def test_delete(client, texts, settings):
    rec = upload(client, make_pdf(texts["karthik_subramaniam"]), "k.pdf").json()
    rid = rec["resume_id"]
    path = settings.storage_dir / f"resume-files/{rec['sha256']}.pdf"
    assert path.exists()
    assert client.delete(f"/resumes/{rid}").status_code == 204
    assert client.get(f"/resumes/{rid}").status_code == 404
    assert not path.exists()
    assert client.delete(f"/resumes/{rid}").status_code == 404


def test_errors(client):
    r = client.post("/resumes", files={"file": ("x.pdf", b"%PDF-1.4 garbage", PDF)})
    assert r.status_code == 422 and r.json()["code"] == "unreadable_document"
    r = client.post("/parse", files={"file": ("x.bin", b"\xff\xfe\x00\x81" * 10, "application/octet-stream")})
    assert r.status_code == 422 and r.json()["code"] == "unsupported_format"
    r = client.post("/parse", files={"file": ("e.txt", b"", "text/plain")})
    assert r.status_code == 422 and r.json()["code"] == "empty_file"
    big = b"a" * (1024 * 1024 + 10)
    assert client.post("/parse", files={"file": ("big.txt", big, "text/plain")}).status_code == 413
    assert client.get(f"/resumes/{uuid.uuid4()}").status_code == 404
    assert client.get("/resumes/not-a-uuid").status_code == 422
    assert client.get(f"/resumes/{uuid.uuid4()}/profile-draft").status_code == 404


def test_api_key(settings):
    from fastapi.testclient import TestClient

    from resume_service.main import create_app

    settings.api_key = "s3cret"
    with TestClient(create_app(settings)) as c:
        assert c.get("/healthz").status_code == 200
        assert c.get("/resumes").status_code == 401
        assert c.get("/resumes", headers={"X-Resume-Key": "s3cret"}).status_code == 200
