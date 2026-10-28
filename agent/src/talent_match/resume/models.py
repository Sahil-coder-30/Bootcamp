"""
models.py
=========
Internal data models for Role 2: Resume Parsing pipeline.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

SectionName = Literal[
    "header",
    "summary",
    "education",
    "experience",
    "projects",
    "skills",
    "certifications",
    "hackathons",
    "achievements",
    "positions",
    "publications",
    "coursework",
    "other",
]


class Line(BaseModel):
    text: str
    page: int = 1
    x0: float = 0.0
    y0: float = 0.0
    x1: float = 0.0
    y1: float = 0.0
    font_size: float = 10.0
    is_bold: bool = False
    is_caps: bool = False
    docx_style: str | None = None


class Block(BaseModel):
    lines: list[Line] = Field(default_factory=list)
    x0: float = 0.0
    y0: float = 0.0
    x1: float = 0.0
    y1: float = 0.0
    page: int = 1

    @property
    def width(self) -> float:
        return max(0.0, self.x1 - self.x0)

    @property
    def height(self) -> float:
        return max(0.0, self.y1 - self.y0)


class Section(BaseModel):
    name: SectionName
    heading_text: str = ""
    lines: list[Line] = Field(default_factory=list)

    @property
    def raw_text(self) -> str:
        return "\n".join(line.text for line in self.lines)


class Contact(BaseModel):
    name: str = "Candidate"
    email: str | None = None
    phone: str | None = None
    links: list[str] = Field(default_factory=list)
    confidence: Literal["high", "medium", "low"] = "high"


class Rank(BaseModel):
    platform: str
    rank_val: str
    badge: str | None = None
    raw_text: str


class RawSkill(BaseModel):
    skill_name: str
    category_code: str
    evidence: str
    line_no: int = 0
    confidence: Literal["high", "medium", "low"] = "high"
    section: str = "skills"


class ResumeOptions(BaseModel):
    use_llm: bool = True
    mode: Literal["sectioned", "single"] = "sectioned"
    level_review: bool = False
    ocr: bool = False
