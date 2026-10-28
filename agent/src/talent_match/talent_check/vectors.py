"""
vectors.py
==========
Generates shared test vectors into docs/contract/fixtures/talent_check_vectors.json.
Consumed by both Python pytest and Frontend TypeScript vitest to ensure 100% parity.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from talent_match.talent_check.constants import SCORING_VERSION
from talent_match.talent_check.scoring import (
    raw_readiness,
    round_score,
    verdict_for,
)

FIXTURES_PATH = (
    Path(__file__).resolve().parents[4] / "docs" / "contract" / "fixtures" / "talent_check_vectors.json"
)


def generate_test_vectors() -> list[dict[str, Any]]:
    """Generate 200 diverse test vectors covering edge cases, real companies, and random sweeps."""
    vectors: list[dict[str, Any]] = []

    # 1. Pinned worked examples
    # Google LLC bar
    google_bar = [8, 9, 9, 7, 8, 7, 8, 4, 9, 9, 9, 9]
    # Ananya Rao levels
    ananya_levels = [7, 7, 6, 5, 6, 4, 4, 6, 5, 6, 6, 7]
    # Karthik levels
    karthik_levels = [5, 4, 7, 6, 3, 6, 7, 3, 3, 4, 2, 2]
    # Priya levels
    priya_levels = [4, 3, 5, 6, 3, 2, 5, 2, 3, 4, 4, 4]
    # Rohan levels
    rohan_levels = [8, 8, 7, 7, 7, 6, 6, 7, 6, 7, 6, 6]

    # Microsoft bar
    msft_bar = [8, 9, 8, 8, 8, 8, 7, 7, 8, 9, 7, 8]
    # Oracle FSS bar
    ofss_bar = [6, 6, 6, 6, 6, 5, 7, 5, 5, 6, 5, 5]

    named_cases = [
        ("ananya_google", ananya_levels, google_bar),
        ("ananya_msft", ananya_levels, msft_bar),
        ("ananya_ofss", ananya_levels, ofss_bar),
        ("karthik_google", karthik_levels, google_bar),
        ("karthik_msft", karthik_levels, msft_bar),
        ("karthik_ofss", karthik_levels, ofss_bar),
        ("priya_google", priya_levels, google_bar),
        ("priya_msft", priya_levels, msft_bar),
        ("priya_ofss", priya_levels, ofss_bar),
        ("rohan_google", rohan_levels, google_bar),
        ("rohan_msft", rohan_levels, msft_bar),
        ("rohan_ofss", rohan_levels, ofss_bar),
    ]

    for name, c, r in named_cases:
        raw = raw_readiness(c, r)
        sc = round_score(raw)
        shortfalls = [max(0, req - cand) for cand, req in zip(c, r, strict=False)]
        vrd = verdict_for(sc, shortfalls)
        blocking = [s >= 3 for s in shortfalls]
        vectors.append({
            "name": name,
            "candidate": c,
            "required": r,
            "raw": round(raw, 4),
            "score": sc,
            "verdict": vrd,
            "blocking": blocking,
        })

    # 2. Boundary conditions
    boundary_cases = [
        ("all_ones_blank", [1] * 12, google_bar),
        ("exact_match_google", google_bar, google_bar),
        ("exact_match_msft", msft_bar, msft_bar),
        ("all_tens_max", [10] * 12, [10] * 12),
        ("floor_bar", [1] * 12, [1] * 12),
        ("overqualified_10s", [10] * 12, google_bar),
    ]

    for name, c, r in boundary_cases:
        raw = raw_readiness(c, r)
        sc = round_score(raw)
        shortfalls = [max(0, req - cand) for cand, req in zip(c, r, strict=False)]
        vrd = verdict_for(sc, shortfalls)
        blocking = [s >= 3 for s in shortfalls]
        vectors.append({
            "name": name,
            "candidate": c,
            "required": r,
            "raw": round(raw, 4),
            "score": sc,
            "verdict": vrd,
            "blocking": blocking,
        })

    # 3. Systematic sweep cases (182 variations)
    for i in range(182):
        c = [((i + j * 3) % 10) + 1 for j in range(12)]
        r = [((i * 2 + j * 2) % 10) + 1 for j in range(12)]
        raw = raw_readiness(c, r)
        sc = round_score(raw)
        shortfalls = [max(0, req - cand) for cand, req in zip(c, r, strict=False)]
        vrd = verdict_for(sc, shortfalls)
        blocking = [s >= 3 for s in shortfalls]
        vectors.append({
            "name": f"sweep_{i:03d}",
            "candidate": c,
            "required": r,
            "raw": round(raw, 4),
            "score": sc,
            "verdict": vrd,
            "blocking": blocking,
        })

    return vectors


def main() -> None:
    FIXTURES_PATH.parent.mkdir(parents=True, exist_ok=True)
    vectors = generate_test_vectors()
    payload = {
        "scoring_version": SCORING_VERSION,
        "count": len(vectors),
        "vectors": vectors,
    }
    with FIXTURES_PATH.open("w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)
    print(f"Wrote {len(vectors)} test vectors -> {FIXTURES_PATH}")


if __name__ == "__main__":
    main()
