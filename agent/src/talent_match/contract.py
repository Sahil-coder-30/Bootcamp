"""
contract.py
===========
Pydantic v2 data models for the RADIX Talent Match shared contract.
Locked to 00-shared-contract.md (v1.1) and role-4-talent-check/plan.md.
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator

# --- Skill and Candidate Profile ---

class Skill(BaseModel):
    skill_name: str
    category_code: str
    evidence: str = Field(max_length=200)
    confidence: Literal["high", "medium", "low"] = "high"
    canonical_id: str | None = None
    level_hint: int | None = Field(default=None, ge=1, le=10)
    requirement: Literal["must", "nice"] | None = None
    section: str | None = None
    evidence_span: dict[str, int] | None = None  # {start, end, page}: char offsets into documents.text
    alt_group: str | None = None


class CandidateSkillLevel(BaseModel):
    level: int = Field(ge=1, le=10)
    source: str = "resume_inferred"  # resume_inferred | self | assessed
    confidence: Literal["high", "medium", "low"] = "high"
    basis: str | None = None


class CandidateProfileSummary(BaseModel):
    id: str
    name: str
    email: str | None = None
    version: int = 1
    skill_levels: dict[str, CandidateSkillLevel | int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def normalize_skill_levels(self) -> CandidateProfileSummary:
        normalized: dict[str, CandidateSkillLevel | int] = {}
        for code, val in self.skill_levels.items():
            if isinstance(val, int):
                normalized[code] = CandidateSkillLevel(level=val, source="self", confidence="high")
            else:
                normalized[code] = val
        self.skill_levels = normalized
        return self


# --- JD extraction (Role 1) ---

class ExtractedSkillList(BaseModel):
    source_type: Literal["jd", "resume"] = "jd"
    source_file: str
    company: str | None = None
    role: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    document_id: str | None = None
    company_id: int | None = None
    category_levels: dict[str, int] = Field(default_factory=dict)
    jd_id: str | None = None
    extraction_id: str | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


# --- Company Skill Bar ---

class CompanyBarRow(BaseModel):
    skill_set_id: int
    category_code: str
    skill_set_name: str
    required_level: int = Field(ge=1, le=10)
    bloom_code: str  # derived from required_level (CU, AP, AS, EV, CR)
    raw_bloom_code: str | None = None  # as typed in staging
    bloom_mismatch: bool = False


class CompanyBar(BaseModel):
    company_id: int
    company_name: str
    display_name: str | None = None
    source: str = "db"  # db | cache | snapshot
    rows: list[CompanyBarRow] = Field(default_factory=list)


# --- Topic Ladder & Study Plan ---

class NextTopic(BaseModel):
    level: int = Field(ge=1, le=10)
    topics: str


class StudyPlanStep(BaseModel):
    category_code: str
    from_level: int
    to_level: int
    hours: int
    topics: str | None = None


class StudyPlan(BaseModel):
    steps: list[StudyPlanStep] = Field(default_factory=list)
    total_steps: int = 0
    total_hours: int = 0
    summary: str = ""


# --- Talent Check Results ---

class GapRow(BaseModel):
    category_code: str
    required_level: int = Field(ge=1, le=10)
    candidate_level: int = Field(ge=1, le=10)
    gap: bool
    shortfall: int = Field(ge=0)
    required_bloom: str
    candidate_bloom: str
    weight: float
    next_topics: list[NextTopic] = Field(default_factory=list)
    blocking: bool = False
    points_lost: float = 0.0
    raw_bloom_code: str | None = None


class TalentCheckOptions(BaseModel):
    include_range: bool = True
    include_plan: bool = True


class TalentCheckRequest(BaseModel):
    profile: CandidateProfileSummary
    bar: CompanyBar | None = None
    topics: dict[str, dict[str, str]] | None = None  # { "SQL": { "5": "topics..." } }
    options: TalentCheckOptions = Field(default_factory=TalentCheckOptions)


class TalentCheckResult(BaseModel):
    company: str
    company_id: int
    profile_id: str
    readiness_score: int = Field(ge=0, le=100)
    verdict: Literal["ready", "almost", "not_yet"]
    top_gaps: list[str]
    scoring_version: str = "tc-1.0"
    skillset_gap: list[GapRow]
    explanation: str
    readiness_range: dict[str, int] | None = None  # {"low": 60, "high": 71}
    blocking_gaps: list[str] = Field(default_factory=list)
    levels_covered: int | None = None
    levels_needed: int | None = None
    categories_met: int | None = None
    study_plan: StudyPlan | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


# --- Batch & Ranking Models ---

class MatrixCell(BaseModel):
    profile_id: str
    company_id: int
    readiness_score: int
    verdict: Literal["ready", "almost", "not_yet"]
    top_gaps: list[str] = Field(default_factory=list)
    blocking_count: int = 0


class MatrixRequest(BaseModel):
    profiles: list[CandidateProfileSummary]
    bars: list[CompanyBar]
    mode: str = "summary"


class TalentMatrixResult(BaseModel):
    companies: list[dict[str, Any]]
    profiles: list[dict[str, Any]]
    cells: list[MatrixCell]
    scoring_version: str = "tc-1.0"


class BarMatrix(BaseModel):
    company_ids: list[int]
    company_names: list[str]
    levels: list[list[int]]  # N companies x 12 levels in canonical order


class RankRow(BaseModel):
    company_id: int
    company_name: str
    readiness_score: int
    verdict: Literal["ready", "almost", "not_yet"]
    top_gaps: list[str] = Field(default_factory=list)
    blocking_count: int = 0


class RankRequest(BaseModel):
    profile: CandidateProfileSummary
    bar_matrix: BarMatrix | None = None
    limit: int = 10
