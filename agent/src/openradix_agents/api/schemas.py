"""
schemas.py
==========
Request / response models for the HTTP API.
"""

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

from ..pipeline import STEPS
from ..providers import PROVIDERS

Step = Literal["research", "consolidation", "skills", "hiring", "test"]
assert set(Step.__args__) == set(STEPS)  # keep in sync with pipeline.STEPS


def _clean_company(v: str) -> str:
    v = " ".join(v.split())
    if not v:
        raise ValueError("company must not be empty")
    return v


def _check_providers(v: list[str] | None) -> list[str] | None:
    if v is None:
        return v
    unknown = [p for p in v if p not in PROVIDERS]
    if unknown:
        raise ValueError(f"unknown provider(s) {unknown} - valid: {sorted(PROVIDERS)}")
    return v


class RunRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=100, examples=["Blinkit"])
    providers: list[str] | None = Field(
        None, min_length=1, description="Research fan-out. Default: RESEARCH_PROVIDERS from .env."
    )
    steps: list[Step] | None = Field(
        None, min_length=1, description="Steps to run. Default: the whole pipeline."
    )

    _company = field_validator("company")(_clean_company)
    _providers = field_validator("providers")(_check_providers)


class CompanyRequest(BaseModel):
    company: str = Field(..., min_length=1, max_length=100, examples=["Blinkit"])

    _company = field_validator("company")(_clean_company)


class DoctorRequest(BaseModel):
    providers: list[str] | None = None

    _providers = field_validator("providers")(_check_providers)


class JobStatus(str, Enum):
    queued = "queued"
    running = "running"
    succeeded = "succeeded"
    partial = "partial"  # finished, but at least one step failed
    failed = "failed"  # crashed before any step could finish


class StepState(BaseModel):
    status: str = "pending"  # pending | running | ok | failed | skipped
    seconds: float | None = None
    result: dict[str, Any] | None = None
    error: str | None = None


class Job(BaseModel):
    id: str
    company: str
    providers: list[str]
    steps: dict[str, StepState]
    status: JobStatus = JobStatus.queued
    current_step: str | None = None
    error: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    finished_at: datetime | None = None


class JobList(BaseModel):
    jobs: list[Job]


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    service: str = "openradix-agents"
    version: str
    providers: list[str]
    primary_provider: str
    keys_present: dict[str, bool]
    jobs: dict[str, int]


class ProviderCheck(BaseModel):
    provider: str
    key_name: str
    model: str
    status: Literal["OK", "FAIL", "MISS"]
    detail: str


class DoctorResponse(BaseModel):
    ok: bool
    results: list[ProviderCheck]


class ValidationFailure(BaseModel):
    target: str
    scope: str
    case_id: str
    priority: str
    category: str
    type: str
    message: str


class ValidationResponse(BaseModel):
    company: str
    checks: int
    passed: int
    failed: int
    failures: list[ValidationFailure]


class ArtifactInfo(BaseModel):
    name: str
    size: int
    modified_at: datetime


class ArtifactList(BaseModel):
    company: str
    artifacts: list[ArtifactInfo]
