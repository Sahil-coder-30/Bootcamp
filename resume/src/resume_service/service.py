"""
service.py
==========
Upload -> store file -> parse -> save row. Dedupes by (user_id, sha256): the
same file uploaded twice returns the stored parse (``cached: true``) unless
``force`` asks for a re-parse.
"""

from __future__ import annotations

import hashlib
import logging
import uuid

from . import documents, pipeline
from .contract import LEVELS_VERSION, PARSER_VERSION, ResumeExtraction, ResumeRecord
from .db import ResumeRepo, ResumeRow
from .storage import Storage, StorageError, object_key

logger = logging.getLogger("resume.service")

MIME_BY_KIND = {"pdf": "application/pdf", "txt": "text/plain",
                "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}


class NotFound(LookupError):
    pass


def to_record(row: ResumeRow, cached: bool = False, include_extraction: bool = True) -> ResumeRecord:
    ext = None
    if include_extraction and row.extraction:
        ext = ResumeExtraction.model_validate(row.extraction)
        ext.meta.cached = cached
    return ResumeRecord(
        resume_id=str(row.id), user_id=str(row.user_id) if row.user_id else None, file_name=row.file_name,
        sha256=row.sha256, mime=row.mime, size_bytes=row.size_bytes, parser_version=row.parser_version,
        created_at=row.created_at.isoformat(), updated_at=row.updated_at.isoformat(), cached=cached, extraction=ext)


def _kind(data: bytes, file_name: str, mime: str | None) -> str:
    k = documents.sniff_kind(data, file_name, mime)
    return {"text": "txt"}.get(k, k)


def _parse_into(row_id: uuid.UUID, data: bytes, file_name: str, mime: str | None) -> ResumeExtraction:
    ext = pipeline.parse_resume(data, file_name, mime)
    ext.document_id = str(row_id)
    ext.extraction_id = str(row_id)
    return ext


class ResumeService:
    def __init__(self, repo: ResumeRepo, storage: Storage, prefix: str = "resume-files") -> None:
        self.repo = repo
        self.storage = storage
        self.prefix = prefix

    def upload(self, data: bytes, file_name: str, mime: str | None, user_id: uuid.UUID | None,
               force: bool = False) -> tuple[ResumeRecord, bool]:
        """Returns (record, created)."""
        sha = hashlib.sha256(data).hexdigest()
        existing = self.repo.find_by_hash(sha, user_id)
        if existing and not force and existing.status == "parsed" and existing.parser_version == PARSER_VERSION:
            return to_record(existing, cached=True), False

        kind = _kind(data, file_name, mime)
        mime = MIME_BY_KIND.get(kind, mime or "application/octet-stream")
        key = object_key(self.prefix, sha, kind)
        # parse first: a file we cannot read is rejected (422) and never stored
        row_id = existing.id if existing else uuid.uuid4()
        ext = _parse_into(row_id, data, file_name, mime)
        try:
            self.storage.put(key, data, mime)
        except StorageError:
            logger.exception("storing %s failed", key)
            raise
        fields = dict(
            file_name=file_name[:255], mime=mime, size_bytes=len(data), sha256=sha,
            storage_backend=self.storage.backend, storage_key=key, status="parsed", error=None,
            text="\n".join(ext.sections.values()), extraction=ext.model_dump(mode="json"),
            category_levels=ext.category_levels, candidate_name=ext.candidate.name,
            candidate_email=ext.candidate.email, parser_version=PARSER_VERSION, levels_version=LEVELS_VERSION,
            latency_ms=ext.meta.latency_ms)
        if existing:
            row = self.repo.update(existing.id, **fields)
            assert row is not None
            return to_record(row), False
        row = self.repo.add(ResumeRow(id=row_id, user_id=user_id, **fields))
        return to_record(row), True

    def get(self, resume_id: uuid.UUID, user_id: uuid.UUID | None = None) -> ResumeRow:
        row = self.repo.get(resume_id)
        # a resume owned by someone else looks exactly like a missing one
        if row is None or (user_id is not None and row.user_id is not None and row.user_id != user_id):
            raise NotFound(f"resume {resume_id} not found")
        return row

    def file(self, resume_id: uuid.UUID, user_id: uuid.UUID | None = None) -> tuple[ResumeRow, bytes]:
        row = self.get(resume_id, user_id)
        return row, self.storage.get(row.storage_key)

    def reparse(self, resume_id: uuid.UUID, user_id: uuid.UUID | None = None) -> ResumeRecord:
        row, data = self.file(resume_id, user_id)
        ext = _parse_into(row.id, data, row.file_name, row.mime)
        updated = self.repo.update(
            row.id, extraction=ext.model_dump(mode="json"), category_levels=ext.category_levels,
            text="\n".join(ext.sections.values()), candidate_name=ext.candidate.name,
            candidate_email=ext.candidate.email, parser_version=PARSER_VERSION, levels_version=LEVELS_VERSION,
            latency_ms=ext.meta.latency_ms, status="parsed", error=None)
        assert updated is not None
        return to_record(updated)

    def attach_user(self, resume_id: uuid.UUID, user_id: uuid.UUID | None) -> ResumeRecord:
        row = self.get(resume_id)
        if row.user_id is not None and user_id is not None and row.user_id != user_id:
            raise NotFound(f"resume {resume_id} not found")
        updated = self.repo.update(row.id, user_id=user_id)
        assert updated is not None
        return to_record(updated)

    def delete(self, resume_id: uuid.UUID, user_id: uuid.UUID | None = None) -> None:
        row = self.get(resume_id, user_id)
        self.repo.delete(row.id)
        if not self.repo.key_in_use(row.storage_key):
            try:
                self.storage.delete(row.storage_key)
            except StorageError:
                logger.warning("could not delete %s from storage", row.storage_key)
