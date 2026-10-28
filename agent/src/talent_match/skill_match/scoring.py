"""
scoring.py
==========
Deterministic pure scoring function for sm-1.0 and counterfactual impact calculation.
"""

from __future__ import annotations

import math
from pydantic import BaseModel, Field

from talent_match.contract import ScoreBreakdown
from talent_match.skill_match.cascade import Decision
from talent_match.skill_match.params import WEIGHTS
from talent_match.skill_match.terms import JdTerm


class ScoreParts(BaseModel):
    match_score: int
    match_band: str
    must_coverage: float
    nice_coverage: float
    level_fit: float
    raw_score: float
    cap: int
    cap_reason: str | None
    weights: dict[str, float]
    category_coverage: dict[str, float]


def score(
    decisions: list[Decision],
    jd_terms: list[JdTerm],
    required_levels: dict[str, int],
    candidate_levels: dict[str, int],
) -> ScoreParts:
    """
    Computes sm-1.0 pure scoring:
      must_coverage = Σ_must w_j c_j / Σ_must w_j
      nice_coverage = Σ_nice w_j c_j / Σ_nice w_j
      level_fit = Σ_k min(cand_k, req_k) / Σ_k req_k
      raw = 100 * (0.60 must_coverage + 0.20 nice_coverage + 0.20 level_fit)
      cap = 100 - 10 * n_missing_must (where c_j < 0.30)
      if must_coverage < 0.50: cap = min(cap, 49)
    """
    decision_map = {d.jd_id: d for d in decisions}

    # Handle alternative groups: each alt group counts once with max weight and best credit
    alt_groups_must: dict[str, tuple[float, float]] = {}  # group -> (max_w, max_cw)
    alt_groups_nice: dict[str, tuple[float, float]] = {}

    sum_must_w = 0.0
    sum_must_cw = 0.0

    sum_nice_w = 0.0
    sum_nice_cw = 0.0

    n_missing_must = 0
    missing_must_names: list[str] = []

    # Category coverage tracking
    cat_weights: dict[str, float] = {}
    cat_credits: dict[str, float] = {}

    for jt in jd_terms:
        d = decision_map.get(jt.id)
        credit = d.credit if d else 0.0
        w = jt.weight
        cw = w * credit

        cat = jt.category_code
        cat_weights[cat] = cat_weights.get(cat, 0.0) + w
        cat_credits[cat] = cat_credits.get(cat, 0.0) + cw

        if jt.alt_group:
            target_dict = alt_groups_must if jt.requirement == "must" else alt_groups_nice
            if jt.alt_group not in target_dict:
                target_dict[jt.alt_group] = (w, cw)
            else:
                prev_w, prev_cw = target_dict[jt.alt_group]
                target_dict[jt.alt_group] = (max(prev_w, w), max(prev_cw, cw))
        else:
            if jt.requirement == "must":
                sum_must_w += w
                sum_must_cw += cw
                if credit < 0.30:
                    n_missing_must += 1
                    missing_must_names.append(jt.raw_name)
            else:
                sum_nice_w += w
                sum_nice_cw += cw

    # Add alternative groups into totals
    for grp, (gw, gcw) in alt_groups_must.items():
        sum_must_w += gw
        sum_must_cw += gcw
        eff_credit = gcw / gw if gw > 0 else 0.0
        if eff_credit < 0.30:
            n_missing_must += 1
            missing_must_names.append(f"Any of {grp}")

    for grp, (gw, gcw) in alt_groups_nice.items():
        sum_nice_w += gw
        sum_nice_cw += gcw

    must_coverage = (sum_must_cw / sum_must_w) if sum_must_w > 0 else 1.0

    w_must = WEIGHTS["must"]
    w_nice = WEIGHTS["nice"]
    w_level = WEIGHTS["level"]

    if sum_nice_w > 0:
        nice_coverage = sum_nice_cw / sum_nice_w
    else:
        # If JD has no nice-to-haves, its weight moves to must
        nice_coverage = 1.0
        w_must += w_nice
        w_nice = 0.0

    # Level fit calculation
    req_level_sum = 0
    cand_level_sum = 0
    if required_levels:
        for cat, r_lvl in required_levels.items():
            req_level_sum += r_lvl
            c_lvl = candidate_levels.get(cat, 1)
            cand_level_sum += min(c_lvl, r_lvl)
        level_fit = (cand_level_sum / req_level_sum) if req_level_sum > 0 else 1.0
    else:
        level_fit = 1.0

    raw_score = 100.0 * (w_must * must_coverage + w_nice * nice_coverage + w_level * level_fit)

    # Cap logic
    cap = 100 - (10 * n_missing_must)
    cap_reason = None
    if n_missing_must > 0:
        sample_missing = ", ".join(missing_must_names[:2])
        if len(missing_must_names) > 2:
            sample_missing += f" (+{len(missing_must_names) - 2} more)"
        cap_reason = f"{n_missing_must} must-have skill{'s' if n_missing_must > 1 else ''} missing ({sample_missing})"

    if must_coverage < 0.50:
        if cap > 49:
            cap = 49
            cap_reason = (cap_reason + "; " if cap_reason else "") + "Must-have coverage under 50%"

    final_score = int(round(max(0.0, min(float(cap), raw_score))))

    if final_score >= 75:
        band = "strong"
    elif final_score >= 50:
        band = "good"
    else:
        band = "weak"

    category_coverage = {
        cat: round(cat_credits[cat] / cat_weights[cat], 2)
        for cat in cat_weights
        if cat_weights[cat] > 0
    }

    return ScoreParts(
        match_score=final_score,
        match_band=band,
        must_coverage=round(must_coverage, 3),
        nice_coverage=round(nice_coverage, 3),
        level_fit=round(level_fit, 3),
        raw_score=round(raw_score, 1),
        cap=cap,
        cap_reason=cap_reason,
        weights={"must": w_must, "nice": w_nice, "level": w_level},
        category_coverage=category_coverage,
    )


def compute_counterfactual_impact(
    decisions: list[Decision],
    jd_terms: list[JdTerm],
    target_jd_id: str,
    required_levels: dict[str, int],
    candidate_levels: dict[str, int],
    current_score: int,
) -> int:
    """
    Computes exact counterfactual: what would the match_score be if this specific
    JD requirement had credit 1.0? Returns the delta points.
    """
    simulated_decisions = []
    for d in decisions:
        if d.jd_id == target_jd_id:
            # Simulate fully closing the gap
            simulated_decisions.append(
                Decision(
                    jd_id=d.jd_id,
                    jd_skill=d.jd_skill,
                    category_code=d.category_code,
                    requirement=d.requirement,
                    section=d.section,
                    weight=d.weight,
                    credit=1.0,
                    similarity=1.0,
                    method="exact",
                )
            )
        else:
            simulated_decisions.append(d)

    sim_res = score(simulated_decisions, jd_terms, required_levels, candidate_levels)
    delta = sim_res.match_score - current_score
    return max(1, delta)

