"""
router.py
=========
FastAPI endpoints for Role 1: JD Analytics. Stateless; the backend stores
documents and extractions.

    POST /documents/parse   {file_name, mime?, content_b64} -> parsed text + sections + sha256
    POST /extract/jd        JdExtractRequest -> ExtractedSkillList
"""

from __future__ import annotations

import base64
import binascii
import hashlib

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from talent_match.contract import ExtractedSkillList
from talent_match.documents import DocumentError, parse_document
from talent_match.jd.pipeline import JdExtractRequest, extract_jd
from talent_match.jd.sections import StructuredDocument, structure

MAX_BYTES = 10 * 1024 * 1024

router = APIRouter(tags=["jd"])


class DocumentParseRequest(BaseModel):
    file_name: str
    mime: str | None = None
    content_b64: str


class DocumentParseResponse(StructuredDocument):
    sha256: str
    file_name: str
    size_bytes: int


@router.post("/documents/parse", response_model=DocumentParseResponse)
def parse_document_endpoint(req: DocumentParseRequest) -> DocumentParseResponse:
    try:
        data = base64.b64decode(req.content_b64, validate=True)
    except (binascii.Error, ValueError) as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "content_b64 is not valid base64") from exc
    if len(data) > MAX_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, "file is larger than 10 MB")
    try:
        doc = structure(parse_document(data, req.file_name, req.mime))
    except DocumentError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"{exc.code}: {exc}") from exc
    return DocumentParseResponse(
        **doc.model_dump(),
        sha256=hashlib.sha256(data).hexdigest(),
        file_name=req.file_name,
        size_bytes=len(data),
    )


@router.post("/extract/jd", response_model=ExtractedSkillList)
def extract_jd_endpoint(req: JdExtractRequest) -> ExtractedSkillList:
    # sync def: FastAPI runs it in the threadpool, so slow LLM calls do not block the loop
    if not (req.document or (req.text and req.text.strip())):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "send `document` (from /documents/parse) or `text`")
    try:
        return extract_jd(req)
    except ValueError as exc:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, str(exc)) from exc
