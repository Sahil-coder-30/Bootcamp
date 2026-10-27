"""
schemas.py
==========
Pydantic v2 models — the FIRST validation gate in the Level 5 pipeline (shape /
type validation, before the data-quality rules and the database).

* GoldenRow      — one consolidated parameter; value must be non-empty.
* GoldenRecord   — a full record; must carry exactly 163 unique parameter ids.
* SkillMatrixRow — the 12 Bloom-coded skill columns ("5-AP" form).
* HiringRounds — a lenient envelope mirroring the hiring JSON prompt output.
"""

import re

from pydantic import BaseModel, ConfigDict, field_validator

_SKILL_CODE = re.compile(r"^\d{1,2}-(CU|AP|AS|EV|CR)$")

SKILL_COLUMNS = [
    "coding", "data_structures_and_algorithms",
    "object_oriented_programming_and_design", "aptitude_and_problem_solving",
    "communication_skills", "ai_native_engineering", "devops_and_cloud",
    "sql_and_design", "software_engineering", "system_design_and_architecture",
    "computer_networking", "operating_system",
]


class GoldenRow(BaseModel):
    id: int
    parameter: str
    value: str

    @field_validator("value")
    @classmethod
    def value_not_empty(cls, v: str) -> str:
        if not str(v).strip():
            raise ValueError("value must not be empty")
        return v


class GoldenRecord(BaseModel):
    rows: list[GoldenRow]

    @field_validator("rows")
    @classmethod
    def exactly_163_unique(cls, rows: list[GoldenRow]) -> list[GoldenRow]:
        ids = {r.id for r in rows}
        if len(ids) != 163:
            raise ValueError(f"expected 163 unique parameter ids, got {len(ids)}")
        return rows


class SkillMatrixRow(BaseModel):
    companies: str
    coding: str | None = None
    data_structures_and_algorithms: str | None = None
    object_oriented_programming_and_design: str | None = None
    aptitude_and_problem_solving: str | None = None
    communication_skills: str | None = None
    ai_native_engineering: str | None = None
    devops_and_cloud: str | None = None
    sql_and_design: str | None = None
    software_engineering: str | None = None
    system_design_and_architecture: str | None = None
    computer_networking: str | None = None
    operating_system: str | None = None

    @field_validator(*SKILL_COLUMNS)
    @classmethod
    def valid_skill_code(cls, v: str | None) -> str | None:
        if v is None or not str(v).strip():
            return v
        if not _SKILL_CODE.match(str(v).strip()):
            raise ValueError(f"invalid skill code {v!r} (expected like '5-AP')")
        return v


class HiringRounds(BaseModel):
    model_config = ConfigDict(extra="allow")
    company_name: str
    job_role_details: list
