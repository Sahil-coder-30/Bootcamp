"""
schema.py
=========
What the LLM returns for a JD (plan 3.4). Richer than the contract on purpose:
postprocess.py turns it into contract ``Skill`` objects.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator

CATEGORY_CODES = ("COD", "DSA", "APTI", "COMM", "OOD", "AI", "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS")
ALL_CODES = (*CATEGORY_CODES, "OTHER")


class LlmSkill(BaseModel):
    skill_name: str = Field(max_length=80)
    category_code: str = "OTHER"
    evidence: str = Field(default="", max_length=400)
    line: int | None = None
    requirement: Literal["must", "nice"] = "must"
    strength: str | None = None
    explicit: bool = True

    @field_validator("category_code", mode="before")
    @classmethod
    def _code(cls, v: object) -> str:
        code = str(v or "").strip().upper()
        return code if code in ALL_CODES else "OTHER"

    @field_validator("requirement", mode="before")
    @classmethod
    def _req(cls, v: object) -> str:
        return "nice" if str(v or "").strip().lower() in {"nice", "preferred", "optional"} else "must"

    @field_validator("line", mode="before")
    @classmethod
    def _line(cls, v: object) -> int | None:
        # models answer 14, "14" or "L014"
        if v is None:
            return None
        digits = "".join(ch for ch in str(v) if ch.isdigit())
        return int(digits) if digits else None


class JdLlmOutput(BaseModel):
    company: str | None = None
    role: str | None = None
    location: str | None = None
    seniority: Literal["intern", "fresher", "junior", "mid", "senior", "staff"] | None = None
    years_min: float | None = None
    skills: list[LlmSkill] = Field(min_length=1, max_length=80)

    @field_validator("seniority", mode="before")
    @classmethod
    def _seniority(cls, v: object) -> str | None:
        s = str(v or "").strip().lower()
        return s if s in {"intern", "fresher", "junior", "mid", "senior", "staff"} else None

    @field_validator("years_min", mode="before")
    @classmethod
    def _years(cls, v: object) -> float | None:
        try:
            return float(v) if v not in (None, "") else None
        except (TypeError, ValueError):
            return None
