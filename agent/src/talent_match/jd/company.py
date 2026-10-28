"""
company.py
==========
JD company name -> companies.company_id (plan 3.10). The backend passes the
company list, so the agent stays DB-free. Pinned aliases keep Oracle FSS (24)
apart from Oracle India (3).
"""

from __future__ import annotations

import re

from pydantic import BaseModel
from rapidfuzz import fuzz, process

GOOGLE, MICROSOFT, ORACLE_FSS = 4, 78, 24
_LEGAL = re.compile(r"\b(llc|inc|incorporated|corporation|corp|ltd|limited|pvt|private|plc|co)\b\.?", re.I)


class CompanyRef(BaseModel):
    company_id: int
    name: str


def _strip(name: str) -> str:
    name = re.sub(r"\([^)]*\)", " ", name)
    name = _LEGAL.sub(" ", name.lower())
    return re.sub(r"[^a-z0-9& ]+", " ", re.sub(r"\s+", " ", name)).strip()


def _pinned(name: str, head: str, full_text: str) -> int | None:
    blob = f"{name}\n{head}".lower()
    if re.search(r"oracle financial services|\bofss\b|oracle fss", blob):
        return ORACLE_FSS
    if "oracle" in name.lower() and "financial services" in full_text.lower():
        return ORACLE_FSS
    n = name.lower()
    if re.search(r"\b(google|alphabet)\b", n):
        return GOOGLE
    if re.search(r"\bmicrosoft\b", n):
        return MICROSOFT
    if not name:
        if re.search(r"\b(google|alphabet)\b", head.lower()):
            return GOOGLE
        if re.search(r"\bmicrosoft\b", head.lower()):
            return MICROSOFT
    return None


def resolve_company(
    llm_company: str | None, text: str, companies: list[CompanyRef], company_id: int | None = None
) -> tuple[int | None, str | None, str]:
    """Returns (company_id, display name, method)."""
    by_id = {c.company_id: c.name for c in companies}
    if company_id is not None:
        return company_id, by_id.get(company_id, llm_company), "request"
    name = (llm_company or "").strip()
    pinned = _pinned(name, text[:600], text)
    if pinned is not None:
        return pinned, by_id.get(pinned, name or None), "pinned"
    if name and companies:
        choices = {c.company_id: _strip(c.name) for c in companies}
        best = process.extractOne(_strip(name), choices, scorer=fuzz.token_set_ratio, score_cutoff=88)
        if best:
            return int(best[2]), by_id[int(best[2])], "fuzzy"
    return None, name or None, "unresolved"
