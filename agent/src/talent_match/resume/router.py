"""
router.py
=========
FastAPI endpoints for Role 2: Resume Parsing.
Accepts live PDF/DOCX file uploads, provides pre-computed golden candidates,
and runs sub-millisecond deterministic Bloom level recalculations.
"""

from __future__ import annotations

import base64
import time
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from talent_match.contract import CategoryLevelDetail, ResumeExtraction
from talent_match.resume.levels import infer_levels
from talent_match.resume.pipeline import parse_resume
from talent_match.resume.samples import get_sample_extraction

router = APIRouter(tags=["resume-parsing"])


class ExtractResumeJsonBody(BaseModel):
    document_id: Optional[str] = None
    file_name: str = "resume.pdf"
    mime: str = "application/pdf"
    content_b64: Optional[str] = None
    sample_key: Optional[str] = None


@router.post("/extract/resume", response_model=ResumeExtraction)
async def extract_resume_endpoint(
    file: Optional[UploadFile] = File(None),
    file_name: Optional[str] = Form(None),
    sample_key: Optional[str] = Form(None),
) -> ResumeExtraction:
    """Parse a candidate resume into a structured ResumeExtraction with Bloom levels."""
    if sample_key:
        sample = get_sample_extraction(sample_key)
        return sample

    if file is None:
        # Default fallback to Ananya Rao sample if no file attached
        return get_sample_extraction("ananya")

    try:
        content = await file.read()
        if not content:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Empty file uploaded",
            )

        name = file_name or file.filename or "resume.pdf"
        mime = file.content_type or ""

        extraction = parse_resume(data=content, file_name=name, mime=mime)
        return extraction

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Resume parsing error: {str(e)}",
        ) from e


@router.post("/extract/resume/json", response_model=ResumeExtraction)
async def extract_resume_json_endpoint(body: ExtractResumeJsonBody) -> ResumeExtraction:
    """JSON variant endpoint for base64 uploads or instant sample keys."""
    if body.sample_key:
        return get_sample_extraction(body.sample_key)

    if not body.content_b64:
        return get_sample_extraction("ananya")

    try:
        data = base64.b64decode(body.content_b64)
        return parse_resume(data=data, file_name=body.file_name, mime=body.mime)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid base64 payload: {str(e)}",
        ) from e


@router.get("/extract/resume/sample/{candidate_key}", response_model=ResumeExtraction)
async def get_sample_endpoint(candidate_key: str) -> ResumeExtraction:
    """Get instant golden extraction for demo candidates (ananya, karthik, priya, rohan)."""
    return get_sample_extraction(candidate_key)


class InferLevelsRequest(BaseModel):
    extraction: ResumeExtraction


class InferLevelsResponse(BaseModel):
    category_levels: dict[str, int]
    category_level_details: dict[str, CategoryLevelDetail]
    latency_ms: float


@router.post("/levels/infer", response_model=InferLevelsResponse)
async def infer_levels_endpoint(req: InferLevelsRequest) -> InferLevelsResponse:
    """Deterministic, zero-LLM Bloom level calculation (runs in <5ms)."""
    start_time = time.perf_counter()
    levels, details = infer_levels(req.extraction)
    dur = round((time.perf_counter() - start_time) * 1000, 2)
    return InferLevelsResponse(
        category_levels=levels,
        category_level_details=details,
        latency_ms=dur,
    )
