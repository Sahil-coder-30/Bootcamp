"""
router.py
=========
FastAPI endpoints for Role 4: Talent Check.
Stateless, high-performance HTTP service.
"""

from __future__ import annotations

import time

from fastapi import APIRouter, HTTPException, status

from talent_match.contract import (
    MatrixRequest,
    RankRequest,
    RankRow,
    TalentCheckRequest,
    TalentCheckResult,
    TalentMatrixResult,
)
from talent_match.talent_check.bar import matrix_from_snapshot
from talent_match.talent_check.batch import rank_companies, score_matrix_all
from talent_match.talent_check.constants import CODES, SCORING_VERSION
from talent_match.talent_check.scoring import score_talent_check

router = APIRouter(prefix="/talent-check", tags=["talent-check"])


@router.post("", response_model=TalentCheckResult)
async def run_talent_check_endpoint(req: TalentCheckRequest) -> TalentCheckResult:
    """Evaluate candidate profile against company required skill bar."""
    start_time = time.perf_counter()
    try:
        result = score_talent_check(req)
        duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
        result.meta["latency_ms"] = duration_ms
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Scoring error: {str(e)}",
        ) from e


@router.post("/batch", response_model=TalentMatrixResult)
async def batch_matrix_endpoint(req: MatrixRequest) -> TalentMatrixResult:
    """Evaluate matrix of N profiles x M companies for comparative heatmap."""
    try:
        cells = score_matrix_all(req.profiles, req.bars)
        comp_summaries = [
            {"company_id": b.company_id, "company_name": b.display_name or b.company_name} for b in req.bars
        ]
        prof_summaries = [{"id": p.id, "name": p.name} for p in req.profiles]
        return TalentMatrixResult(
            companies=comp_summaries,
            profiles=prof_summaries,
            cells=cells,
            scoring_version=SCORING_VERSION,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Batch evaluation error: {str(e)}",
        ) from e


@router.post("/rank", response_model=list[RankRow])
async def rank_companies_endpoint(req: RankRequest) -> list[RankRow]:
    """Rank all 115 companies by candidate readiness in single-digit milliseconds."""
    try:
        bm = req.bar_matrix or matrix_from_snapshot()
        cand_levels: list[int] = []
        for code in CODES:
            val = req.profile.skill_levels.get(code, 1)
            if isinstance(val, int):
                cand_levels.append(val)
            elif isinstance(val, dict):
                cand_levels.append(val.get("level", 1))
            else:
                cand_levels.append(val.level)

        return rank_companies(cand_levels, bm, limit=req.limit)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ranking error: {str(e)}",
        ) from e
