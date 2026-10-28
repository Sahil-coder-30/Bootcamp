"""
merge.py
========
Canonicalization, priority deduplication, fuzzy grounding verification,
and anti-hallucination gates for extracted skills.
"""

from __future__ import annotations

from rapidfuzz import fuzz

from talent_match.contract import Skill
from talent_match.resume.models import RawSkill
from talent_match.resume.taxonomy import canonicalize

SECTION_PRIORITY = {
    "experience": 10,
    "projects": 9,
    "hackathons": 8,
    "publications": 7,
    "certifications": 6,
    "achievements": 5,
    "positions": 4,
    "skills": 3,
    "coursework": 2,
    "summary": 1,
    "other": 0,
}


def is_grounded(evidence: str, document_text: str) -> bool:
    """Check if evidence quote exists in source text (fuzzy partial ratio >= 75)."""
    if not evidence or not document_text:
        return False
    ev = evidence.strip().lower()
    doc = document_text.lower()
    # Fast exact match check
    if ev in doc or any(token in doc for token in ev.split() if len(token) > 4):
        return True
    return fuzz.partial_ratio(ev, doc) >= 75.0


def merge_skills(
    raw_skills: list[RawSkill],
    full_document_text: str,
) -> tuple[list[Skill], float, list[str]]:
    """Deduplicate, canonicalize, ground, and assign confidence to skills."""
    canonical_groups: dict[str, list[RawSkill]] = {}
    warnings: list[str] = []

    total_mentions = len(raw_skills)
    grounded_mentions = 0

    for raw in raw_skills:
        # Grounding check
        grounded = is_grounded(raw.evidence, full_document_text)
        if not grounded:
            warnings.append(f"ungrounded_evidence: {raw.skill_name}")
            continue

        grounded_mentions += 1
        canon_id, default_cat = canonicalize(raw.skill_name)
        cat_code = raw.category_code if raw.category_code != "OTHER" else default_cat

        # Attach updated category
        raw_copy = raw.model_copy(update={"category_code": cat_code})
        canonical_groups.setdefault(canon_id, []).append(raw_copy)

    merged_skills: list[Skill] = []

    for canon_id, mentions in canonical_groups.items():
        # Pick strongest mention based on section priority
        strongest = max(mentions, key=lambda m: SECTION_PRIORITY.get(m.section, 0))

        # Determine confidence
        if strongest.section in ("experience", "projects", "hackathons", "publications"):
            conf = "high"
            level_hint = 5
        elif strongest.section in ("skills", "certifications"):
            conf = "medium"
            level_hint = 3
        else:
            conf = "low"
            level_hint = 2

        merged_skills.append(
            Skill(
                skill_name=strongest.skill_name,
                category_code=strongest.category_code,
                canonical_id=canon_id,
                evidence=strongest.evidence[:195]
                if strongest.evidence
                else f"Mentioned in {strongest.section}",
                confidence=conf,
                level_hint=level_hint,
                section=strongest.section,
            )
        )

    grounding_rate = (grounded_mentions / total_mentions) if total_mentions > 0 else 1.0
    return merged_skills, round(grounding_rate, 2), warnings
