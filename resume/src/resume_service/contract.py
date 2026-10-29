"""
contract.py
===========
Pydantic models for everything the resume service returns.

Field names follow docs/00-shared-contract.md (v1.1): ``Skill`` (3.1),
``ResumeExtraction`` (3.2 + 3.3 + section 9) and the ``skill_levels`` shape that
Role 3 profiles and Role 4 Talent Check read
(``{CODE: {level, source, confidence, basis, inferred_level}}``).
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

Confidence = Literal["high", "medium", "low"]

# The 12 skill_set_master.short_name codes, in skill_set_id order, plus OTHER.
CATEGORY_CODES: tuple[str, ...] = (
    "COD", "DSA", "APTI", "COMM", "OOD", "AI", "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS",
)
CATEGORY_NAMES: dict[str, str] = {
    "COD": "Coding",
    "DSA": "Data Structures and Algorithms",
    "APTI": "Aptitude and Problem Solving",
    "COMM": "Communication Skills",
    "OOD": "Object-Oriented Programming and Design",
    "AI": "AI Native Engineering",
    "SQL": "SQL and Design",
    "SYSD": "System Design and Architecture",
    "CLOUD": "DevOps and Cloud",
    "SWE": "Software Engineering",
    "NETW": "Computer Networking",
    "OS": "Operating System",
    "OTHER": "Other",
}

SCHEMA_VERSION = "1.0"
PARSER_VERSION = "resume-local-1.0"
LEVELS_VERSION = "lv-1.0"


class EvidenceSpan(BaseModel):
    start: int
    end: int


class Skill(BaseModel):
    skill_name: str
    category_code: str
    evidence: str = Field(max_length=200)
    confidence: Confidence = "medium"
    canonical_id: str | None = None
    level_hint: int | None = Field(default=None, ge=1, le=10)
    requirement: Literal["must", "nice"] | None = None
    section: str | None = None
    evidence_span: EvidenceSpan | None = None


class Candidate(BaseModel):
    name: str | None = None
    email: str | None = None
    phone: str | None = None
    links: list[str] = Field(default_factory=list)
    location: str | None = None


class Education(BaseModel):
    degree: str | None = None
    institution: str | None = None
    year: str | None = None
    score: str | None = None


class Experience(BaseModel):
    title: str | None = None
    org: str | None = None
    kind: Literal["internship", "job", "research", "volunteer", "freelance"] = "job"
    start: str | None = None
    end: str | None = None
    months: int | None = None
    highlights: list[str] = Field(default_factory=list)
    skills: list[str] = Field(default_factory=list)


class Project(BaseModel):
    name: str
    description: str = ""
    skills: list[str] = Field(default_factory=list)
    link: str | None = None


class Hackathon(BaseModel):
    name: str
    result: str | None = None
    year: str | None = None


class Certification(BaseModel):
    name: str
    issuer: str | None = None
    year: str | None = None


class CategoryLevelDetail(BaseModel):
    level: int = Field(ge=1, le=10)
    bloom: str
    confidence: Confidence
    basis: str
    points: float = 0.0
    evidence: list[str] = Field(default_factory=list)
    gate_applied: str | None = None


class ResumeMeta(BaseModel):
    schema_version: str = SCHEMA_VERSION
    parser_version: str = PARSER_VERSION
    levels_version: str = LEVELS_VERSION
    model: str = "local:rules+spacy+rapidfuzz"
    llm_calls: int = 0
    doc_sha256: str | None = None
    latency_ms: int = 0
    cached: bool = False
    layout: str = "single"
    ocr_used: bool = False
    page_count: int = 0
    sections_found: list[str] = Field(default_factory=list)
    ner_model: str | None = None
    warnings: list[str] = Field(default_factory=list)


class ResumeExtraction(BaseModel):
    """Role 2 output: ExtractedSkillList (source_type=resume) + structured fields."""

    source_type: Literal["resume"] = "resume"
    source_file: str
    company: None = None
    role: str | None = None
    skills: list[Skill] = Field(default_factory=list)
    document_id: str | None = None
    extraction_id: str | None = None
    category_levels: dict[str, int] = Field(default_factory=dict)
    category_level_details: dict[str, CategoryLevelDetail] = Field(default_factory=dict)
    candidate: Candidate = Field(default_factory=Candidate)
    education: list[Education] = Field(default_factory=list)
    experience: list[Experience] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    hackathons: list[Hackathon] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    achievements: list[str] = Field(default_factory=list)
    positions: list[str] = Field(default_factory=list)
    coursework: list[str] = Field(default_factory=list)
    summary: str | None = None
    field_confidence: dict[str, Confidence] = Field(default_factory=dict)
    sections: dict[str, str] = Field(default_factory=dict)
    meta: ResumeMeta = Field(default_factory=ResumeMeta)


class SkillLevel(BaseModel):
    """One entry of CandidateProfile.skill_levels (contract 3.4 + v1.1)."""

    level: int = Field(ge=1, le=10)
    source: Literal["resume_inferred", "self", "assessed"] = "resume_inferred"
    confidence: Confidence
    basis: str
    inferred_level: int | None = Field(default=None, ge=1, le=10)


class ProfileDraft(BaseModel):
    """A CandidateProfile pre-filled from a resume (contract 3.4). Not saved here:
    Role 3 owns candidate_profiles; this is the draft it starts from."""

    name: str | None = None
    email: str | None = None
    phone: str | None = None
    links: list[str] = Field(default_factory=list)
    education: str = ""
    education_details: list[Education] = Field(default_factory=list)
    skills: list[Skill] = Field(default_factory=list)
    hackathons: list[Hackathon] = Field(default_factory=list)
    internships: list[Experience] = Field(default_factory=list)
    certifications: list[Certification] = Field(default_factory=list)
    projects: list[Project] = Field(default_factory=list)
    preferred_roles: list[str] = Field(default_factory=list)
    cv_file: str | None = None
    skill_levels: dict[str, SkillLevel] = Field(default_factory=dict)
    resume_extraction_id: str | None = None
    schema_version: str = SCHEMA_VERSION


class ResumeRecord(BaseModel):
    """A stored resume, as returned by the /resumes routes."""

    resume_id: str
    user_id: str | None = None
    file_name: str
    sha256: str
    mime: str
    size_bytes: int
    parser_version: str
    created_at: str
    updated_at: str
    cached: bool = False
    extraction: ResumeExtraction | None = None


class ResumeList(BaseModel):
    items: list[ResumeRecord]
    total: int


class TextParseRequest(BaseModel):
    text: str = Field(min_length=1, max_length=200_000)
    source_file: str = "pasted.txt"


class LevelsRequest(BaseModel):
    extraction: dict[str, Any]
