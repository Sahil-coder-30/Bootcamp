"""Each agent with the LLM faked: what it writes, and how it fails."""

import json

import pytest

from openradix_agents import (
    consolidation_agent,
    hiring_agent,
    io_utils,
    providers,
    research_agent,
    skill_matrix_agent,
)

TABLE = (
    "| ID | Category | A/C | Parameter | Research Output / Data |\n"
    "|---|---|---|---|---|\n"
    "| 1 | Basic | Atomic | Name | Acme |\n"
    "| 2 | Basic | Atomic | Short name | ACM |\n"
)


def test_research_saves_each_provider_and_skips_a_dead_one(monkeypatch):
    def fake(name, prompt):
        assert "Acme" in prompt
        if name == "groq":
            raise RuntimeError("401")
        return TABLE

    monkeypatch.setattr(providers, "invoke", fake)
    out = research_agent.run_research("Acme", ("nvidia", "groq"))
    assert {k: len(v) for k, v in out.items()} == {"nvidia": 2, "groq": 0}
    d = io_utils.company_dir("Acme")
    assert (d / "research_nvidia.json").exists() and not (d / "research_groq.json").exists()
    # and the saved rows can be reloaded without any LLM call
    assert research_agent.load_research("Acme", ("nvidia", "groq")) == {"nvidia": out["nvidia"]}


def test_consolidation_writes_golden_record(monkeypatch):
    monkeypatch.setattr(providers, "invoke_first", lambda prompt, names, tag: ("nvidia", TABLE))
    record = consolidation_agent.run_consolidation("Acme", {"nvidia": [{"ID": "1"}]})
    assert record == {"name": "Acme", "short_name": "ACM"}
    d = io_utils.company_dir("Acme")
    assert json.loads((d / "golden_record.json").read_text()) == record
    assert (d / "golden_record.csv").read_text().splitlines() == ["name,short_name", "Acme,ACM"]


def test_consolidation_fails_loudly_on_unparsable_reply(monkeypatch):
    monkeypatch.setattr(providers, "invoke_first", lambda *a, **k: ("nvidia", "sorry, no table"))
    with pytest.raises(ValueError, match="no parsable consolidation table"):
        consolidation_agent.run_consolidation("Acme", {"nvidia": [{"ID": "1"}]})
    assert (io_utils.company_dir("Acme") / "consolidation_raw.txt").read_text() == "sorry, no table"


def test_skill_matrix_saves_the_first_row(monkeypatch):
    md = "| companies | coding |\n|---|---|\n| Acme | 5-AP |\n"
    monkeypatch.setattr(providers, "invoke_first", lambda *a, **k: ("nvidia", md))
    assert skill_matrix_agent.run("Acme") == {"companies": "Acme", "coding": "5-AP"}
    assert (io_utils.company_dir("Acme") / "skill_matrix.csv").exists()


def test_skill_matrix_rejects_empty_reply(monkeypatch):
    monkeypatch.setattr(providers, "invoke_first", lambda *a, **k: ("nvidia", "no table"))
    with pytest.raises(ValueError, match="no parsable skill table"):
        skill_matrix_agent.run("Acme")


def test_hiring_parses_fenced_json(monkeypatch):
    reply = '```json\n{"company_name": "Acme", "job_role_details": []}\n```'
    monkeypatch.setattr(providers, "invoke_first", lambda *a, **k: ("nvidia", reply))
    assert hiring_agent.run("Acme") == {"company_name": "Acme", "job_role_details": []}


def test_hiring_keeps_raw_reply_when_json_is_broken(monkeypatch):
    monkeypatch.setattr(providers, "invoke_first", lambda *a, **k: ("nvidia", "{not json"))
    with pytest.raises(ValueError, match="hiring_raw.txt"):
        hiring_agent.run("Acme")
    assert (io_utils.company_dir("Acme") / "hiring_raw.txt").read_text() == "{not json"


def test_fallback_order_dedupes_and_drops_unknown(monkeypatch):
    monkeypatch.setattr(providers.config, "PRIMARY_PROVIDER", "groq")
    monkeypatch.setattr(providers.config, "RESEARCH_PROVIDERS", ("nvidia", "openrouter", "groq"))
    assert providers.fallback_order(("gemini", "groq")) == ["groq", "gemini", "nvidia"]


def test_invoke_first_skips_empty_replies(monkeypatch):
    monkeypatch.setattr(providers.config, "PRIMARY_PROVIDER", "nvidia")
    monkeypatch.setattr(providers, "invoke", lambda n, p: "" if n == "nvidia" else "ok")
    assert providers.invoke_first("p", ("groq",)) == ("groq", "ok")
