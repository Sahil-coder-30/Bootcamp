"""
main.py
=======
Resume parsing microservice (Role 2). Fully offline: no LLM or external API
calls; parsing runs on PyMuPDF / python-docx, spaCy NER and a rapidfuzz skill
taxonomy inside this process.

    uvicorn resume_service.main:app --port 8100

The Express backend proxies ``/api/resumes/*`` here (backend/src/services/resume.service.ts).

    GET    /healthz /readyz /health        probes and info
    POST   /parse                          parse a file, store nothing
    POST   /parse/text                     parse pasted text
    POST   /levels/infer                   re-score levels for an (edited) extraction
    POST   /resumes                        upload + store (S3 or local) + parse  -> ResumeRecord
    GET    /resumes                        list (?user_id= or X-User-Id, ?email=)
    GET    /resumes/{id}                   one record with its extraction
    GET    /resumes/{id}/file              original file (S3 presigned redirect or stream)
    GET    /resumes/{id}/profile-draft     CandidateProfile draft with skill_levels
    POST   /resumes/{id}/reparse           parse the stored file again
    PATCH  /resumes/{id}                   attach to a user
    DELETE /resumes/{id}
"""

from __future__ import annotations

import logging
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from importlib.metadata import PackageNotFoundError, version

from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, Response, UploadFile, status
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel

from . import nlp, pipeline
from .contract import (
    LEVELS_VERSION,
    PARSER_VERSION,
    ProfileDraft,
    ResumeExtraction,
    ResumeList,
    ResumeRecord,
    TextParseRequest,
)
from .db import ResumeRepo, make_engine
from .documents import DocumentError
from .profile import profile_draft
from .service import NotFound, ResumeService, to_record
from .settings import Settings, get_settings
from .storage import StorageError, make_storage
from .taxonomy import get_taxonomy

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("resume.http")


class AttachRequest(BaseModel):
    user_id: str | None


def _uuid(value: str | None, field: str) -> uuid.UUID | None:
    if value in (None, ""):
        return None
    try:
        return uuid.UUID(str(value))
    except ValueError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_CONTENT, f"{field} must be a UUID") from exc


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        repo = ResumeRepo(make_engine(settings.database_url))
        repo.create_schema()
        storage = make_storage(settings)
        app.state.repo = repo
        app.state.storage = storage
        app.state.service = ResumeService(repo, storage, settings.s3_prefix)
        # load spaCy + taxonomy once at boot, not on the first request
        await run_in_threadpool(nlp.get_nlp)
        get_taxonomy()
        logger.info("resume service ready: storage=%s ner=%s", storage.backend, nlp.model_name())
        yield
        repo.engine.dispose()

    app = FastAPI(title="Resume Parsing Service", version=_version(), lifespan=lifespan,
                  description="Offline resume parsing (no LLM): PDF/DOCX/TXT -> ResumeExtraction + lv-1.0 levels.")
    app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins,
                       allow_methods=["GET", "POST", "PATCH", "DELETE"], allow_headers=["*"])

    @app.middleware("http")
    async def access_log(request: Request, call_next):
        start = time.perf_counter()
        response = await call_next(request)
        logger.info("%s %s %s - %.2f ms", request.method, request.url.path, response.status_code,
                    (time.perf_counter() - start) * 1000)
        return response

    @app.exception_handler(DocumentError)
    async def document_error(_: Request, exc: DocumentError) -> JSONResponse:
        return JSONResponse(status_code=422, content={"detail": str(exc), "code": exc.code})

    @app.exception_handler(NotFound)
    async def not_found(_: Request, exc: NotFound) -> JSONResponse:
        return JSONResponse(status_code=404, content={"detail": str(exc)})

    @app.exception_handler(StorageError)
    async def storage_error(_: Request, exc: StorageError) -> JSONResponse:
        return JSONResponse(status_code=502, content={"detail": str(exc)})

    def require_key(x_resume_key: str | None = Header(default=None)) -> None:
        if settings.api_key and not (x_resume_key and secrets.compare_digest(x_resume_key, settings.api_key)):
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or missing X-Resume-Key")

    def svc(request: Request) -> ResumeService:
        return request.app.state.service

    def caller(x_user_id: str | None = Header(default=None)) -> uuid.UUID | None:
        """The signed-in user, forwarded by the backend after it verified the JWT."""
        return _uuid(x_user_id, "X-User-Id")

    async def read_upload(file: UploadFile) -> bytes:
        data = await file.read(settings.max_upload_bytes + 1)
        if len(data) > settings.max_upload_bytes:
            raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE,
                                f"file is larger than {settings.max_upload_mb:g} MB")
        return data

    # --- probes ---------------------------------------------------------------

    @app.get("/healthz", tags=["health"])
    def healthz() -> dict[str, str]:
        return {"status": "ok"}

    @app.get("/readyz", tags=["health"])
    def readyz(request: Request) -> JSONResponse:
        ok = request.app.state.repo.ping()
        return JSONResponse(status_code=200 if ok else 503, content={"status": "ok" if ok else "db_unavailable"})

    @app.get("/health", tags=["health"])
    def health(request: Request) -> dict[str, object]:
        storage = request.app.state.storage
        return {
            "status": "ok", "version": _version(), "parser_version": PARSER_VERSION,
            "levels_version": LEVELS_VERSION, "taxonomy_version": get_taxonomy().version,
            "taxonomy_skills": len(get_taxonomy().skills), "ner_model": nlp.model_name(),
            "storage": storage.backend, "storage_ok": storage.ping(), "db_ok": request.app.state.repo.ping(),
            "llm_calls": 0,
        }

    # --- stateless parsing -------------------------------------------------------

    @app.post("/parse", response_model=ResumeExtraction, tags=["parse"], dependencies=[Depends(require_key)])
    async def parse(file: UploadFile = File(...)) -> ResumeExtraction:
        data = await read_upload(file)
        return await run_in_threadpool(pipeline.parse_resume, data, file.filename or "resume", file.content_type)

    @app.post("/parse/text", response_model=ResumeExtraction, tags=["parse"], dependencies=[Depends(require_key)])
    async def parse_text(body: TextParseRequest) -> ResumeExtraction:
        return await run_in_threadpool(pipeline.parse_resume_text, body.text, body.source_file)

    @app.post("/levels/infer", response_model=ResumeExtraction, tags=["parse"],
              dependencies=[Depends(require_key)])
    def levels_infer(extraction: ResumeExtraction) -> ResumeExtraction:
        """Deterministic re-score of skills and the 12 levels from structured fields (no document)."""
        return pipeline.rescore(extraction)

    # --- stored resumes -----------------------------------------------------------

    @app.post("/resumes", response_model=ResumeRecord, tags=["resumes"], dependencies=[Depends(require_key)],
              responses={200: {"description": "same file already parsed (cached)"}, 201: {"description": "created"}})
    async def upload(response: Response, file: UploadFile = File(...), user_id: str | None = Form(default=None),
                     force: bool = Query(default=False), me: uuid.UUID | None = Depends(caller),
                     service: ResumeService = Depends(svc)) -> ResumeRecord:
        owner = me or _uuid(user_id, "user_id")
        data = await read_upload(file)
        record, created = await run_in_threadpool(
            service.upload, data, file.filename or "resume", file.content_type, owner, force)
        response.status_code = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return record

    @app.get("/resumes", response_model=ResumeList, tags=["resumes"], dependencies=[Depends(require_key)])
    def list_resumes(user_id: str | None = None, email: str | None = None,
                     limit: int = Query(default=20, ge=1, le=100), offset: int = Query(default=0, ge=0),
                     include_extraction: bool = False, me: uuid.UUID | None = Depends(caller),
                     service: ResumeService = Depends(svc)) -> ResumeList:
        owner = me or _uuid(user_id, "user_id")
        rows, total = service.repo.list(owner, email, limit, offset)
        return ResumeList(items=[to_record(r, include_extraction=include_extraction) for r in rows], total=total)

    @app.get("/resumes/{resume_id}", response_model=ResumeRecord, tags=["resumes"],
             dependencies=[Depends(require_key)])
    def get_resume(resume_id: uuid.UUID, me: uuid.UUID | None = Depends(caller),
                   service: ResumeService = Depends(svc)) -> ResumeRecord:
        return to_record(service.get(resume_id, me))

    @app.get("/resumes/{resume_id}/file", tags=["resumes"], dependencies=[Depends(require_key)])
    def get_file(resume_id: uuid.UUID, redirect: bool = False, me: uuid.UUID | None = Depends(caller),
                 service: ResumeService = Depends(svc)) -> Response:
        row = service.get(resume_id, me)
        if redirect:
            url = service.storage.presign(row.storage_key, row.file_name)
            if url:
                return RedirectResponse(url, status_code=307)
        _, data = service.file(resume_id, me)
        safe = row.file_name.replace('"', "")
        return Response(content=data, media_type=row.mime,
                        headers={"Content-Disposition": f'inline; filename="{safe}"'})

    @app.get("/resumes/{resume_id}/profile-draft", response_model=ProfileDraft, tags=["resumes"],
             dependencies=[Depends(require_key)])
    def get_profile_draft(resume_id: uuid.UUID, me: uuid.UUID | None = Depends(caller),
                          service: ResumeService = Depends(svc)) -> ProfileDraft:
        row = service.get(resume_id, me)
        record = to_record(row)
        if record.extraction is None:
            raise HTTPException(status.HTTP_409_CONFLICT, "resume has no parsed extraction yet")
        return profile_draft(record.extraction, cv_file=row.storage_key)

    @app.post("/resumes/{resume_id}/reparse", response_model=ResumeRecord, tags=["resumes"],
              dependencies=[Depends(require_key)])
    async def reparse(resume_id: uuid.UUID, me: uuid.UUID | None = Depends(caller),
                      service: ResumeService = Depends(svc)) -> ResumeRecord:
        return await run_in_threadpool(service.reparse, resume_id, me)

    @app.patch("/resumes/{resume_id}", response_model=ResumeRecord, tags=["resumes"],
               dependencies=[Depends(require_key)])
    def attach(resume_id: uuid.UUID, body: AttachRequest, service: ResumeService = Depends(svc)) -> ResumeRecord:
        return service.attach_user(resume_id, _uuid(body.user_id, "user_id"))

    @app.delete("/resumes/{resume_id}", status_code=204, tags=["resumes"], dependencies=[Depends(require_key)])
    def delete(resume_id: uuid.UUID, me: uuid.UUID | None = Depends(caller),
               service: ResumeService = Depends(svc)) -> Response:
        service.delete(resume_id, me)
        return Response(status_code=204)

    return app


def _version() -> str:
    try:
        return version("resume-service")
    except PackageNotFoundError:
        return "1.0.0"


app = create_app()
