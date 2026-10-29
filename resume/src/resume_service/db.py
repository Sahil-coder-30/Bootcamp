"""
db.py
=====
The ``resumes`` table (source of truth: resume/migrations/001_resumes.sql) and a
small repository around it. SQLAlchemy 2, so the same code runs on Postgres
(Supabase / k8s) and on a local SQLite file.
"""

from __future__ import annotations

import uuid
from datetime import UTC, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, Index, Integer, String, Text, Uuid, create_engine, func, select, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, sessionmaker

JsonType = JSON().with_variant(JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass


def _now() -> datetime:
    return datetime.now(UTC)


class ResumeRow(Base):
    __tablename__ = "resumes"

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid, nullable=True)
    file_name: Mapped[str] = mapped_column(Text)
    mime: Mapped[str] = mapped_column(Text)
    size_bytes: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64))
    storage_backend: Mapped[str] = mapped_column(Text)
    storage_key: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(Text, default="parsed")
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    text: Mapped[str | None] = mapped_column(Text, nullable=True)
    extraction: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    category_levels: Mapped[dict[str, Any] | None] = mapped_column(JsonType, nullable=True)
    candidate_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    candidate_email: Mapped[str | None] = mapped_column(Text, nullable=True)
    parser_version: Mapped[str] = mapped_column(Text)
    levels_version: Mapped[str] = mapped_column(Text)
    latency_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    __table_args__ = (
        Index("resumes_user_id_idx", "user_id"),
        Index("resumes_sha256_idx", "sha256"),
        Index("resumes_candidate_email_idx", "candidate_email"),
    )


def _normalize_url(url: str) -> str:
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def make_engine(url: str) -> Engine:
    url = _normalize_url(url)
    if url.startswith("sqlite:///"):
        from pathlib import Path

        path = url[len("sqlite:///"):]
        if path and path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        return create_engine(url, connect_args={"check_same_thread": False})
    return create_engine(url, pool_pre_ping=True, pool_size=5, max_overflow=5)


class ResumeRepo:
    def __init__(self, engine: Engine) -> None:
        self.engine = engine
        self.sessions = sessionmaker(engine, expire_on_commit=False)

    def create_schema(self) -> None:
        Base.metadata.create_all(self.engine)

    def ping(self) -> bool:
        try:
            with self.engine.connect() as conn:
                conn.execute(text("select 1"))
            return True
        except Exception:
            return False

    def session(self) -> Session:
        return self.sessions()

    def find_by_hash(self, sha256: str, user_id: uuid.UUID | None) -> ResumeRow | None:
        with self.session() as s:
            q = select(ResumeRow).where(ResumeRow.sha256 == sha256)
            q = q.where(ResumeRow.user_id == user_id) if user_id else q.where(ResumeRow.user_id.is_(None))
            return s.scalars(q.limit(1)).first()

    def get(self, resume_id: uuid.UUID) -> ResumeRow | None:
        with self.session() as s:
            return s.get(ResumeRow, resume_id)

    def add(self, row: ResumeRow) -> ResumeRow:
        with self.session() as s:
            s.add(row)
            s.commit()
            s.refresh(row)
            return row

    def update(self, resume_id: uuid.UUID, **fields: Any) -> ResumeRow | None:
        with self.session() as s:
            row = s.get(ResumeRow, resume_id)
            if row is None:
                return None
            for k, v in fields.items():
                setattr(row, k, v)
            row.updated_at = _now()
            s.commit()
            s.refresh(row)
            return row

    def delete(self, resume_id: uuid.UUID) -> ResumeRow | None:
        with self.session() as s:
            row = s.get(ResumeRow, resume_id)
            if row is None:
                return None
            s.delete(row)
            s.commit()
            return row

    def key_in_use(self, storage_key: str) -> bool:
        with self.session() as s:
            count = s.scalar(select(func.count()).where(ResumeRow.storage_key == storage_key))
            return bool(count)

    def list(self, user_id: uuid.UUID | None, email: str | None, limit: int,
             offset: int) -> tuple[list[ResumeRow], int]:
        with self.session() as s:
            q = select(ResumeRow)
            if user_id:
                q = q.where(ResumeRow.user_id == user_id)
            if email:
                q = q.where(func.lower(ResumeRow.candidate_email) == email.lower())
            total = s.scalar(select(func.count()).select_from(q.subquery())) or 0
            rows = list(s.scalars(q.order_by(ResumeRow.created_at.desc()).limit(limit).offset(offset)))
            return rows, int(total)
