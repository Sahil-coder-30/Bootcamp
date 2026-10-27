"""
cli.py
======
Command-line entry point for the Level 4 agents.

    python -m openradix_agents doctor
    python -m openradix_agents run --company "Blinkit"
    python -m openradix_agents run --company "Blinkit" --only research
    python -m openradix_agents run --company "Blinkit" --only test
    python -m openradix_agents run --company "Blinkit" --providers groq gemini

Run `doctor` first: it pings all three providers so a bad API key is caught in
seconds instead of mid-pipeline.

Pipeline: research -> consolidation -> skills -> hiring -> test
The final `test` step runs the Level-3 metadata-driven checks against the Golden
Record and writes a data-quality report. Everything is written to
outputs/<company>/ — no database (that's Level 5).
"""

import argparse

from . import (
    research_agent,
    consolidation_agent,
    skill_matrix_agent,
    hiring_agent,
    validation_agent,
)

STEPS = ["research", "consolidation", "skills", "hiring", "test"]


def _run(company: str, provider_names: tuple, only: str | None) -> None:
    per_provider = None
    if only in (None, "research"):
        per_provider = research_agent.run_research(company, provider_names)
    if only == "consolidation":
        # Reuse the saved research instead of paying for it again.
        per_provider = research_agent.load_research(company, provider_names)
        if not per_provider:
            raise SystemExit(
                f"No saved research in outputs/{company}/. Run this first:\n"
                f'  python -m openradix_agents run --company "{company}" --only research')
    if only in (None, "consolidation"):
        consolidation_agent.run_consolidation(company, per_provider or {})
    if only in (None, "skills"):
        skill_matrix_agent.run(company)
    if only in (None, "hiring"):
        hiring_agent.run(company)
    if only in (None, "test"):
        validation_agent.run(company)
    print(f"\nDone. Artifacts written to outputs/{company}/")


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        prog="openradix_agents",
        description="OpenRADIX Level 4 - LangChain agentic research (writes files only).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    run_p = sub.add_parser("run", help="Run the research agents for one company.")
    run_p.add_argument("--company", required=True, help='Target company, e.g. "Blinkit".')
    run_p.add_argument(
        "--providers", nargs="+", default=list(research_agent.DEFAULT_PROVIDERS),
        help="Providers for the research fan-out (default: all three).",
    )
    run_p.add_argument("--only", choices=STEPS, help="Run a single step instead of the full pipeline.")

    doctor_p = sub.add_parser(
        "doctor", help="Ping each provider to check its API key works (run this first)."
    )
    doctor_p.add_argument(
        "--providers", nargs="+", default=list(research_agent.DEFAULT_PROVIDERS),
        help="Providers to check (default: all three).",
    )

    args = parser.parse_args(argv)
    if args.command == "run":
        _run(args.company, tuple(args.providers), args.only)
    elif args.command == "doctor":
        from . import doctor
        raise SystemExit(doctor.run(tuple(args.providers)))
