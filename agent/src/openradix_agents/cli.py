"""
cli.py
======
Command-line entry point for the Level 4 agents.

    python -m openradix_agents doctor
    python -m openradix_agents run --company "Blinkit"
    python -m openradix_agents run --company "Blinkit" --only research
    python -m openradix_agents run --company "Blinkit" --only test
    python -m openradix_agents run --company "Blinkit" --providers groq gemini
    python -m openradix_agents serve            # FastAPI on :8000

Run `doctor` first: it pings all three providers so a bad API key is caught in
seconds instead of mid-pipeline.

Pipeline: research -> consolidation -> skills -> hiring -> test
The final `test` step runs the Level-3 metadata-driven checks against the Golden
Record and writes a data-quality report. Everything is written to
outputs/<company>/ — no database (that's Level 5).
"""

import argparse
import json

from . import config
from .pipeline import STEPS, PipelineError, run_pipeline


def _run(company: str, provider_names: tuple, only: str | None) -> int:
    try:
        summary = run_pipeline(company, provider_names, (only,) if only else None)
    except PipelineError as exc:
        raise SystemExit(str(exc)) from None
    print("\nStep summary:")
    for step, info in summary["steps"].items():
        extra = info.get("result") or info.get("error", "")
        print(f"  {step:<14} {info['status']:<8} {json.dumps(extra) if isinstance(extra, dict) else extra}")
    print(f"\nArtifacts written to outputs/{company}/")
    return 0 if summary["ok"] else 1


def main(argv=None) -> None:
    parser = argparse.ArgumentParser(
        prog="openradix_agents",
        description="OpenRADIX Level 4 - LangChain agentic research (writes files only).",
    )
    sub = parser.add_subparsers(dest="command", required=True)

    serve_p = sub.add_parser("serve", help="Start the FastAPI server.")
    serve_p.add_argument("--host", default=None)
    serve_p.add_argument("--port", type=int, default=None)
    serve_p.add_argument("--reload", action="store_true")

    run_p = sub.add_parser("run", help="Run the research agents for one company.")
    run_p.add_argument("--company", required=True, help='Target company, e.g. "Blinkit".')
    run_p.add_argument(
        "--providers",
        nargs="+",
        default=list(config.RESEARCH_PROVIDERS),
        help="Providers for the research fan-out (default: all three).",
    )
    run_p.add_argument("--only", choices=STEPS, help="Run a single step instead of the full pipeline.")

    doctor_p = sub.add_parser(
        "doctor", help="Ping each provider to check its API key works (run this first)."
    )
    doctor_p.add_argument(
        "--providers",
        nargs="+",
        default=list(config.RESEARCH_PROVIDERS),
        help="Providers to check (default: all three).",
    )

    args = parser.parse_args(argv)
    if args.command == "run":
        raise SystemExit(_run(args.company, tuple(args.providers), args.only))
    elif args.command == "doctor":
        from . import doctor

        raise SystemExit(doctor.run(tuple(args.providers)))
    elif args.command == "serve":
        from .api.main import serve

        serve(host=args.host, port=args.port, reload=args.reload)
