"""
explain.py
==========
Deterministic template-based explanation generator for talent check results.
No LLM dependencies, fully reproducible and verifiable.
"""

from __future__ import annotations

from talent_match.talent_check.constants import CODE_NAMES


def explain(
    candidate_name: str,
    company_name: str,
    readiness_score: int,
    verdict: str,
    levels_covered: int,
    levels_needed: int,
    top_gaps: list[str],
    gap_rows_dict: dict[str, tuple[int, int]],  # code -> (cand_lvl, req_lvl)
    blocking_count: int,
    met_count: int,
    study_plan_steps: int,
    range_bounds: tuple[int, int] | None = None,
) -> str:
    """Generate a clean, professional, deterministic narrative summary of readiness."""
    verdict_display = verdict.replace("_", " ").title()
    sentences: list[str] = []

    # Sentence 1: Headline
    s1 = (
        f"{candidate_name} covers {levels_covered} of the {levels_needed} skill levels "
        f"{company_name} expects above the baseline (readiness {readiness_score}, {verdict_display})."
    )
    if range_bounds:
        s1 += f" Confidence range: {range_bounds[0]}–{range_bounds[1]}."
    sentences.append(s1)

    # Sentence 2: Top Gaps
    if top_gaps:
        gap_phrases = []
        for g in top_gaps[:3]:
            name = CODE_NAMES.get(g, g)
            cand_lvl, req_lvl = gap_rows_dict.get(g, (1, 1))
            gap_phrases.append(f"{name} ({cand_lvl} vs {req_lvl})")
        if len(gap_phrases) == 1:
            gaps_str = gap_phrases[0]
        elif len(gap_phrases) == 2:
            gaps_str = f"{gap_phrases[0]} and {gap_phrases[1]}"
        else:
            gaps_str = f"{gap_phrases[0]}, {gap_phrases[1]} and {gap_phrases[2]}"
        sentences.append(f"The biggest gaps are {gaps_str}.")

    # Sentence 3: Blocking & Met status
    parts = []
    if blocking_count > 0:
        cat_str = "category is" if blocking_count == 1 else "categories are"
        parts.append(f"{blocking_count} {cat_str} more than two levels short, which blocks a Ready verdict")
    if met_count > 0:
        parts.append(f"{met_count} of 12 categories already {'meets' if met_count == 1 else 'meet'} the bar")
    if parts:
        sentences.append(". ".join(parts).capitalize() + ".")

    # Sentence 4: Action plan
    if study_plan_steps > 0:
        if blocking_count > 0:
            target_cats = "category that is" if blocking_count == 1 else "categories that are"
            sentences.append(
                f"The fastest path to Ready is {study_plan_steps} level steps, starting with the "
                f"{blocking_count} {target_cats} more than two levels short."
            )
        else:
            sentences.append(f"The fastest path to Ready is {study_plan_steps} level steps.")

    return " ".join(sentences)
