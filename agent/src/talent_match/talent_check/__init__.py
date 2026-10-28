"""
talent_check
============
Role 4: Talent Check package.
Exports core scoring functions and version constants.
"""

from talent_match.talent_check.constants import SCORING_VERSION
from talent_match.talent_check.scoring import (
    raw_readiness,
    round_score,
    score_talent_check,
    verdict_for,
)

__all__ = [
    "SCORING_VERSION",
    "score_talent_check",
    "raw_readiness",
    "round_score",
    "verdict_for",
]
