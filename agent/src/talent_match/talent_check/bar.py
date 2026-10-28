"""
bar.py
======
Company bar data loading, raw string parsing, and offline snapshot management.
Supports live Supabase fallbacks and ensures deterministic execution.
"""

from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from talent_match.contract import (
    BarMatrix,
    CompanyBar,
    CompanyBarRow,
)
from talent_match.talent_check.constants import (
    BLOOM_BANDS,
    CODE_NAMES,
    CODES,
    RAW_BLOOM_REGEX,
)

DEFAULT_SNAPSHOT_PATH = (
    Path(__file__).resolve().parents[3] / "data" / "snapshots" / "talent_check_company_skillsets.json"
)


def bloom_for(level: int) -> str:
    """Derive standard Bloom band from numeric level 1..10."""
    clamped = max(1, min(10, int(level)))
    return BLOOM_BANDS[clamped]


def parse_raw(s: str) -> tuple[int, str]:
    """Parse staging raw string into (level, raw_bloom_code), e.g. '8-CR' -> (8, 'CR')."""
    match = re.match(RAW_BLOOM_REGEX, s.strip().upper())
    if not match:
        raise ValueError(f"Invalid raw Bloom format: '{s}'. Expected pattern like '8-CR'.")
    level = int(match.group(1))
    raw_code = match.group(2)
    return level, raw_code


def load_snapshot(path: Path | str | None = None) -> dict[str, Any]:
    """Load JSON snapshot from disk."""
    p = Path(path) if path else DEFAULT_SNAPSHOT_PATH
    if not p.exists():
        raise FileNotFoundError(f"Company skillsets snapshot not found at {p}")
    with p.open("r", encoding="utf-8") as f:
        return json.load(f)


def bar_from_snapshot(company_id: int, snapshot: dict[str, Any] | None = None) -> CompanyBar:
    """Retrieve detailed CompanyBar from the snapshot by company_id."""
    data = snapshot or load_snapshot()
    for comp in data.get("companies", []):
        if comp.get("company_id") == company_id:
            rows = [
                CompanyBarRow(
                    skill_set_id=s["skill_set_id"],
                    category_code=s["category_code"],
                    skill_set_name=s.get(
                        "skill_set_name",
                        CODE_NAMES.get(s["category_code"], s["category_code"]),
                    ),
                    required_level=s["required_level"],
                    bloom_code=s.get("bloom_code", bloom_for(s["required_level"])),
                    raw_bloom_code=s.get("raw_bloom_code"),
                    bloom_mismatch=s.get("bloom_mismatch", False),
                )
                for s in comp.get("skills", [])
            ]
            return CompanyBar(
                company_id=comp["company_id"],
                company_name=comp["company_name"],
                display_name=comp.get("display_name"),
                source="snapshot",
                rows=rows,
            )

    # Check if company exists in bar_matrix as fallback
    matrix = data.get("bar_matrix", {})
    comp_ids = matrix.get("company_ids", [])
    if company_id in comp_ids:
        idx = comp_ids.index(company_id)
        name = matrix.get("company_names", [])[idx]
        levels = matrix.get("levels", [])[idx]
        rows = [
            CompanyBarRow(
                skill_set_id=i + 1,
                category_code=code,
                skill_set_name=CODE_NAMES.get(code, code),
                required_level=lvl,
                bloom_code=bloom_for(lvl),
                raw_bloom_code=bloom_for(lvl),
                bloom_mismatch=False,
            )
            for i, (code, lvl) in enumerate(zip(CODES, levels, strict=False))
        ]
        return CompanyBar(
            company_id=company_id,
            company_name=name,
            display_name=name,
            source="snapshot",
            rows=rows,
        )

    raise KeyError(f"Company with ID {company_id} not found in snapshot.")


def matrix_from_snapshot(snapshot: dict[str, Any] | None = None) -> BarMatrix:
    """Extract all 115 companies matrix from snapshot."""
    data = snapshot or load_snapshot()
    bm = data.get("bar_matrix", {})
    return BarMatrix(
        company_ids=bm.get("company_ids", []),
        company_names=bm.get("company_names", []),
        levels=bm.get("levels", []),
    )


def topics_from_snapshot(snapshot: dict[str, Any] | None = None) -> dict[str, dict[str, str]]:
    """Extract topic ladders dictionary from snapshot."""
    data = snapshot or load_snapshot()
    return data.get("topics", {})
