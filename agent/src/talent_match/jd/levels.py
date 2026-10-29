"""
levels.py
=========
JD column of the shared evidence -> level rubric (plan 3.7). Deterministic:
seniority, phrase bands, years, nice-to-have discount, per-category level
clamped to the seniority band. Every fired rule is written to ``basis``.
"""

from __future__ import annotations

import re

from talent_match.jd.postprocess import Candidate, sentence_bounds

LEVELS_VERSION = "jdlv-1.0"

_SENIORITY = [
    ("intern", re.compile(r"\bintern(ship)?\b", re.I)),
    ("staff", re.compile(r"\b(staff|principal|lead architect)\b", re.I)),
    ("senior", re.compile(r"\b(senior|sr\.)", re.I)),
    (
        "fresher",
        re.compile(
            r"\b(associate|graduate|fresher|freshers|entry[- ]level|early career|new grad|"
            r"0\s*-\s*[12]\s*years?)\b",
            re.I,
        ),
    ),
]
DEFAULT_LEVEL = {"intern": 3, "fresher": 4, "junior": 5, "mid": 6, "senior": 7, "staff": 8}
BAND = {
    "intern": (2, 5),
    "fresher": (3, 6),
    "junior": (3, 7),
    "mid": (4, 8),
    "senior": (5, 9),
    "staff": (6, 10),
}

# (band label, default level, intensified level, pattern); strongest band wins
_PHRASES = [
    (
        "CR",
        9,
        10,
        re.compile(
            r"\b(architect(ing)?|define (standards|direction)|set technical direction|"
            r"principal|invent)\b",
            re.I,
        ),
    ),
    (
        "EV",
        7,
        8,
        re.compile(
            r"\b(design(ing)?|own(ership)?|lead|drive|mentor|review|deep (expertise|knowledge)|"
            r"expert(ise)?)\b",
            re.I,
        ),
    ),
    (
        "AS",
        5,
        6,
        re.compile(
            r"\b(strong|hands[- ]on|solid (understanding|grasp|knowledge)|proficien(t|cy)|"
            r"good command|debug(ging)?|optimi[sz]e|in[- ]depth)\b",
            re.I,
        ),
    ),
    (
        "AP",
        3,
        4,
        re.compile(
            r"\b(working knowledge|knowledge of|able to write|experience (with|in)|"
            r"coursework|academic projects?|understanding of)\b",
            re.I,
        ),
    ),
    (
        "CU",
        2,
        2,
        re.compile(
            r"\b(exposure to|awareness of|familiar(ity)? with|basic understanding|"
            r"nice to have|introductory|basics of)\b",
            re.I,
        ),
    ),
]
_INTENSIFIER = re.compile(r"\b(excellent|deep|extensive|advanced|expert)\b", re.I)
_YEARS = re.compile(r"(\d+(?:\.\d+)?)\s*\+?\s*(?:-|to)?\s*(\d+)?\s*\+?\s*(?:years?|yrs?)", re.I)


def detect_seniority(text: str, role: str | None, llm_seniority: str | None) -> tuple[str, str]:
    head = f"{role or ''}\n{text[:600]}"
    for name, pat in _SENIORITY:
        if pat.search(head):
            return name, f"regex:{name}"
    if llm_seniority:
        return llm_seniority, "llm"
    return "mid", "default"


def years_level(sentence: str) -> tuple[int | None, str]:
    m = _YEARS.search(sentence)
    if not m:
        return None, ""
    lo = float(m.group(1))
    if lo < 1:
        lvl = 4
    elif lo < 3:
        lvl = 6
    elif lo < 5:
        lvl = 7
    else:
        lvl = 8
    return lvl, f"{m.group(0).strip()} -> {lvl}"


def phrase_level(sentence: str) -> tuple[int | None, str]:
    intense = bool(_INTENSIFIER.search(sentence))
    for band, low, high, pat in _PHRASES:
        m = pat.search(sentence)
        if m:
            lvl = high if intense else low
            return lvl, f"{m.group(0).lower()} ({band}) -> {lvl}"
    return None, ""


def skill_level(c: Candidate, text: str, seniority: str) -> None:
    s, e = sentence_bounds(text, c.start, c.end)
    sentence = text[s:e]
    p_lvl, p_why = phrase_level(sentence)
    y_lvl, y_why = years_level(sentence)
    if c.strength:
        sp, sw = phrase_level(c.strength)
        if sp and (p_lvl is None or sp > p_lvl):
            p_lvl, p_why = sp, sw
    levels = [x for x in (p_lvl, y_lvl) if x]
    if levels:
        lvl = max(levels)
        why = " + ".join(w for w in (p_why, y_why) if w)
    else:
        lvl = DEFAULT_LEVEL[seniority]
        why = f"default {seniority} -> {lvl}"
    if c.requirement == "nice":
        lvl = max(2, lvl - 1)
        why += "; nice -1"
    c.level_hint = max(1, min(10, lvl))
    c.level_basis = why


def category_levels(cands: list[Candidate], seniority: str) -> tuple[dict[str, int], dict[str, str]]:
    lo, hi = BAND[seniority]
    levels: dict[str, int] = {}
    basis: dict[str, str] = {}
    by_cat: dict[str, list[Candidate]] = {}
    for c in cands:
        if c.category_code != "OTHER" and c.level_hint:
            by_cat.setdefault(c.category_code, []).append(c)
    for code, items in by_cat.items():
        musts = [c for c in items if c.requirement == "must"]
        pool = musts or items
        top = max(pool, key=lambda c: c.level_hint or 0)
        lvl = top.level_hint or 1
        why = f"max {'must' if musts else 'nice'} {top.skill_name}: {top.level_basis}"
        if sum(1 for c in musts if c.section and c.section.signal) >= 3:
            lvl += 1
            why += "; 3+ must skills +1"
        clamped = max(lo, min(hi, lvl))
        if clamped != lvl:
            why += f"; clamp {seniority} [{lo},{hi}]"
        levels[code] = clamped
        basis[code] = why
    return levels, basis
