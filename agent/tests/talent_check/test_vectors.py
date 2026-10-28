"""
test_vectors.py
===============
Validates all 200 cross-language test vectors in docs/contract/fixtures/talent_check_vectors.json.
Guarantees byte-for-byte behavioral agreement between Python and the TypeScript mirror.
"""

import json
from pathlib import Path

import pytest

from talent_match.talent_check.scoring import (
    raw_readiness,
    round_score,
    verdict_for,
)

FIXTURES_PATH = (
    Path(__file__).resolve().parents[3] / "docs" / "contract" / "fixtures" / "talent_check_vectors.json"
)


def load_vectors():
    with FIXTURES_PATH.open("r", encoding="utf-8") as f:
        data = json.load(f)
    return data["vectors"]


@pytest.mark.parametrize("vec", load_vectors(), ids=lambda v: v["name"])
def test_cross_language_vector(vec):
    c = vec["candidate"]
    r = vec["required"]

    raw = raw_readiness(c, r)
    score = round_score(raw)
    shortfalls = [max(0, req - cand) for cand, req in zip(c, r, strict=False)]
    verdict = verdict_for(score, shortfalls)
    blocking = [s >= 3 for s in shortfalls]

    assert pytest.approx(raw, rel=1e-4) == vec["raw"]
    assert score == vec["score"]
    assert verdict == vec["verdict"]
    assert blocking == vec["blocking"]
