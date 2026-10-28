"""
plan.py
=======
Greedy algorithm to construct the 'fastest path to Ready' study plan.
Prioritizes unblocking critical gaps (shortfall >= 3) then minimizes effort hours to reach score 80.
"""

from __future__ import annotations

import math

from talent_match.contract import GapRow, StudyPlan, StudyPlanStep
from talent_match.talent_check.bar import bloom_for
from talent_match.talent_check.constants import EFFORT_HOURS, READY_THRESHOLD


def study_plan(
    gap_rows: list[GapRow],
    ladder: dict[str, dict[str, str]] | None = None,
) -> StudyPlan:
    """
    Construct greedy study plan:
    1. Raise all blocking rows (shortfall >= 3) to (required - 2) so they no longer block.
    2. Add cheapest remaining level steps until readiness score reaches READY_THRESHOLD (80).
    """
    # Working state
    cand_levels = {r.category_code: r.candidate_level for r in gap_rows}
    req_levels = {r.category_code: r.required_level for r in gap_rows}
    weights = {r.category_code: r.weight for r in gap_rows}

    needed_sum = sum(max(0, req - 1) for req in req_levels.values())
    if needed_sum == 0:
        return StudyPlan(steps=[], total_steps=0, total_hours=0, summary="Already meeting all requirements.")

    steps: list[StudyPlanStep] = []
    total_hours = 0

    # Helper to calculate current score
    def current_score() -> int:
        covered = sum(min(cand_levels[code], req_levels[code]) - 1 for code in cand_levels)
        raw = 100.0 * covered / needed_sum
        return math.floor(raw + 0.5)

    def has_blocking() -> bool:
        return any((req_levels[c] - cand_levels[c]) >= 3 for c in cand_levels)

    # Phase 1: Clear blocking gaps (raise to req - 2)
    for code, req in req_levels.items():
        curr = cand_levels[code]
        if req - curr >= 3:
            target = req - 2
            step_hours = 0
            for lvl in range(curr + 1, target + 1):
                b_code = bloom_for(lvl)
                step_hours += EFFORT_HOURS.get(b_code, 12)

            topics_desc = None
            if ladder and code in ladder:
                sub_topics = [
                    ladder[code].get(str(lvl), "")
                    for lvl in range(curr + 1, target + 1)
                    if ladder[code].get(str(lvl))
                ]
                topics_desc = "; ".join(sub_topics) if sub_topics else None

            steps.append(
                StudyPlanStep(
                    category_code=code,
                    from_level=curr,
                    to_level=target,
                    hours=step_hours,
                    topics=topics_desc,
                )
            )
            cand_levels[code] = target
            total_hours += step_hours

    # Phase 2: Greedily add cheapest level steps until score >= 80
    while current_score() < READY_THRESHOLD:
        available_steps = []
        for code, req in req_levels.items():
            curr = cand_levels[code]
            if curr < req:
                next_lvl = curr + 1
                b_code = bloom_for(next_lvl)
                hours = EFFORT_HOURS.get(b_code, 12)
                weight = weights[code]
                # Priority: lowest hours, then highest weight
                available_steps.append((hours, -weight, code, next_lvl))

        if not available_steps:
            break

        available_steps.sort()
        best_hours, _, best_code, best_lvl = available_steps[0]

        # Check if we can merge with an existing step for this code
        merged = False
        for s in steps:
            if s.category_code == best_code and s.to_level == best_lvl - 1:
                s.to_level = best_lvl
                s.hours += best_hours
                merged = True
                break

        if not merged:
            steps.append(
                StudyPlanStep(
                    category_code=best_code,
                    from_level=best_lvl - 1,
                    to_level=best_lvl,
                    hours=best_hours,
                    topics=(ladder or {}).get(best_code, {}).get(str(best_lvl)),
                )
            )

        cand_levels[best_code] = best_lvl
        total_hours += best_hours

    total_steps_count = sum(s.to_level - s.from_level for s in steps)
    weeks = max(1, round(total_hours / 30))
    summary = (
        f"{total_steps_count} level steps, about {total_hours} h "
        f"(~{weeks} weeks at 30 h/week) to reach Ready"
    )

    return StudyPlan(
        steps=steps,
        total_steps=total_steps_count,
        total_hours=total_hours,
        summary=summary,
    )
