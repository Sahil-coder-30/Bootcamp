"""
scoring.py
==========
Pure mathematical scoring engine for Role 4: Talent Check (Aryan Singh).
Implements the versioned 'tc-1.0' algorithm with zero external I/O.
"""

from __future__ import annotations

import math
from typing import Literal, Sequence

from talent_match.contract import (
    CompanyBar,
    GapRow,
    TalentCheckRequest,
    TalentCheckResult,
)
from talent_match.talent_check.bar import bar_from_snapshot, bloom_for
from talent_match.talent_check.constants import (
    ALMOST_THRESHOLD,
    BLOCKING_SHORTFALL,
    CODE_TO_ID,
    CODES,
    READY_THRESHOLD,
    SCORING_VERSION,
)
from talent_match.talent_check.explain import explain
from talent_match.talent_check.plan import study_plan
from talent_match.talent_check.ranges import compute_bounds
from talent_match.talent_check.topics import next_topics_for


def raw_readiness(c: Sequence[int], r: Sequence[int]) -> float:
    """
    Compute floating-point readiness percentage:
    100 * sum(min(c, r) - 1) / sum(r - 1)
    """
    needed_sum = sum(max(0, req - 1) for req in r)
    if needed_sum == 0:
        return 100.0

    covered_sum = sum(min(cand, req) - 1 for cand, req in zip(c, r, strict=False))
    return 100.0 * covered_sum / needed_sum


def round_score(x: float) -> int:
    """
    Round half-up to integer [0, 100].
    Floor(x + 0.5) ensures 0.5 rounds to 1 (never banker's rounding).
    """
    val = math.floor(x + 0.5)
    return max(0, min(100, int(val)))


def verdict_for(score: int, shortfalls: Sequence[int]) -> Literal["ready", "almost", "not_yet"]:
    """
    Determine hiring readiness verdict:
    - 'ready': score >= 80 and no category with shortfall >= 3
    - 'almost': score >= 60 (including >= 80 held back by a blocking row)
    - 'not_yet': otherwise
    """
    has_blocking = any(s >= BLOCKING_SHORTFALL for s in shortfalls)
    if score >= READY_THRESHOLD and not has_blocking:
        return "ready"
    if score >= ALMOST_THRESHOLD:
        return "almost"
    return "not_yet"


def rank_gaps(rows: Sequence[GapRow]) -> list[str]:
    """
    Rank gaps:
    Sort by shortfall desc, required_level desc, then skill_set_id asc.
    """
    gaps = [r for r in rows if r.gap]
    sorted_gaps = sorted(
        gaps,
        key=lambda r: (
            -r.shortfall,
            -r.required_level,
            CODE_TO_ID.get(r.category_code, 99),
        ),
    )
    return [r.category_code for r in sorted_gaps]


def score_talent_check(req: TalentCheckRequest) -> TalentCheckResult:
    """
    Score a candidate profile against a company bar.
    Stateless, deterministic, pure computation.
    """
    # 1. Resolve Company Bar (passed in or loaded from snapshot)
    bar: CompanyBar
    if req.bar:
        bar = req.bar
    else:
        # Default to Google LLC (4) if not specified
        bar = bar_from_snapshot(4)

    # Index bar rows by category code
    bar_rows_by_code = {r.category_code: r for r in bar.rows}

    # Ensure all 12 canonical codes are present in bar
    req_levels: list[int] = []
    for code in CODES:
        if code in bar_rows_by_code:
            req_levels.append(bar_rows_by_code[code].required_level)
        else:
            req_levels.append(1)

    # 2. Extract Candidate Skill Levels
    cand_levels: list[int] = []
    for code in CODES:
        skill_val = req.profile.skill_levels.get(code)
        if skill_val is None:
            cand_levels.append(1)  # Default: level 1 ("no evidence")
        elif isinstance(skill_val, int):
            cand_levels.append(max(1, min(10, skill_val)))
        elif isinstance(skill_val, dict):
            cand_levels.append(max(1, min(10, skill_val.get("level", 1))))
        else:
            cand_levels.append(max(1, min(10, skill_val.level)))

    # 3. Calculate Core Metrics
    needed_sum = sum(max(0, r - 1) for r in req_levels)
    covered_sum = sum(min(c, r) - 1 for c, r in zip(cand_levels, req_levels, strict=False))
    shortfalls = [max(0, r - c) for c, r in zip(cand_levels, req_levels, strict=False)]

    readiness_flt = raw_readiness(cand_levels, req_levels)
    readiness_score = round_score(readiness_flt)
    verdict = verdict_for(readiness_score, shortfalls)

    # 4. Construct Gap Rows
    gap_rows: list[GapRow] = []
    blocking_gaps: list[str] = []
    met_count = 0

    for i, code in enumerate(CODES):
        c_lvl = cand_levels[i]
        r_lvl = req_levels[i]
        s_fall = shortfalls[i]
        is_gap = s_fall > 0
        is_blocking = s_fall >= BLOCKING_SHORTFALL

        if is_blocking:
            blocking_gaps.append(code)
        if c_lvl >= r_lvl:
            met_count += 1

        weight = (r_lvl - 1) / needed_sum if needed_sum > 0 else 0.0
        points_lost = round(100.0 * s_fall / needed_sum, 1) if needed_sum > 0 else 0.0

        bar_row = bar_rows_by_code.get(code)
        raw_bloom = bar_row.raw_bloom_code if bar_row else None

        # Next topics
        n_topics = next_topics_for(code, c_lvl, r_lvl, req.topics)

        gap_rows.append(
            GapRow(
                category_code=code,
                required_level=r_lvl,
                candidate_level=c_lvl,
                gap=is_gap,
                shortfall=s_fall,
                required_bloom=bloom_for(r_lvl),
                candidate_bloom=bloom_for(c_lvl),
                weight=round(weight, 4),
                next_topics=n_topics,
                blocking=is_blocking,
                points_lost=points_lost,
                raw_bloom_code=raw_bloom,
            )
        )

    # 5. Top Gaps Ranking
    top_gaps = rank_gaps(gap_rows)

    # 6. Confidence Range (if requested)
    readiness_range = None
    range_tuple = None
    if req.options.include_range:
        _, pess_levels, opt_levels = compute_bounds(req.profile.skill_levels, CODES)
        pess_score = round_score(raw_readiness(pess_levels, req_levels))
        opt_score = round_score(raw_readiness(opt_levels, req_levels))
        readiness_range = {"low": min(pess_score, readiness_score), "high": max(opt_score, readiness_score)}
        range_tuple = (readiness_range["low"], readiness_range["high"])

    # 7. Study Plan (if requested)
    sp = None
    sp_steps = 0
    if req.options.include_plan:
        sp = study_plan(gap_rows, req.topics)
        sp_steps = sp.total_steps

    # 8. Deterministic Explanation
    gap_dict = {code: (cand_levels[i], req_levels[i]) for i, code in enumerate(CODES)}
    explanation_text = explain(
        candidate_name=req.profile.name,
        company_name=bar.display_name or bar.company_name,
        readiness_score=readiness_score,
        verdict=verdict,
        levels_covered=covered_sum,
        levels_needed=needed_sum,
        top_gaps=top_gaps,
        gap_rows_dict=gap_dict,
        blocking_count=len(blocking_gaps),
        met_count=met_count,
        study_plan_steps=sp_steps,
        range_bounds=range_tuple,
    )

    return TalentCheckResult(
        company=bar.display_name or bar.company_name,
        company_id=bar.company_id,
        profile_id=req.profile.id,
        readiness_score=readiness_score,
        verdict=verdict,
        top_gaps=top_gaps,
        scoring_version=SCORING_VERSION,
        skillset_gap=gap_rows,
        explanation=explanation_text,
        readiness_range=readiness_range,
        blocking_gaps=blocking_gaps,
        levels_covered=covered_sum,
        levels_needed=needed_sum,
        categories_met=met_count,
        study_plan=sp,
        meta={
            "bar_source": bar.source,
            "cached": False,
            "scoring_version": SCORING_VERSION,
            "warnings": [],
        },
    )
