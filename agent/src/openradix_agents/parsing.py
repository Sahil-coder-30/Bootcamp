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


_THINK = re.compile(r"<think>.*?</think>", re.DOTALL | re.IGNORECASE)


def _strip_reasoning(text: str) -> str:
    """Drop <think>...</think> blocks that some reasoning models emit."""
    return _THINK.sub("", text or "")


def _tables(text: str) -> list[list[str]]:
    """Group consecutive pipe-lines into separate tables."""
    tables, current = [], []
    for ln in _strip_reasoning(text).splitlines():
        if ln.strip().startswith("|"):
            current.append(ln)
        elif current:
            tables.append(current)
            current = []
    if current:
        tables.append(current)
    return tables


def parse_markdown_table(text: str) -> list[dict]:
    """Parse the biggest GitHub-style markdown table found in ``text``.

    Separate tables are kept apart (a second table's header must not become a
    data row of the first), and when the model adds a small extra table we keep
    the one with the most rows, which is the data table.
    """
    tables = [t for t in _tables(text) if len(t) >= 2]
    if not tables:
        return []
    rows = max(tables, key=len)

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
    text = _strip_reasoning(text)
    fence = re.search(r"```(?:json|JSON)?\s*(.*?)```", text, re.DOTALL)
    candidate = fence.group(1).strip() if fence else text.strip()
    # fall back to the first {...} or [...] span
    if not (candidate.startswith("{") or candidate.startswith("[")):
        m = re.search(r"(\{.*\}|\[.*\])", candidate, re.DOTALL)
        if m:
            candidate = m.group(1)
    return json.loads(candidate)
