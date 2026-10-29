"""
research_agent.py — AGENT 1
===========================
Runs the 163-parameter research prompt across ALL THREE providers (the
multi-LLM consensus step). Saves each provider's raw text + parsed rows.
"""

import json

from . import config, io_utils, parsing, prompts, providers

# Default fan-out comes from .env (RESEARCH_PROVIDERS) so you can swap a dead
# provider without touching code — e.g. nvidia,groq,nvidia-alt.
DEFAULT_PROVIDERS = config.RESEARCH_PROVIDERS


def run_research(company: str, provider_names=DEFAULT_PROVIDERS) -> dict[str, list[dict]]:
    outdir = io_utils.out_dir(company)
    prompt = prompts.render("research", company=company)

    per_provider: dict[str, list[dict]] = {}
    for name in provider_names:
        print(f"[research] querying {name} ...")
        try:
            text = providers.invoke(name, prompt)
        except Exception as exc:  # one dead provider must NOT kill the whole run
            per_provider[name] = []
            print(f"[research] {name} FAILED ({type(exc).__name__}: {exc}) - skipping")
            continue
        rows = parsing.parse_markdown_table(text)
        io_utils.write_json(outdir / f"research_{name}.json", {"provider": name, "raw": text, "rows": rows})
        per_provider[name] = rows
        print(f"[research] {name}: parsed {len(rows)} rows")

    return per_provider


def load_research(company: str, provider_names=DEFAULT_PROVIDERS) -> dict[str, list[dict]]:
    """Reload rows saved by an earlier run_research() — no LLM calls.

    Lets `--only consolidation` reuse the research you already paid for.
    """
    outdir = io_utils.out_dir(company)
    per_provider: dict[str, list[dict]] = {}
    for name in provider_names:
        path = outdir / f"research_{name}.json"
        if not path.exists():
            print(f"[research] no saved research for {name} ({path.name}) - skipping")
            continue
        rows = json.loads(path.read_text(encoding="utf-8")).get("rows", [])
        per_provider[name] = rows
        print(f"[research] {name}: loaded {len(rows)} saved rows")
    return per_provider
