"""
gaps.py
=======
Builds ranked missing_skills (gap list), closest candidate skills,
topics to learn next, and effort classifications (quick wins vs big gaps).
"""

from __future__ import annotations

import talent_match.skill_match.sm_taxonomy as taxonomy
from talent_match.contract import MissingSkill
from talent_match.skill_match.cascade import Decision
from talent_match.skill_match.scoring import ScoreParts, compute_counterfactual_impact
from talent_match.skill_match.terms import CandTerm, JdTerm


def find_closest_candidate_skill(
    jd_term: JdTerm,
    cand_terms: list[CandTerm],
) -> str | None:
    """
    Finds the closest candidate skill via taxonomy relations (related, sibling, parent),
    or same category.
    """
    if not jd_term.canonical_id:
        # Fallback by category
        for ct in cand_terms:
            if ct.category_code == jd_term.category_code:
                return ct.raw_name
        return None

    entry = taxonomy.get(jd_term.canonical_id)
    if entry:
        # 1. Related skills
        for rel in entry.related:
            for ct in cand_terms:
                if ct.canonical_id == rel:
                    return ct.raw_name
        # 2. Parents
        for p in entry.parents:
            for ct in cand_terms:
                if ct.canonical_id == p:
                    return ct.raw_name
        # 3. Siblings / implied
        for ct in cand_terms:
            if ct.canonical_id:
                rel = taxonomy.relation(ct.canonical_id, jd_term.canonical_id)
                if rel in ("sibling", "instance_of", "general_form"):
                    return ct.raw_name

    # Same category fallback
    for ct in cand_terms:
        if ct.category_code == jd_term.category_code:
            return ct.raw_name

    return None


def get_learn_next_hint(
    jd_term: JdTerm,
    topics: dict[str, dict[str, str]],
    cand_level: int,
    req_level: int,
) -> str:
    """
    Returns learn hint from taxonomy, combined with topic ladder for the category.
    """
    learn_pieces = []
    if jd_term.canonical_id:
        entry = taxonomy.get(jd_term.canonical_id)
        if entry and entry.learn_hint:
            learn_pieces.append(entry.learn_hint)

    # Add topics ladder if available
    cat_topics = topics.get(jd_term.category_code, {})
    if cat_topics:
        ladder = []
        for lvl in range(cand_level + 1, min(req_level + 1, cand_level + 3)):
            lvl_str = str(lvl)
            if lvl_str in cat_topics:
                ladder.append(f"Level {lvl}: {cat_topics[lvl_str]}")
        if ladder:
            learn_pieces.append("Study path: " + "; ".join(ladder))

    if not learn_pieces:
        return f"Build a project demonstrating practical application of {jd_term.raw_name}."

    return " | ".join(learn_pieces)


def build_missing(
    decisions: list[Decision],
    jd_terms: list[JdTerm],
    cand_terms: list[CandTerm],
    required_levels: dict[str, int],
    candidate_levels: dict[str, int],
    topics: dict[str, dict[str, str]],
    score_parts: ScoreParts,
) -> list[MissingSkill]:
    """
    Ranks and constructs MissingSkill items.
    Items with credit < 0.85 are gaps (credit < 0.30 -> 'missing', 0.30 <= credit < 0.85 -> 'partial').
    """
    gaps: list[tuple[Decision, JdTerm, str, int]] = []  # (decision, jd_term, gap_type, impact_points)
    jd_map = {jt.id: jt for jt in jd_terms}

    for d in decisions:
        if d.credit < 0.85:
            jt = jd_map.get(d.jd_id)
            if not jt:
                continue

            gap_type = "partial" if d.credit >= 0.30 else "missing"
            impact = compute_counterfactual_impact(
                decisions,
                jd_terms,
                d.jd_id,
                required_levels,
                candidate_levels,
                score_parts.match_score,
            )
            gaps.append((d, jt, gap_type, impact))

    # Sort gaps: must-have first, then impact points desc, then section order
    section_order = {"requirements": 0, "skills": 1, "responsibilities": 2, "education": 3, "other": 4}

    gaps.sort(
        key=lambda x: (
            0 if x[1].requirement == "must" else 1,
            -x[3],
            section_order.get(x[1].section.lower(), 5),
        )
    )

    missing_skills: list[MissingSkill] = []

    for rank, (_d, jt, gap_type, impact) in enumerate(gaps, start=1):
        closest = find_closest_candidate_skill(jt, cand_terms)
        cand_lvl = candidate_levels.get(jt.category_code, 1)
        req_lvl = required_levels.get(jt.category_code, jt.level_hint or 5)

        # Effort determination
        shortfall = max(0, req_lvl - cand_lvl)
        if gap_type == "partial" and shortfall <= 1:
            effort = "quick_win"
        elif closest and shortfall <= 1:
            effort = "quick_win"
        else:
            effort = "big_gap"

        # Why it matters explanation
        req_str = "Must-have" if jt.requirement == "must" else "Nice-to-have"
        ev_quote = f' "{jt.evidence}"' if jt.evidence else ""
        plural = 's' if impact != 1 else ''
        why = (
            f"{req_str} under '{jt.section}':{ev_quote}. "
            f"Closing it adds about {impact} point{plural}."
        )

        learn_next = get_learn_next_hint(jt, topics, cand_lvl, req_lvl)

        missing_skills.append(
            MissingSkill(
                skill_name=jt.raw_name,
                category_code=jt.category_code,
                requirement=jt.requirement,
                why_it_matters=why,
                closest_candidate_skill=closest,
                learn_next=learn_next,
                gap_type=gap_type,
                effort=effort,
                impact_points=impact,
                priority=rank,
                jd_evidence=jt.evidence,
                section=jt.section,
                candidate_level=cand_lvl,
                required_level=req_lvl,
            )
        )

    return missing_skills
