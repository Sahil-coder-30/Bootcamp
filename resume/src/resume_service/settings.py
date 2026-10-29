"""
settings.py
===========
Service settings from the environment (or resume/.env). Prefix ``RESUME_`` for
service options; database and S3 use their usual names so k8s secrets can be shared.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict

ROOT = Path(__file__).resolve().parents[2]  # resume/


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ROOT / ".env", extra="ignore", populate_by_name=True)

    host: str = Field("0.0.0.0", validation_alias=AliasChoices("RESUME_HOST", "HOST"))
    port: int = Field(8100, validation_alias=AliasChoices("RESUME_PORT", "PORT"))
    cors_origins: list[str] = Field(["http://localhost:5173", "http://localhost:4000"],
                                    validation_alias="RESUME_CORS_ORIGINS")
    # Optional shared secret; when set every route except the probes needs X-Resume-Key.
    api_key: str | None = Field(None, validation_alias="RESUME_API_KEY")
    max_upload_mb: float = Field(5.0, validation_alias="RESUME_MAX_UPLOAD_MB")

    # Postgres in k8s/Supabase (postgresql://...), SQLite file for local dev and tests.
    database_url: str = Field(f"sqlite:///{ROOT / 'data' / 'resumes.db'}",
                              validation_alias=AliasChoices("RESUME_DATABASE_URL", "DATABASE_URL"))

    # Original files: S3 when a bucket is set, otherwise a local folder.
    s3_bucket: str | None = Field(None, validation_alias=AliasChoices("RESUME_S3_BUCKET", "S3_BUCKET"))
    s3_prefix: str = Field("resume-files", validation_alias="RESUME_S3_PREFIX")
    s3_region: str | None = Field(None, validation_alias=AliasChoices("AWS_REGION", "AWS_DEFAULT_REGION"))
    s3_endpoint_url: str | None = Field(None, validation_alias="S3_ENDPOINT_URL")  # MinIO / LocalStack
    storage_dir: Path = Field(ROOT / "data" / "files", validation_alias="RESUME_STORAGE_DIR")

    @property
    def max_upload_bytes(self) -> int:
        return int(self.max_upload_mb * 1024 * 1024)


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]  # values come from the environment
