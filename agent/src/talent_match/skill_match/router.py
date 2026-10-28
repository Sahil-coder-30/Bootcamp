"""
router.py
=========
FastAPI router for Role 5: Skill Matching.
Stateless compute endpoints:
  POST /skill-match
  POST /skill-match/batch
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from talent_match.contract import (
    SkillMatchBatchRequest,
    SkillMatchBatchResult,
    SkillMatchRequest,
    SkillMatchResult,
)
from talent_match.skill_match.service import match, match_batch

router = APIRouter(tags=["skill-match"])


@router.post("/skill-match", response_model=SkillMatchResult)
async def skill_match_endpoint(req: SkillMatchRequest) -> SkillMatchResult:
    """Computes skill match score, cascade links, and ranked counterfactual gaps."""
    try:
        return match(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill matching failed: {str(e)}",
        ) from e


@router.post("/skill-match/batch", response_model=SkillMatchBatchResult)
async def skill_match_batch_endpoint(req: SkillMatchBatchRequest) -> SkillMatchBatchResult:
    """Evaluates candidates x JDs matrix with shared embeddings and batched gray-zone adjudication."""
    try:
        return match_batch(req)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Skill match batch failed: {str(e)}",
        ) from e
