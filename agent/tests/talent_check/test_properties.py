"""
test_properties.py
==================
Hypothesis property-based tests for Role 4: Talent Check (tc-1.0).
Proves the mathematical invariants guaranteed in plan.md section 3.4.
"""

from hypothesis import given, strategies as st
import pytest

from talent_match.talent_check.scoring import (
    raw_readiness,
    round_score,
    verdict_for,
)
from talent_match.talent_check.constants import READY_THRESHOLD, ALMOST_THRESHOLD

# Generate 12 skill levels between 1 and 10
levels_strategy = st.lists(st.integers(min_value=1, max_value=10), min_size=12, max_size=12)


@given(cand=levels_strategy, req=levels_strategy)
def test_property_boundedness(cand, req):
    """Property 1: 0 <= score <= 100 always."""
    raw = raw_readiness(cand, req)
    score = round_score(raw)
    assert 0 <= score <= 100
    assert 0.0 <= raw <= 100.0


@given(cand=levels_strategy, req=levels_strategy, index=st.integers(0, 11), boost=st.integers(1, 9))
def test_property_monotonicity(cand, req, index, boost):
    """Property 2: Raising candidate level never lowers score and never worsens verdict."""
    raw1 = raw_readiness(cand, req)
    score1 = round_score(raw1)
    shortfalls1 = [max(0, r - c) for c, r in zip(cand, req)]
    verdict1 = verdict_for(score1, shortfalls1)

    cand_boosted = list(cand)
    cand_boosted[index] = min(10, cand_boosted[index] + boost)

    raw2 = raw_readiness(cand_boosted, req)
    score2 = round_score(raw2)
    shortfalls2 = [max(0, r - c) for c, r in zip(cand_boosted, req)]
    verdict2 = verdict_for(score2, shortfalls2)

    assert score2 >= score1
    assert raw2 >= raw1

    # Verdict ranking: not_yet (0) <= almost (1) <= ready (2)
    v_rank = {"not_yet": 0, "almost": 1, "ready": 2}
    assert v_rank[verdict2] >= v_rank[verdict1]


@given(cand=levels_strategy, req=levels_strategy)
def test_property_cap_invariance(cand, req):
    """Property 3: Capped at the bar (overqualification does not grant excess credit)."""
    capped_cand = [min(c, r) for c, r in zip(cand, req)]
    raw_orig = raw_readiness(cand, req)
    raw_capped = raw_readiness(capped_cand, req)
    assert pytest.approx(raw_orig, rel=1e-7) == raw_capped


@given(req=levels_strategy)
def test_property_extremes(req):
    """Property 4: Extreme conditions."""
    needed = sum(max(0, r - 1) for r in req)
    blank = [1] * 12
    perfect = list(req)

    if needed > 0:
        assert raw_readiness(blank, req) == 0.0
        assert round_score(raw_readiness(blank, req)) == 0
    else:
        assert raw_readiness(blank, req) == 100.0

    assert raw_readiness(perfect, req) == 100.0
    assert round_score(raw_readiness(perfect, req)) == 100
    assert verdict_for(100, [0] * 12) == "ready"


@given(req=levels_strategy, index=st.integers(0, 11))
def test_property_linear_marginal_value(req, index):
    """Property 5: Each level step below the bar carries exactly 100 / sum(needed) points."""
    needed = sum(max(0, r - 1) for r in req)
    if req[index] > 2 and needed > 0:
        c1 = [1] * 12
        c2 = list(c1)
        c2[index] = 2  # Climbed 1 rung

        raw1 = raw_readiness(c1, req)
        raw2 = raw_readiness(c2, req)
        expected_diff = 100.0 / needed
        assert pytest.approx(raw2 - raw1, rel=1e-6) == expected_diff
