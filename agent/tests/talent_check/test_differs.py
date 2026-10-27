"""
test_differs.py
===============
Level-3 style differentiation tests for Role 4: Talent Check.
Proves 'visibly different results' across candidates and verifies brief consistency.
"""

import pytest
from talent_match.talent_check.scoring import raw_readiness, round_score, verdict_for

CANDIDATES = {
    "Ananya": [7, 7, 6, 5, 6, 4, 4, 6, 5, 6, 6, 7],
    "Karthik": [5, 4, 7, 6, 3, 6, 7, 3, 3, 4, 2, 2],
    "Priya": [4, 3, 5, 6, 3, 2, 5, 2, 3, 4, 4, 4],
    "Rohan": [8, 8, 7, 7, 7, 6, 6, 7, 6, 7, 6, 6],
}

COMPANIES = {
    "Google": [8, 9, 9, 7, 8, 7, 8, 4, 9, 9, 9, 9],
    "Microsoft": [8, 9, 8, 8, 8, 8, 7, 7, 8, 9, 7, 8],
    "Oracle_FSS": [6, 6, 6, 6, 6, 5, 7, 5, 5, 6, 5, 5],
}


@pytest.mark.parametrize("comp_name, bar", COMPANIES.items())
def test_visibly_different_scores_per_company(comp_name, bar):
    """Scores for the 4 candidates must be distinct with >= 20 spread."""
    scores = {}
    for cand_name, levels in CANDIDATES.items():
        sc = round_score(raw_readiness(levels, bar))
        scores[cand_name] = sc

    score_vals = list(scores.values())
    # Pairwise distinct
    assert len(set(score_vals)) == 4, f"{comp_name} scores are not distinct: {scores}"
    # Spread >= 20
    assert max(score_vals) - min(score_vals) >= 20, f"{comp_name} spread is < 20: {scores}"


def test_brief_consistency():
    """Verify consistency with the hackathon brief fits."""
    matrix = {}
    verdicts = {}
    for c_name, c_lvls in CANDIDATES.items():
        matrix[c_name] = {}
        verdicts[c_name] = {}
        for comp_name, bar in COMPANIES.items():
            sc = round_score(raw_readiness(c_lvls, bar))
            shortfalls = [max(0, r - c) for c, r in zip(c_lvls, bar)]
            vrd = verdict_for(sc, shortfalls)
            matrix[c_name][comp_name] = sc
            verdicts[c_name][comp_name] = vrd

    # 1. Rohan leads at each company
    for comp in COMPANIES:
        top_cand = max(matrix.keys(), key=lambda c: matrix[c][comp])
        assert top_cand == "Rohan", f"Rohan did not lead at {comp}"

    # 2. Each candidate scores higher at Oracle FSS than Google
    for cand in CANDIDATES:
        assert matrix[cand]["Oracle_FSS"] >= matrix[cand]["Google"]

    # 3. Priya's best fit is Oracle FSS
    best_for_priya = max(matrix["Priya"].keys(), key=lambda comp: matrix["Priya"][comp])
    assert best_for_priya == "Oracle_FSS"

    # 4. At least 2 distinct verdicts across the 12 cells
    all_verdicts = set()
    for cand in verdicts:
        for comp in verdicts[cand]:
            all_verdicts.add(verdicts[cand][comp])
    assert len(all_verdicts) >= 2, f"Expected at least 2 distinct verdicts, got {all_verdicts}"
