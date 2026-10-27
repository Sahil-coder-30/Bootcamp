"""
consolidation_agent.py — AGENT 2
================================
Takes the 3 providers' research rows (~489 rows), asks one LLM to consolidate
them into a single 163-row "Golden Record", and saves it keyed by column name
(golden_record.json) plus a wide CSV (golden_record.csv) — ready for Level 3.
"""

from . import prompts, providers, parsing, io_utils
from .columns import column_for_id

_HEADERS = "| ID | Category | A/C | Parameter | Research Output / Data | Source |"
_SEP = "|---|---|---|---|---|---|"


def _build_dataset(per_provider_rows: dict[str, list[dict]]) -> str:
    lines = [_HEADERS, _SEP]
    for source, rows in per_provider_rows.items():
        for r in rows:
            lines.append(
                f"| {r.get('ID', '')} | {r.get('Category', '')} | {r.get('A/C', '')} "
                f"| {r.get('Parameter', '')} | {r.get('Research Output / Data', '')} | {source} |"
            )
    return "\n".join(lines)


def _rows_to_record(rows: list[dict]) -> dict:
    record = {}
    for r in rows:
        col = column_for_id(r.get("ID"))
        if col:
            record[col] = (r.get("Research Output / Data", "") or "").strip()
    return record


def run_consolidation(company: str, per_provider_rows: dict[str, list[dict]],
                      provider: str = "openrouter") -> dict:
    outdir = io_utils.out_dir(company)
    dataset = _build_dataset(per_provider_rows)
    prompt = prompts.render("consolidation", dataset=dataset)

    print(f"[consolidate] querying {provider} ...")
    text = providers.invoke(provider, prompt)
    (outdir / "consolidation_raw.txt").write_text(text, encoding="utf-8")
    rows = parsing.parse_markdown_table(text)
    record = _rows_to_record(rows)

    io_utils.write_json(outdir / "golden_record.json", record)
    io_utils.write_record_csv(outdir / "golden_record.csv", record)
    print(f"[consolidate] golden record has {len(record)} fields")
    return record
