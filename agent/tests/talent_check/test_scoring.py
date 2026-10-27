"""
test_scoring.py
===============
Unit tests for Role 4: Talent Check mathematical scoring engine (tc-1.0).
Verifies the worked example (Ananya x Google), edge cases, and ranking rules.
"""

import pytest
from talent_match.contract import (
    CandidateProfileSummary,
    CandidateSkillLevel,
    TalentCheckOptions,
    TalentCheckRequest,
)
from talent_match.talent_check.bar import bar_from_snapshot
from talent_match.talent_check.scoring import (
    raw_readiness,
    round_score,
    score_talent_check,
    verdict_for,
)


def test_worked_example_ananya_google():
    """
    Worked example from plan.md section 3.2:
    Ananya (assumed levels) x Google LLC (company_id 4)
    """
    ananya_levels = {
        "COD": CandidateSkillLevel(level=7, source="resume_inferred", confidence="high"),
        "DSA": CandidateSkillLevel(level=7, source="resume_inferred", confidence="high"),
        "APTI": CandidateSkillLevel(level=6, source="resume_inferred", confidence="high"),
        "COMM": CandidateSkillLevel(level=5, source="resume_inferred", confidence="medium"),
        "OOD": CandidateSkillLevel(level=6, source="resume_inferred", confidence="high"),
        "AI": CandidateSkillLevel(level=4, source="resume_inferred", confidence="low"),
        "SQL": CandidateSkillLevel(level=4, source="resume_inferred", confidence="medium"),
        "SYSD": CandidateSkillLevel(level=6, source="resume_inferred", confidence="high"),
        "CLOUD": CandidateSkillLevel(level=5, source="resume_inferred", confidence="medium"),
        "SWE": CandidateSkillLevel(level=6, source="resume_inferred", confidence="high"),
        "NETW": CandidateSkillLevel(level=6, source="resume_inferred", confidence="high"),
        "OS": CandidateSkillLevel(level=7, source="resume_inferred", confidence="high"),
    }

    profile = CandidateProfileSummary(
        id="6f1c-ananya",
        name="Ananya Rao",
        email="ananya@example.com",
        version=1,
        skill_levels=ananya_levels,
    )

    bar = bar_from_snapshot(4)
    req = TalentCheckRequest(
        profile=profile,
        bar=bar,
        options=TalentCheckOptions(include_range=True, include_plan=True),
    )

    result = score_talent_check(req)

    # 1. Score and Verdict
    assert result.readiness_score == 65
    assert result.verdict == "almost"

    # 2. Ladder stats
    assert result.levels_covered == 55
    assert result.levels_needed == 84
    assert result.categories_met == 1

    # 3. Blocking rows (shortfall >= 3)
    # APTI (6 vs 9 = 3), AI (4 vs 7 = 3), SQL (4 vs 8 = 4), CLOUD (5 vs 9 = 4), SWE (6 vs 9 = 3), NETW (6 vs 9 = 3)
    assert set(result.blocking_gaps) == {"APTI", "AI", "SQL", "CLOUD", "SWE", "NETW"}
    assert len(result.blocking_gaps) == 6

    # 4. Top 3 gaps: order by shortfall desc, required_level desc, skill_set_id asc
    # CLOUD (s=4, r=9, id=9), SQL (s=4, r=8, id=7), APTI (s=3, r=9, id=3)
    assert result.top_gaps[:3] == ["CLOUD", "SQL", "APTI"]

    # 5. Study Plan
    assert result.study_plan is not None
    assert result.study_plan.total_steps == 12
    # ~190 hours: 8 steps for blocking (AI +1 AP=8, SQL +2 AS=24, APTI +1 AS=12 +1 EV=20, CLOUD +2 AS=24, SWE +1 AS=12, NETW +1 AS=12)
    # plus 4 cheapest remaining steps to reach 80
    assert 180 <= result.study_plan.total_hours <= 210

    # 6. Confidence range
    assert result.readiness_range is not None
    assert result.readiness_range["low"] <= result.readiness_score <= result.readiness_range["high"]
    assert result.readiness_range["low"] == 60
    assert result.readiness_range["high"] == 71

    # 7. Explanation generated
    assert "Ananya" in result.explanation
    assert "65" in result.explanation
    assert "Google LLC" in result.explanation


def test_edge_cases():
    """Verify extreme boundaries."""
    # Blank candidate: all level 1
    blank = [1] * 12
    req_google = [8, 9, 9, 7, 8, 7, 8, 4, 9, 9, 9, 9]
    assert raw_readiness(blank, req_google) == 0.0
    assert round_score(raw_readiness(blank, req_google)) == 0

    # All requirements met: score is 100 and verdict ready
    perfect = req_google
    assert raw_readiness(perfect, req_google) == 100.0
    assert round_score(raw_readiness(perfect, req_google)) == 100
    assert verdict_for(100, [0] * 12) == "ready"

    # All required = 1: needed_sum == 0 -> score 100
    flat_req = [1] * 12
    assert raw_readiness(blank, flat_req) == 100.0

    # Cap invariance: raising candidate above bar gives same score
    overqualified = [r + 1 for r in req_google]
    assert raw_readiness(overqualified, req_google) == 100.0
