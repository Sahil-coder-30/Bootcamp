"""Offline tests for the pipeline fixes (no LLM calls)."""

import json

import pytest

from openradix_agents import (
    consolidation_agent, hiring_agent, io_utils, parsing, pipeline, providers,
    research_agent, skill_matrix_agent, validation_agent,
)


# ----------------------------------------------------------------- parsing
def test_parse_keeps_tables_apart_and_picks_biggest():
    md = ("| A | B |\n|---|---|\n| x | y |\n\nnotes\n\n"
          "| ID | V |\n|---|---|\n| 1 | a |\n| 2 | b |\n")
    assert parsing.parse_markdown_table(md) == [{"ID": "1", "V": "a"}, {"ID": "2", "V": "b"}]


def test_parse_strips_think_block():
    md = "<think>| fake | table |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |</think>\n| A |\n|---|\n| ok |"
    assert parsing.parse_markdown_table(md) == [{"A": "ok"}]


def test_extract_json_after_think():
    assert parsing.extract_json('<think>{"no": 1}</think>\n{"yes": 2}') == {"yes": 2}


# --------------------------------------------------------------- providers
def test_text_flattens_gemini_content_parts():
    class Msg:
        content = [{"type": "text", "text": "| A |"}, {"type": "thinking", "x": 1}, "\n|---|"]
    assert providers._text(Msg()) == "| A |\n|---|"


def test_invoke_first_falls_back(monkeypatch):
    calls = []

    def fake(name, prompt):
        calls.append(name)
        if name == "openrouter":
            raise RuntimeError("401")
        return "hello"

    monkeypatch.setattr(providers, "invoke", fake)
    monkeypatch.setattr(providers.config, "PRIMARY_PROVIDER", "openrouter")
    assert providers.invoke_first("p", ("groq",)) == ("groq", "hello")
    assert calls[:2] == ["openrouter", "groq"]


def test_invoke_first_all_fail(monkeypatch):
    monkeypatch.setattr(providers, "invoke", lambda n, p: (_ for _ in ()).throw(RuntimeError("down")))
    with pytest.raises(RuntimeError, match="all providers failed"):
        providers.invoke_first("p", ("groq",))


def test_invoke_unknown_provider():
    with pytest.raises(ValueError):
        providers.invoke("nope", "p")


# ---------------------------------------------------------------- io_utils
@pytest.mark.parametrize("bad", ["", "  ", "..", "../", "/"])
def test_company_slug_rejects_unsafe(bad):
    with pytest.raises(ValueError):
        io_utils.company_dir(bad)


def test_company_dir_stays_inside_outputs(tmp_outputs):
    d = io_utils.company_dir("../../etc/passwd")
    assert d.parent == tmp_outputs.resolve()


# ----------------------------------------------------------- consolidation
def test_dataset_escapes_pipes_and_newlines():
    ds = consolidation_agent._build_dataset({"groq": [
        {"ID": "1", "Parameter": "name", "Research Output / Data": "A | B\nC"}]})
    row = ds.splitlines()[2]
    assert row.count("|") == 7 and "A / B C" in row


# ---------------------------------------------------------------- pipeline
def _fake_agents(monkeypatch, fail=()):
    def maybe(name, value):
        def fn(*a, **k):
            if name in fail:
                raise RuntimeError(f"{name} boom")
            return value
        return fn
    monkeypatch.setattr(research_agent, "run_research",
                        maybe("research", {"groq": [{"ID": "1"}]}))
    monkeypatch.setattr(consolidation_agent, "run_consolidation",
                        maybe("consolidation", {"name": "X"}))
    monkeypatch.setattr(skill_matrix_agent, "run", maybe("skills", {"coding": "5-AP"}))
    monkeypatch.setattr(hiring_agent, "run", maybe("hiring", {"job_role_details": [{}]}))
    monkeypatch.setattr(validation_agent, "run", maybe("test", {"checks": 3, "failures": []}))


def test_pipeline_all_ok(monkeypatch):
    _fake_agents(monkeypatch)
    seen = []
    out = pipeline.run_pipeline("Acme", ("groq",), on_step=lambda s, st, d: seen.append((s, st)))
    assert out["ok"] and list(out["steps"]) == list(pipeline.STEPS)
    assert ("hiring", "running") in seen and ("hiring", "ok") in seen


def test_pipeline_isolates_failures(monkeypatch):
    _fake_agents(monkeypatch, fail=("research",))
    out = pipeline.run_pipeline("Acme", ("groq",))
    st = {k: v["status"] for k, v in out["steps"].items()}
    assert st == {"research": "failed", "consolidation": "skipped", "skills": "ok",
                  "hiring": "ok", "test": "skipped"}
    assert not out["ok"]


def test_pipeline_rejects_empty_research(monkeypatch):
    _fake_agents(monkeypatch)
    monkeypatch.setattr(research_agent, "run_research", lambda *a, **k: {"groq": []})
    out = pipeline.run_pipeline("Acme", ("groq",), ("research",))
    assert out["steps"]["research"]["status"] == "failed"


def test_pipeline_unknown_step():
    with pytest.raises(pipeline.PipelineError):
        pipeline.run_pipeline("Acme", ("groq",), ("bogus",))


def test_consolidation_only_needs_saved_research(monkeypatch):
    out = pipeline.run_pipeline("Acme", ("groq",), ("consolidation",))
    assert out["steps"]["consolidation"]["status"] == "failed"
    assert "run the research step first" in out["steps"]["consolidation"]["error"]


# -------------------------------------------------------------- validation
def test_validation_runs_offline_on_saved_record():
    d = io_utils.out_dir("Acme")
    (d / "golden_record.json").write_text(json.dumps({"name": "Acme"}))
    report = validation_agent.run("Acme")
    assert report["checks"] > 1000 and report["failures"]
    assert (d / "data_quality_report.md").exists()


def test_validation_missing_record():
    assert validation_agent.run("Nobody")["missing_record"] is True
