"""
pipeline.py
===========
The research pipeline as one plain function, shared by the CLI and the HTTP API.

    research -> consolidation -> skills -> hiring -> test

Each step is isolated: if one fails, the error is recorded and the independent
steps still run (skills and hiring don't need research; test only needs a saved
golden record). Consolidation is skipped when there is no research to merge, so
we never pay an LLM to "consolidate" an empty table.
"""

import time
import traceback
from typing import Callable

from . import (
    config,
    consolidation_agent,
    hiring_agent,
    research_agent,
    skill_matrix_agent,
    validation_agent,
)

STEPS = ("research", "consolidation", "skills", "hiring", "test")

# on_step(step_name, status, detail) is called as each step starts / ends.
StepCallback = Callable[[str, str, dict], None]


class PipelineError(RuntimeError):
    """A step could not run because a precondition is missing."""


def _summary_research(per_provider: dict[str, list[dict]]) -> dict:
    return {"rows_per_provider": {k: len(v) for k, v in per_provider.items()}}


def run_pipeline(
    company: str,
    provider_names: tuple[str, ...] = config.RESEARCH_PROVIDERS,
    steps: tuple[str, ...] | None = None,
    on_step: StepCallback | None = None,
) -> dict:
    """Run the selected steps (default: all) and return a per-step summary.

    The summary looks like::

        {"company": "Blinkit", "ok": False, "steps": {
            "research": {"status": "ok", "seconds": 41.2, "result": {...}},
            "consolidation": {"status": "failed", "error": "..."}, ...}}
    """
    company = company.strip()
    if not company:
        raise PipelineError("company must not be empty")
    selected = tuple(s for s in STEPS if steps is None or s in steps)
    unknown = set(steps or ()) - set(STEPS)
    if unknown:
        raise PipelineError(f"unknown step(s): {sorted(unknown)} - valid: {list(STEPS)}")

    notify = on_step or (lambda *_: None)
    results: dict[str, dict] = {}
    state: dict = {"per_provider": None}

    def research():
        state["per_provider"] = research_agent.run_research(company, provider_names)
        if not any(state["per_provider"].values()):
            raise PipelineError("every research provider failed or returned no rows")
        return _summary_research(state["per_provider"])

    def consolidation():
        per_provider = state["per_provider"]
        if per_provider is None:
            # Reuse the research you already paid for.
            per_provider = research_agent.load_research(company, provider_names)
        per_provider = {k: v for k, v in per_provider.items() if v}
        if not per_provider:
            raise PipelineError(
                f"no research rows to consolidate for {company!r} - run the research step first"
            )
        record = consolidation_agent.run_consolidation(company, per_provider, provider_names)
        return {"fields": len(record)}

    def skills():
        row = skill_matrix_agent.run(company, provider_names)
        return {"columns": len(row)}

    def hiring():
        data = hiring_agent.run(company, provider_names)
        roles = data.get("job_role_details", []) if isinstance(data, dict) else []
        return {"roles": len(roles)}

    def test():
        report = validation_agent.run(company)
        if report.get("missing_record"):
            raise PipelineError(f"no golden_record.json for {company!r} - run consolidation first")
        return {"checks": report["checks"], "failed": len(report["failures"])}

    runners = {
        "research": research,
        "consolidation": consolidation,
        "skills": skills,
        "hiring": hiring,
        "test": test,
    }

    for step in selected:
        if step == "consolidation" and results.get("research", {}).get("status") == "failed":
            results[step] = {"status": "skipped", "error": "research failed"}
            notify(step, "skipped", results[step])
            continue
        if step == "test" and results.get("consolidation", {}).get("status") in ("failed", "skipped"):
            results[step] = {"status": "skipped", "error": "consolidation did not produce a record"}
            notify(step, "skipped", results[step])
            continue

        notify(step, "running", {})
        started = time.monotonic()
        try:
            result = runners[step]()
            results[step] = {
                "status": "ok",
                "seconds": round(time.monotonic() - started, 2),
                "result": result,
            }
        except Exception as exc:  # one failing step must not hide the others
            print(f"[{step}] FAILED: {type(exc).__name__}: {exc}")
            results[step] = {
                "status": "failed",
                "seconds": round(time.monotonic() - started, 2),
                "error": f"{type(exc).__name__}: {exc}",
            }
            if not isinstance(exc, PipelineError):
                results[step]["trace"] = traceback.format_exc(limit=5)
        notify(step, results[step]["status"], results[step])

    return {
        "company": company,
        "providers": list(provider_names),
        "ok": all(r["status"] == "ok" for r in results.values()),
        "steps": results,
    }
