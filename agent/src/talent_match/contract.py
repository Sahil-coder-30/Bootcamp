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


# --- Skill Matching Models (Role 5) ---

MatchMethod = Literal["exact", "alias", "implied", "fuzzy", "semantic", "llm", "category"]
MatchBand = Literal["strong", "good", "weak"]
GapType = Literal["missing", "partial"]
GapEffort = Literal["quick_win", "big_gap"]


class ExtractedSkillList(BaseModel):
    source_type: Literal["jd", "resume"] = "jd"
    source_file: str
    company: str | None = None
    role: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    document_id: str | None = None
    company_id: int | None = None
    jd_id: str | None = None
    category_levels: dict[str, int] = Field(default_factory=dict)
    meta: dict[str, Any] = Field(default_factory=dict)


class CandidateProject(BaseModel):
    name: str
    description: str | None = None
    skills: list[str] = Field(default_factory=list)
    link: str | None = None


class CandidateExperience(BaseModel):
    title: str
    org: str | None = None
    start: str | None = None
    end: str | None = None
    highlights: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class CandidateCertification(BaseModel):
    name: str
    issuer: str | None = None
    year: str | None = None


class CandidateProfile(BaseModel):
    id: str
    name: str
    email: str | None = None
    version: int = 1
    education: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    projects: list[CandidateProject] = Field(default_factory=list)
    internships: list[CandidateExperience] = Field(default_factory=list)
    certifications: list[CandidateCertification] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)
    skill_levels: dict[str, CandidateSkillLevel | int] = Field(default_factory=dict)

    @model_validator(mode="after")
    def normalize_profile_skill_levels(self) -> CandidateProfile:
        normalized: dict[str, CandidateSkillLevel | int] = {}
        for code, val in self.skill_levels.items():
            if isinstance(val, int):
                normalized[code] = CandidateSkillLevel(level=val, source="self", confidence="high")
            else:
                normalized[code] = val
        self.skill_levels = normalized
        return self


class ResumeExtraction(BaseModel):
    source_type: Literal["resume"] = "resume"
    source_file: str
    candidate: dict[str, Any] = Field(default_factory=dict)
    skills: list[Skill] = Field(default_factory=list)
    education: list[dict[str, Any]] = Field(default_factory=list)
    experience: list[CandidateExperience] = Field(default_factory=list)
    projects: list[CandidateProject] = Field(default_factory=list)
    certifications: list[CandidateCertification] = Field(default_factory=list)
    category_levels: dict[str, int] = Field(default_factory=dict)


class MatchedSkill(BaseModel):
    jd_skill: str
    candidate_skill: str
    category_code: str
    method: MatchMethod = "exact"
    similarity: float = Field(ge=0.0, le=1.0, default=1.0)
    requirement: Literal["must", "nice"] = "must"
    evidence: str = ""
    credit: float = Field(ge=0.0, le=1.0, default=1.0)
    jd_evidence: str | None = None
    relation: str | None = None
    reason: str | None = None


class MissingSkill(BaseModel):
    skill_name: str
    category_code: str
    requirement: Literal["must", "nice"] = "must"
    why_it_matters: str
    closest_candidate_skill: str | None = None
    learn_next: str | None = None
    gap_type: GapType = "missing"
    effort: GapEffort = "quick_win"
    impact_points: int = 0
    priority: int = 1
    jd_evidence: str | None = None
    section: str | None = None
    candidate_level: int | None = None
    required_level: int | None = None


class ScoreBreakdown(BaseModel):
    must_coverage: float = 0.0
    nice_coverage: float = 0.0
    level_fit: float = 0.0
    raw_score: float = 0.0
    cap: int = 100
    cap_reason: str | None = None
    weights: dict[str, float] = Field(
        default_factory=lambda: {"must": 0.6, "nice": 0.2, "level": 0.2}
    )


class SkillMatchMeta(BaseModel):
    taxonomy_version: str = "tx-1.0"
    prompt_version: str = "sm-adj-v1"
    stage_counts: dict[str, int] = Field(default_factory=dict)
    llm_calls: int = 0
    llm_pairs: int = 0
    latency_ms: float = 0.0
    cached: bool = False
    warnings: list[str] = Field(default_factory=list)


class SkillMatchResult(BaseModel):
    jd_source_file: str
    match_score: int = Field(ge=0, le=100)
    match_band: MatchBand = "good"
    jd_id: str | None = None
    profile_id: str | None = None
    profile_version: int | None = None
    matched_skills: list[MatchedSkill] = Field(default_factory=list)
    missing_skills: list[MissingSkill] = Field(default_factory=list)
    category_coverage: dict[str, float] = Field(default_factory=dict)
    score_breakdown: ScoreBreakdown = Field(default_factory=ScoreBreakdown)
    matching_version: str = "sm-1.0"
    meta: SkillMatchMeta = Field(default_factory=SkillMatchMeta)


class MatchOptions(BaseModel):
    use_llm: bool = True
    use_embeddings: bool = True
    fast_mode: bool = False


class SkillMatchRequest(BaseModel):
    jd: ExtractedSkillList
    profile: CandidateProfile | None = None
    resume: ResumeExtraction | None = None
    topics: dict[str, dict[str, str]] = Field(default_factory=dict)
    options: MatchOptions = Field(default_factory=MatchOptions)

    @model_validator(mode="after")
    def validate_candidate_input(self) -> SkillMatchRequest:
        if self.profile is None and self.resume is None:
            raise ValueError("Either profile or resume must be provided")
        return self


class CandidateInput(BaseModel):
    id: str
    name: str
    profile: CandidateProfile | None = None
    resume: ResumeExtraction | None = None


class BatchMatrixCell(BaseModel):
    profile_id: str
    jd_id: str
    match_score: int
    band: MatchBand
    must_coverage: float
    top_missing: list[str] = Field(default_factory=list)
    skill_match_id: str | None = None


class SkillMatchBatchRequest(BaseModel):
    jds: list[ExtractedSkillList]
    candidates: list[CandidateInput]
    topics: dict[str, dict[str, str]] = Field(default_factory=dict)
    options: MatchOptions = Field(default_factory=MatchOptions)


class SkillMatchBatchResult(BaseModel):
    matching_version: str = "sm-1.0"
    profiles: list[dict[str, Any]]
    jds: list[dict[str, Any]]
    cells: list[BatchMatrixCell]
    best_jd_by_profile: dict[str, str] = Field(default_factory=dict)
    best_candidate_by_jd: dict[str, str] = Field(default_factory=dict)
    meta: dict[str, Any] = Field(default_factory=dict)

