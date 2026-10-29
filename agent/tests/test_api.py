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


# --------------------------------------------------------- more API cases
def test_doctor_route(client, monkeypatch):
    from openradix_agents.api.services import providers as provider_service
    monkeypatch.setattr(provider_service, "check_all", lambda names: [
        {"provider": "groq", "key_name": "GROQ_API_KEY", "model": "m", "status": "OK", "detail": "pong"}])
    r = client.post("/doctor", json={"providers": ["groq"]})
    assert r.status_code == 200 and r.json()["ok"] is True
    assert client.post("/doctor", json={"providers": ["nope"]}).status_code == 422


def test_unsafe_company_name_is_a_400(client):
    r = client.post("/validate", json={"company": ".."})
    assert r.status_code == 400 and "invalid company name" in r.json()["detail"]


def test_research_files_are_served(client):
    d = io_utils.out_dir("Acme")
    (d / "research_groq.json").write_text("{}")
    names = [a["name"] for a in client.get("/companies/Acme/artifacts").json()["artifacts"]]
    assert names == ["research_groq.json"]
    assert client.get("/companies/Acme/artifacts/research_groq.json").status_code == 200


def test_skill_matrix_and_hiring_routes(client):
    d = io_utils.out_dir("Acme")
    (d / "skill_matrix.json").write_text('{"coding": "5-AP"}')
    (d / "hiring_rounds.json").write_text('{"job_role_details": []}')
    assert client.get("/companies/Acme/skill-matrix").json() == {"coding": "5-AP"}
    assert client.get("/companies/Acme/hiring").json() == {"job_role_details": []}
    assert client.get("/companies/Nobody/artifacts").json()["artifacts"] == []


def _manager_with(monkeypatch, summary_or_exc):
    def fake(company, providers, steps, on_step):
        if isinstance(summary_or_exc, Exception):
            raise summary_or_exc
        for s, info in summary_or_exc["steps"].items():
            on_step(s, info["status"], info)
        return summary_or_exc

    monkeypatch.setattr(jobs_service, "run_pipeline", fake)
    return jobs_service.JobManager(max_workers=1)


def _finish(manager, job_id):
    deadline = time.time() + 5
    while manager.get(job_id).status.value in ("queued", "running"):
        assert time.time() < deadline
        time.sleep(0.02)
    return manager.get(job_id)


def test_job_partial_when_a_step_fails(monkeypatch):
    m = _manager_with(monkeypatch, {"ok": False, "steps": {
        "skills": {"status": "ok"}, "hiring": {"status": "failed", "error": "bad json"}}})
    job = _finish(m, m.submit("Acme", ("groq",), ("skills", "hiring")).id)
    assert job.status.value == "partial"
    assert job.steps["hiring"].error == "bad json"


def test_job_failed_when_nothing_succeeds(monkeypatch):
    m = _manager_with(monkeypatch, {"ok": False, "steps": {"test": {"status": "failed"}}})
    assert _finish(m, m.submit("Acme", ("groq",), ("test",)).id).status.value == "failed"


def test_job_failed_when_pipeline_crashes(monkeypatch):
    m = _manager_with(monkeypatch, RuntimeError("disk full"))
    job = _finish(m, m.submit("Acme", ("groq",), None).id)
    assert job.status.value == "failed" and job.error == "RuntimeError: disk full"
    assert m.counts()["failed"] == 1


def test_finished_jobs_expire(monkeypatch):
    m = _manager_with(monkeypatch, {"ok": True, "steps": {}})
    m._ttl = 0
    job_id = m.submit("Acme", ("groq",), ()).id
    _finish(m, job_id)
    time.sleep(0.01)
    assert m.list() == []
