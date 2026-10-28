"""
ranges.py
=========
Confidence-aware range evaluation for talent check readiness scores.
Computes optimistic and pessimistic readiness bounds based on evidence confidence.
"""

from __future__ import annotations

from typing import Sequence

from talent_match.contract import CandidateSkillLevel
from talent_match.talent_check.constants import CODES, CONFIDENCE_DELTA


def get_uncertainty(skill_val: CandidateSkillLevel | int | dict) -> int:
    """Determine uncertainty delta: high/assessed=0, medium=1, low=2."""
    if isinstance(skill_val, int):
        return 0
    if isinstance(skill_val, dict):
        conf = skill_val.get("confidence", "high")
        source = skill_val.get("source", "")
    else:
        conf = skill_val.confidence
        source = skill_val.source

    if source == "assessed" or conf == "high":
        return 0
    return CONFIDENCE_DELTA.get(conf, 1)


def compute_bounds(
    levels_dict: dict[str, CandidateSkillLevel | int | dict],
    codes_order: Sequence[str] = CODES,
) -> tuple[list[int], list[int], list[int]]:
    """
    Compute (nominal, pessimistic, optimistic) candidate level vectors.
    Clamps bounds between 1 and 10.
    """
    nominal: list[int] = []
    pessimistic: list[int] = []
    optimistic: list[int] = []

    for code in codes_order:
        val = levels_dict.get(code, 1)
        if isinstance(val, int):
            nom = val
            u = 0
        elif isinstance(val, dict):
            nom = val.get("level", 1)
            u = get_uncertainty(val)
        else:
            nom = val.level
            u = get_uncertainty(val)

        nominal.append(nom)
        pessimistic.append(max(1, min(10, nom - u)))
        optimistic.append(max(1, min(10, nom + u)))

    return nominal, pessimistic, optimistic
