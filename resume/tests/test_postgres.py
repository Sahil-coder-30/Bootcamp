"""Runs the API against real Postgres with the SQL migration applied (a local Postgres
service; locally set TEST_DATABASE_URL). Skipped when no database is configured."""

from __future__ import annotations

import os
import uuid
from pathlib import Path

import pytest

from conftest import make_pdf

DB_URL = os.getenv("TEST_DATABASE_URL")
pytestmark = pytest.mark.skipif(not DB_URL, reason="TEST_DATABASE_URL not set")
MIGRATION = Path(__file__).parents[1] / "migrations" / "001_resumes.sql"


@pytest.fixture()
def pg_client(tmp_path):
    from fastapi.testclient import TestClient
    from sqlalchemy import text

    from resume_service.db import make_engine
    from resume_service.main import create_app
    from resume_service.settings import Settings

    engine = make_engine(DB_URL or "")
    with engine.begin() as conn:
        conn.execute(text("drop table if exists public.resumes"))
        conn.exec_driver_sql(MIGRATION.read_text())  # the migration must apply cleanly, twice
        conn.exec_driver_sql(MIGRATION.read_text())
    engine.dispose()
    settings = Settings(database_url=DB_URL, storage_dir=tmp_path / "files")  # type: ignore[call-arg]
    with TestClient(create_app(settings)) as c:
        yield c


def test_postgres_roundtrip(pg_client, texts):
    user = str(uuid.uuid4())
    data = make_pdf(texts["rohan_verma"])
    files = {"file": ("rohan.pdf", data, "application/pdf")}
    r = pg_client.post("/resumes", files=files, headers={"X-User-Id": user})
    assert r.status_code == 201
    rid = r.json()["resume_id"]
    again = pg_client.post("/resumes", files=files, headers={"X-User-Id": user})
    assert again.status_code == 200 and again.json()["cached"] is True
    anon = pg_client.post("/resumes", files=files)
    assert anon.status_code == 201 and anon.json()["resume_id"] != rid

    got = pg_client.get(f"/resumes/{rid}", headers={"X-User-Id": user}).json()
    assert got["extraction"]["category_levels"]["COD"] >= 6
    listed = pg_client.get("/resumes", params={"email": "rohan.verma@example.com"}).json()
    assert listed["total"] == 2
    draft = pg_client.get(f"/resumes/{rid}/profile-draft").json()
    assert draft["skill_levels"]["SYSD"]["source"] == "resume_inferred"
    assert pg_client.get("/readyz").status_code == 200
    assert pg_client.delete(f"/resumes/{rid}", headers={"X-User-Id": user}).status_code == 204
    assert pg_client.get("/resumes", params={"email": "rohan.verma@example.com"}).json()["total"] == 1
