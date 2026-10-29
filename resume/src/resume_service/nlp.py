"""
nlp.py
======
Local spaCy NER (``en_core_web_sm``, bundled into the Docker image at build time).
Used for the candidate's name, organisation names and locations. If the model is
not installed the service still works: callers fall back to heuristics and the
response carries ``meta.ner_model = null``.
"""

from __future__ import annotations

import logging
import os
import re
from functools import lru_cache
from typing import Any

from .contract import Confidence

logger = logging.getLogger("resume.nlp")

DEFAULT_MODEL = "en_core_web_sm"


@lru_cache(maxsize=1)
def get_nlp() -> Any | None:
    name = os.getenv("RESUME_SPACY_MODEL", DEFAULT_MODEL)
    if name.lower() in {"", "none", "off"}:
        return None
    try:
        import spacy

        return spacy.load(name, disable=["lemmatizer", "textcat"])
    except Exception as exc:  # model missing or broken: run on heuristics
        logger.warning("spaCy model %s unavailable (%s); using heuristics only", name, exc)
        return None


def model_name() -> str | None:
    nlp = get_nlp()
    if nlp is None:
        return None
    return f"spacy:{nlp.meta.get('name', 'model')}-{nlp.meta.get('version', '')}"


_NAME_TOKEN = re.compile(r"^[A-Z][a-zA-Z'\-]+\.?$|^[A-Z]\.?$")
_NOT_NAME = re.compile(
    r"resume|curriculum|vitae|\bcv\b|engineer|developer|student|intern|address|phone|email|linkedin|github|"
    r"objective|summary|profile|contact|b\.?tech|bachelor|university|institute|college", re.IGNORECASE)


def _heuristic_name(lines: list[str]) -> str | None:
    for line in lines[:6]:
        cand = re.split(r"[|,•·]| {3,}| - ", line)[0].strip()
        if not cand or _NOT_NAME.search(cand) or any(c.isdigit() for c in cand) or "@" in cand:
            continue
        toks = cand.split()
        if 2 <= len(toks) <= 4 and all(_NAME_TOKEN.match(t) or t.isupper() for t in toks):
            return " ".join(t.capitalize() if t.isupper() and len(t) > 1 else t for t in toks)
    return None


def find_name(header_lines: list[str], email: str | None) -> tuple[str | None, Confidence]:
    """Candidate name from the resume header. Returns (name, confidence)."""
    name = _heuristic_name(header_lines)
    nlp = get_nlp()
    if name is None and nlp is not None:
        doc = nlp("\n".join(header_lines[:6]))
        persons = [e.text.strip() for e in doc.ents if e.label_ == "PERSON" and 2 <= len(e.text.split()) <= 4]
        persons = [p for p in persons if not _NOT_NAME.search(p) and not any(c.isdigit() for c in p)]
        if persons:
            name = persons[0]
    if name is None:
        return None, "low"
    if email:
        local = re.sub(r"[^a-z]", "", email.split("@")[0].lower())
        parts = [p.lower() for p in name.split() if len(p) > 1]
        if any(p in local for p in parts):
            return name, "high"
    return name, "medium"


def find_orgs(text: str) -> list[str]:
    nlp = get_nlp()
    if nlp is None:
        return []
    return [e.text.strip() for e in nlp(text).ents if e.label_ == "ORG"]


def find_location(text: str) -> str | None:
    nlp = get_nlp()
    if nlp is None:
        return None
    for e in nlp(text).ents:
        if e.label_ == "GPE":
            return e.text.strip()
    return None
