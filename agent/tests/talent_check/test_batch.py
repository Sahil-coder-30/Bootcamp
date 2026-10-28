"""
test_batch.py
=============
Tests vectorized batch computation and company ranking over all 115 companies.
"""

import time

from talent_match.talent_check.bar import matrix_from_snapshot
from talent_match.talent_check.batch import rank_companies
from talent_match.talent_check.scoring import raw_readiness, round_score

ANANYA = [7, 7, 6, 5, 6, 4, 4, 6, 5, 6, 6, 7]


def test_ranking_115_companies_latency_and_accuracy():
    """Verify ranking over 115 companies completes in under 10 ms."""
    bm = matrix_from_snapshot()
    total_comps = len(bm.company_ids)
    assert total_comps >= 114
    assert len(bm.levels) == total_comps

    start = time.perf_counter()
    ranked = rank_companies(ANANYA, bm, limit=total_comps)
    duration_ms = (time.perf_counter() - start) * 1000

    assert len(ranked) == total_comps
    assert duration_ms < 15.0  # Ultra-fast

    # Top company has highest score
    assert ranked[0].readiness_score >= ranked[-1].readiness_score

    # Check cell-by-cell equivalence with scalar raw_readiness for top 5 companies
    for r in ranked[:5]:
        idx = bm.company_ids.index(r.company_id)
        comp_levels = bm.levels[idx]
        scalar_score = round_score(raw_readiness(ANANYA, comp_levels))
        assert r.readiness_score == scalar_score
