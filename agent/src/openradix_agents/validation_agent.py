"""
validation_agent.py — AGENT 5 (the testing agent)
=================================================
Puts the Level-3 testing framework *in play* inside Level 4.

It loads ``outputs/<company>/golden_record.json`` and runs the SAME
metadata-driven checks students built in Level 3 — the rich 163 x 30 metadata
sheet crossed with the master test cases across three scopes
(Per-Parameter, Specific-Parameters, Global) — then writes a human-readable
data-quality report next to the record.

IMPORTANT: this is a *report*, not a gate. Level 4 still writes files only and
never blocks. Turning these same checks into a blocking gate with automatic
retries is Level 5's job. Here we simply *see* how trustworthy the Golden Record
is before anyone leans on it.

Reuses the vendored ``rules.py`` + ``registry.py`` (copied verbatim from
Level 3) so the behaviour is identical to the suite students already know.
"""

import json

from . import io_utils, registry, rules


# --------------------------------------------------------------------------- #
# Build the 3-scope matrix (same logic as Level 3's conftest, as plain code)
# --------------------------------------------------------------------------- #
def _matrix():
    metas = registry.load_metadata()
    by_name = {m["column_name"]: m for m in metas}
    cases = registry.load_master_cases()
    items = []  # (meta_or_None, case)
    for case in cases:
        scope = case.get("applicable_to", "Per-Parameter")
        if scope == "Global":
            items.append((None, case))
        elif scope == "Specific-Parameters":
            for p in case.get("parameters", []):
                if p in by_name:
                    items.append((by_name[p], case))
        else:  # Per-Parameter
            for m in metas:
                if registry.matches(case.get("applies_when", "False"), m):
                    items.append((m, case))
    return items, metas


def check_record(record: dict) -> tuple[int, list[dict]]:
    """Run every applicable check. Returns (total_checks, failures)."""
    items, metas = _matrix()
    failures: list[dict] = []
    for meta, case in items:
        if case.get("applicable_to") == "Global":
            message = rules.GLOBAL_REGISTRY[case["rule_id"]](record, metas)
            target = "GLOBAL"
        else:
            col = meta["column_name"]
            message = rules.REGISTRY[case["rule_id"]](record.get(col, ""), meta)
            target = col
        if message:
            failures.append({
                "target": target,
                "scope": case.get("applicable_to", ""),
                "case_id": case["id"],
                "priority": case.get("priority", ""),
                "category": case.get("test_case_category", ""),
                "type": case.get("test_case_type", ""),
                "message": message,
            })
    return len(items), failures


# --------------------------------------------------------------------------- #
# Human-readable report (mirrors the Level 3 data-quality report)
# --------------------------------------------------------------------------- #
def _grouped(failures: list[dict], key: str) -> dict[str, int]:
    out: dict[str, int] = {}
    for f in failures:
        out[f.get(key) or "(none)"] = out.get(f.get(key) or "(none)", 0) + 1
    return out


def render_report(company: str, data_path, checks: int, failures: list[dict]) -> str:
    passed = checks - len(failures)
    lines = [
        "# OpenRADIX Level 4 — Data Quality Report",
        "",
        f"- Company: **{company}**",
        f"- Record: `{data_path}`",
        f"- Checks passed: **{passed}**",
        f"- Checks failed: **{len(failures)}**",
        "",
    ]
    if not failures:
        lines.append("All metadata-driven checks passed. The Golden Record looks clean.")
        return "\n".join(lines) + "\n"

    for title, key in (("priority", "priority"), ("scope", "scope"), ("category", "category")):
        lines.append(f"## Failures by {title}")
        for k, n in sorted(_grouped(failures, key).items()):
            lines.append(f"- {k}: {n}")
        lines.append("")

    lines.append("## Failure detail")
    lines.append("")
    lines.append("| Target | Scope | Case | Priority | Type | Why |")
    lines.append("|---|---|---|---|---|---|")
    for f in failures:
        why = str(f["message"]).replace("|", "\\|")
        lines.append(
            f"| {f['target']} | {f['scope']} | {f['case_id']} | {f['priority']} | {f['type']} | {why} |"
        )
    return "\n".join(lines) + "\n"


# --------------------------------------------------------------------------- #
# Entry point (called by the CLI like the other agents: run(company))
# --------------------------------------------------------------------------- #
def run(company: str) -> dict:
    outdir = io_utils.out_dir(company)
    record_path = outdir / "golden_record.json"
    if not record_path.exists():
        print(f"[test] no golden_record.json for {company!r} yet — run consolidation first.")
        return {"checks": 0, "failures": []}

    record = json.loads(record_path.read_text(encoding="utf-8"))
    checks, failures = check_record(record)

    report = render_report(company, record_path, checks, failures)
    io_utils.write_json(outdir / "data_quality_report.json",
                        {"company": company, "checks": checks, "failures": failures})
    (outdir / "data_quality_report.md").write_text(report, encoding="utf-8")

    print(f"[test] {checks - len(failures)}/{checks} checks passed; "
          f"{len(failures)} failed -> {outdir / 'data_quality_report.md'}")
    return {"checks": checks, "failures": failures}
