"""CLI entry points and the provider doctor, with LLM calls faked."""

import pytest

from openradix_agents import cli, doctor, pipeline, providers


# ------------------------------------------------------------------ doctor
def test_mask_hides_most_of_the_key():
    assert doctor._mask(None) == "(missing)"
    assert doctor._mask("short") == "*****"
    assert doctor._mask("nvapi-1234567890abcd") == "nvapi...abcd (len 20)"


def test_check_provider_unknown():
    r = doctor.check_provider("openrouter")
    assert r["status"] == "FAIL" and "unknown provider" in r["detail"]


def test_check_provider_missing_key(monkeypatch):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    assert doctor.check_provider("groq")["status"] == "MISS"


def test_check_provider_ok_and_fail(monkeypatch):
    monkeypatch.setenv("GROQ_API_KEY", "dummy")
    monkeypatch.setattr(providers, "invoke", lambda n, p: "  pong \n")
    ok = doctor.check_provider("groq")
    assert ok["status"] == "OK" and ok["detail"] == "pong"

    def boom(n, p):
        raise RuntimeError("Invalid API Key\nmore detail")

    monkeypatch.setattr(providers, "invoke", boom)
    bad = doctor.check_provider("groq")
    assert bad["status"] == "FAIL" and bad["detail"] == "RuntimeError: Invalid API Key"


def test_doctor_run_exit_code(monkeypatch, capsys):
    monkeypatch.setattr(
        doctor,
        "check_provider",
        lambda n: {
            "provider": n,
            "key_name": "K",
            "model": "m",
            "preview": "x",
            "status": "OK" if n == "groq" else "FAIL",
            "detail": "",
        },
    )
    assert doctor.run(("groq",)) == 0
    assert doctor.run(("groq", "gemini")) == 1
    assert "NOT working" in capsys.readouterr().out


# --------------------------------------------------------------------- cli
def test_cli_run_passes_args_and_returns_status(monkeypatch, capsys):
    seen = {}

    def fake(company, provider_names, steps):
        seen.update(company=company, providers=provider_names, steps=steps)
        return {"ok": False, "steps": {"test": {"status": "failed", "error": "no record"}}}

    monkeypatch.setattr(cli, "run_pipeline", fake)
    with pytest.raises(SystemExit) as exc:
        cli.main(["run", "--company", "Acme", "--only", "test", "--providers", "groq"])
    assert exc.value.code == 1
    assert seen == {"company": "Acme", "providers": ("groq",), "steps": ("test",)}
    assert "no record" in capsys.readouterr().out


def test_cli_run_ok(monkeypatch):
    monkeypatch.setattr(cli, "run_pipeline", lambda *a: {"ok": True, "steps": {}})
    with pytest.raises(SystemExit) as exc:
        cli.main(["run", "--company", "Acme"])
    assert exc.value.code == 0


def test_cli_run_pipeline_error_is_a_clean_exit(monkeypatch):
    def fail(*a):
        raise pipeline.PipelineError("company must not be empty")

    monkeypatch.setattr(cli, "run_pipeline", fail)
    with pytest.raises(SystemExit, match="company must not be empty"):
        cli.main(["run", "--company", " "])


def test_cli_rejects_unknown_step():
    with pytest.raises(SystemExit) as exc:
        cli.main(["run", "--company", "Acme", "--only", "bogus"])
    assert exc.value.code == 2


def test_cli_doctor(monkeypatch):
    monkeypatch.setattr(doctor, "run", lambda names: 0 if names == ("groq",) else 1)
    with pytest.raises(SystemExit) as exc:
        cli.main(["doctor", "--providers", "groq"])
    assert exc.value.code == 0


def test_cli_serve(monkeypatch):
    from openradix_agents.api import main as api_main

    seen = {}
    monkeypatch.setattr(api_main, "serve", lambda **kw: seen.update(kw))
    cli.main(["serve", "--port", "9001"])
    assert seen == {"host": None, "port": 9001, "reload": False}
