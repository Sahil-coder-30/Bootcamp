"""HTTP API tests. The pipeline is faked, so no LLM keys are needed."""

import json
import time

import pytest
from fastapi.testclient import TestClient

from openradix_agents import io_utils
from openradix_agents.api import main
from openradix_agents.api.services import jobs as jobs_service
from openradix_agents.api.settings import Settings


@pytest.fixture
def client(monkeypatch):
    def fake_pipeline(company, providers, steps, on_step):
        for s in steps:
            on_step(s, "running", {})
            time.sleep(0.05)
            on_step(s, "ok", {"seconds": 0.05, "result": {"step": s}})
        return {"ok": True, "steps": {s: {"status": "ok"} for s in steps}}

    monkeypatch.setattr(jobs_service, "run_pipeline", fake_pipeline)
    with TestClient(main.create_app(Settings(api_key=None))) as c:
        yield c


def _wait(client, job_id, timeout=5):
    deadline = time.time() + timeout
    while time.time() < deadline:
        job = client.get(f"/jobs/{job_id}").json()
        if job["status"] not in ("queued", "running"):
            return job
        time.sleep(0.05)
    raise AssertionError("job did not finish")


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok" and "keys_present" in body and "jobs" in body


def test_run_job_lifecycle(client):
    r = client.post("/run", json={"company": "  Acme  Corp ", "steps": ["skills", "hiring"]})
    assert r.status_code == 202
    job = r.json()
    assert job["company"] == "Acme Corp" and set(job["steps"]) == {"skills", "hiring"}
    assert r.headers["location"] == f"/jobs/{job['id']}"
    done = _wait(client, job["id"])
    assert done["status"] == "succeeded"
    assert done["steps"]["hiring"]["result"] == {"step": "hiring"}
    assert client.get("/jobs", params={"company": "acme corp"}).json()["jobs"][0]["id"] == job["id"]


def test_same_company_conflict(client):
    first = client.post("/run", json={"company": "Acme"}).json()
    assert client.post("/run", json={"company": "acme"}).status_code == 409
    _wait(client, first["id"])


@pytest.mark.parametrize("body", [
    {"company": ""}, {"company": "Acme", "steps": ["nope"]},
    {"company": "Acme", "providers": ["nope"]}, {},
])
def test_run_validation_errors(client, body):
    assert client.post("/run", json=body).status_code == 422


def test_unknown_job(client):
    assert client.get("/jobs/missing").status_code == 404


def test_validate(client):
    assert client.post("/validate", json={"company": "Acme"}).status_code == 404
    (io_utils.out_dir("Acme") / "golden_record.json").write_text(json.dumps({"name": "Acme"}))
    r = client.post("/validate", json={"company": "Acme"})
    assert r.status_code == 200
    body = r.json()
    assert body["checks"] == body["passed"] + body["failed"] and body["failed"] > 0


def test_artifacts(client):
    d = io_utils.out_dir("Acme")
    (d / "golden_record.json").write_text('{"name": "Acme"}')
    (d / "secret.txt").write_text("x")
    names = [a["name"] for a in client.get("/companies/Acme/artifacts").json()["artifacts"]]
    assert names == ["golden_record.json"]
    assert client.get("/companies/Acme/golden-record").json() == {"name": "Acme"}
    assert client.get("/companies/Acme/artifacts/secret.txt").status_code == 404
    assert client.get("/companies/Acme/hiring").status_code == 404
    assert client.get("/companies/..%2F..%2Fetc/artifacts").status_code in (400, 404)


def test_api_key_enforced(monkeypatch):
    from openradix_agents.api import deps
    monkeypatch.setattr(deps, "get_settings", lambda: Settings(api_key="s3cret"))
    with TestClient(main.create_app(Settings(api_key="s3cret"))) as c:
        assert c.get("/health").status_code == 200
        assert c.get("/jobs").status_code == 401
        assert c.get("/jobs", headers={"X-Agent-Key": "s3cret"}).status_code == 200
