"""
taxonomy.py
===========
Vendored from resume/src/resume_service/taxonomy.py (same data file, so JD and
resume skills share canonical ids for Role 5). JD-only skills are added from
data/taxonomy_jd.json. Keep the two copies in sync when the resume one changes.

Canonical skill list and the ways we look skills up:

* ``find_in_text(text)``: exact alias hits with word boundaries, for free text
  (experience bullets, project descriptions). Common English words such as
  "rest" or "spring" are *weak* aliases and only count in list-like sections.
* ``canonicalize(token)``: one token from a Skills line ("ReactJS", "Postgre SQL")
  -> canonical skill, using exact lookup first and rapidfuzz as the fallback.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from rapidfuzz import fuzz, process

DATA_FILE = Path(__file__).parent / "data" / "taxonomy.json"
JD_DATA_FILE = Path(__file__).parent / "data" / "taxonomy_jd.json"

# Aliases that are also everyday words (or hide inside other phrases). They only
# count where the resume is listing skills, never inside narrative text.
WEAK_ALIASES = frozenset({
    "rest", "cache", "cloud", "render", "spring", "express", "oracle", "cat", "gate", "jee", "solid",
    "sprint", "sprints", "rails", "heap", "heaps", "ts", "js", "dp", "rag", "mcp", "claude", "gemini",
    "cursor", "debate", "english", "routing", "switching", "threads", "testing", "apache", "excel",
    "regression", "classification", "clustering", "sorting", "recursion", "abstraction", "inheritance",
    "encapsulation", "polymorphism", "transactions", "joins", "indexing", "monitoring", "scalable",
    "consensus", "real-time", "sse", "qa", "lambda", "hive", "spark", "collaboration", "teamwork",
    "team player", "leadership", "mentoring", "mentored", "documentation", "presentations",
    "mathematics", "statistics", "probability", "problem solving", "problem-solving", "kernel",
    "firewall", "swift", "communication", "communication skills", "cdn", "copilot", "agentic",
    "embeddings", "banking", "payments", "finance domain", "paging", "sockets", "eda",
    "ml", "solid principles", "flutter", "canva", "analytical thinking", "critical thinking", "gan",
})

LIST_SECTIONS = frozenset({"skills", "coursework", "certifications", "header", "summary"})

FUZZY_CUTOFF = 88


@dataclass(frozen=True)
class SkillDef:
    id: str
    name: str
    category: str
    aliases: tuple[str, ...]
    case_sensitive: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True)
class SkillHit:
    skill: SkillDef
    alias: str
    start: int
    end: int
    weak: bool


def _boundary_pattern(alias: str) -> str:
    # \b breaks on "c++", "c#", ".net" and "node.js", so spell the boundaries out.
    return r"(?<![A-Za-z0-9+#])" + re.escape(alias) + r"(?![A-Za-z0-9+#]|\.[A-Za-z0-9])"


class Taxonomy:
    def __init__(self, skills: list[SkillDef], version: str) -> None:
        self.version = version
        self.skills = skills
        self.by_id = {s.id: s for s in skills}
        self._alias_to_skill: dict[str, SkillDef] = {}
        for s in skills:
            # "Go", "C" and "R" are only matched case-sensitively, never as the words go/c/r
            names = () if s.name in s.case_sensitive else (s.name.lower(),)
            for a in (*names, *s.aliases):
                self._alias_to_skill.setdefault(a.lower(), s)
        # Longest aliases first so "spring boot" wins over "spring".
        ci = sorted(self._alias_to_skill, key=len, reverse=True)
        self._ci_regex = re.compile("|".join(f"(?P<a{i}>{_boundary_pattern(a)})" for i, a in enumerate(ci)),
                                    re.IGNORECASE)
        self._ci_aliases = ci
        cs_items = [(a, s) for s in skills for a in s.case_sensitive]
        self._cs_skill = dict(cs_items)
        self._cs_regex = (
            re.compile("|".join(_boundary_pattern(a) for a, _ in cs_items)) if cs_items else None)
        self._choices = list(self._alias_to_skill)

    def find_in_text(self, text: str, section: str = "other") -> list[SkillHit]:
        """All skill mentions in ``text``. Weak aliases are dropped outside list sections."""
        allow_weak = section in LIST_SECTIONS
        hits: list[SkillHit] = []
        for m in self._ci_regex.finditer(text):
            alias = self._ci_aliases[int(m.lastgroup[1:])]  # type: ignore[index]
            weak = alias in WEAK_ALIASES
            if weak and not allow_weak:
                continue
            hits.append(SkillHit(self._alias_to_skill[alias], m.group(0), m.start(), m.end(), weak))
        if self._cs_regex is not None:
            for m in self._cs_regex.finditer(text):
                word = m.group(0)
                # "Go", "C" and "R" alone count in a list ("C, C++, Java") or after "in/with/using"
                # ("a pipeline in Go"), never as the words go / grade C.
                lead_in = bool(_LANG_LEAD.search(text[max(0, m.start() - 14):m.start()]))
                if lead_in or (allow_weak and _is_list_item(text, m.start(), m.end())):
                    hits.append(SkillHit(self._cs_skill[word], word, m.start(), m.end(), True))
        hits.sort(key=lambda h: h.start)
        return hits

    def lookup(self, token: str) -> SkillDef | None:
        return self._alias_to_skill.get(token.strip().lower()) or self._cs_skill.get(token.strip())

    def canonicalize(self, token: str) -> tuple[SkillDef | None, str]:
        """Map one listed token to a skill. Returns (skill or None, method)."""
        t = token.strip()
        if not t:
            return None, "none"
        exact = self.lookup(t)
        if exact:
            return exact, "exact"
        compact = re.sub(r"[\s.\-_]", "", t.lower())
        for alias, skill in self._alias_to_skill.items():
            if re.sub(r"[\s.\-_]", "", alias) == compact:
                return skill, "alias"
        if len(t) < 4:  # fuzzy on "Go" or "ML" would match anything
            return None, "none"
        best = process.extractOne(t.lower(), self._choices, scorer=fuzz.WRatio, score_cutoff=FUZZY_CUTOFF)
        if best and abs(len(best[0]) - len(t)) <= max(3, len(t) // 2):
            return self._alias_to_skill[best[0]], "fuzzy"
        return None, "none"


_LANG_LEAD = re.compile(r"(?:\bin|\bwith|\busing|\band|[,/(|])\s*$")


def _is_list_item(text: str, start: int, end: int) -> bool:
    before = text[max(0, start - 2):start]
    after = text[end:end + 2]
    left_ok = start == 0 or any(c in before for c in ",:|;•/(\n") or before.endswith(" ") and (
        start < 2 or text[start - 2] in ",:|;")
    right_ok = end == len(text) or after[:1] in {",", "|", ";", "/", ")", "\n", ""} or after.startswith(" ,")
    return bool(left_ok and right_ok)


@lru_cache(maxsize=1)
def get_taxonomy() -> Taxonomy:
    raw = json.loads(DATA_FILE.read_text(encoding="utf-8"))
    extra = json.loads(JD_DATA_FILE.read_text(encoding="utf-8"))
    skills = [
        SkillDef(id=s["id"], name=s["name"], category=s["cat"],
                 aliases=tuple(a.lower() for a in s["aliases"]), case_sensitive=tuple(s.get("cs", [])))
        for s in [*raw["skills"], *extra["skills"]]
    ]
    return Taxonomy(skills, f'{raw["version"]}+{extra["version"]}')


def slugify(name: str) -> str:
    return re.sub(r"[^a-z0-9+#]+", "-", name.lower()).strip("-") or "skill"
