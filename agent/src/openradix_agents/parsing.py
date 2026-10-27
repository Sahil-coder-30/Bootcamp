"""
parsing.py
==========
Turns raw LLM text into structured data — this automates the manual "copy the
table into Excel and clean it up" step from Levels 1-2.

* ``parse_markdown_table(text)`` -> list[dict]  (handles ```|``` GitHub tables)
* ``extract_json(text)``         -> dict/list   (handles ```json fences and bare JSON)

Pure standard library — no LangChain, so it is fully unit-testable offline.
"""

import json
import re


def parse_markdown_table(text: str) -> list[dict]:
    """Parse the first GitHub-style markdown table found in ``text``."""
    rows = [ln for ln in text.splitlines() if ln.strip().startswith("|")]
    if len(rows) < 2:
        return []

    def cells(line: str) -> list[str]:
        # drop the leading/trailing pipe, split, strip
        return [c.strip() for c in line.strip().strip("|").split("|")]

    headers = cells(rows[0])

    def is_separator(line: str) -> bool:
        return set(line.replace("|", "").replace(":", "").replace("-", "").strip()) == set()

    out = []
    for line in rows[1:]:
        if is_separator(line):
            continue
        values = cells(line)
        if len(values) < len(headers):
            values += [""] * (len(headers) - len(values))
        out.append({h: values[i] for i, h in enumerate(headers)})
    return out


def extract_json(text: str):
    """Extract a JSON object/array from raw text, tolerating ```json fences."""
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, re.DOTALL)
    candidate = fence.group(1).strip() if fence else text.strip()
    # fall back to the first {...} or [...] span
    if not (candidate.startswith("{") or candidate.startswith("[")):
        m = re.search(r"(\{.*\}|\[.*\])", candidate, re.DOTALL)
        if m:
            candidate = m.group(1)
    return json.loads(candidate)
