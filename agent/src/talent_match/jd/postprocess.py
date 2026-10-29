"""
postprocess.py
==============
Deterministic pass 2 over the LLM skills (plan 3.5-3.6): clean and split,
evidence gate, taxonomy normalisation, category validation, must/nice,
confidence, dedupe. Every rule that changes something appends to ``trace``.
"""

from __future__ import annotations

import bisect
import re
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from talent_match.jd.schema import ALL_CODES, LlmSkill
from talent_match.jd.sections import Section, section_at
from talent_match.taxonomy import get_taxonomy, slugify

NICE_CUES = re.compile(
    r"\b(preferred|nice[- ]to[- ]have|a plus|plus point|bonus|ideally|good[- ]to[- ]have|"
    r"desirable|advantageous|added advantage)\b",
    re.IGNORECASE,
)
MUST_CUES = re.compile(r"\b(must|required|minimum|mandatory|essential)\b", re.IGNORECASE)
CONF_ORDER = ["low", "medium", "high"]

# Section kind -> contract Skill.section value
CONTRACT_SECTION = {
    "responsibilities": "responsibilities",
    "requirements": "requirements",
    "skills": "skills",
    "education": "education",
    "experience": "experience",
    "projects": "projects",
    "certifications": "certifications",
}


@dataclass
class Candidate:
    """One skill on its way to becoming a contract Skill."""

    skill_name: str
    category_code: str
    canonical_id: str
    evidence: str
    start: int
    end: int
    requirement: str
    confidence: str
    explicit: bool
    strength: str | None
    section: Section | None
    verify: str  # verified_exact | verified_fuzzy | weak | rebuilt | keyword
    taxonomy_method: str = "none"
    level_hint: int | None = None
    level_basis: str = ""
    providers: list[str] = field(default_factory=list)


# --- text helpers ---------------------------------------------------------------


def normalize_with_map(text: str) -> tuple[str, list[int]]:
    """casefold, every run of non [a-z0-9+#] -> one space; index map back to ``text``."""
    out: list[str] = []
    idx: list[int] = []
    space = True
    for i, ch in enumerate(text.lower()):
        if ch.isalnum() or ch in "+#":
            out.append(ch)
            idx.append(i)
            space = False
        elif not space:
            out.append(" ")
            idx.append(i)
            space = True
    while out and out[-1] == " ":
        out.pop()
        idx.pop()
    return "".join(out), idx


def _norm(s: str) -> str:
    return normalize_with_map(s)[0].strip()


def sentence_bounds(text: str, start: int, end: int) -> tuple[int, int]:
    """The line (bullet) or sentence around [start, end)."""
    nl, dot = text.rfind("\n", 0, start), text.rfind(". ", 0, start)
    s = max(nl + 1, dot + 2 if dot >= 0 else 0)
    if text.startswith("- ", s) and s + 2 <= start:
        s += 2
    ends = [i for i in (text.find("\n", end), text.find(". ", end)) if i >= 0]
    return s, min(ends) if ends else len(text)


def _trim(text: str, start: int, end: int, limit: int = 200) -> tuple[str, int, int]:
    if end - start > limit:
        end = start + limit
    return text[start:end].strip(), start, end


# --- evidence gate ----------------------------------------------------------------


@dataclass
class Located:
    start: int
    end: int
    method: str  # verified_exact | verified_fuzzy | weak | rebuilt


class EvidenceIndex:
    def __init__(self, text: str, line_starts: list[int]) -> None:
        self.text = text
        self.norm, self.idx = normalize_with_map(text)
        self.line_starts = line_starts  # char offset of L1, L2, ... (1-based lines)

    def _orig(self, ns: int, ne: int) -> tuple[int, int]:
        return self.idx[ns], self.idx[max(ns, ne - 1)] + 1

    def _window(self, line: int | None) -> tuple[int, int] | None:
        if not line or line < 1 or line > len(self.line_starts):
            return None
        s = self.line_starts[max(0, line - 2)]
        e = self.line_starts[line + 1] if line + 1 < len(self.line_starts) else len(self.text)
        return s, e

    def locate(self, evidence: str, line: int | None, skill_name: str) -> Located | None:
        ev = _norm(evidence)
        if len(ev) >= 3:
            # 1. exact, near the given line first
            win = self._window(line)
            if win:
                ns = bisect.bisect_left(self.idx, win[0])
                pos = self.norm.find(ev, ns)
                if pos >= 0 and self.idx[pos] <= win[1]:
                    return Located(*self._orig(pos, pos + len(ev)), "verified_exact")
            pos = self.norm.find(ev)
            if pos >= 0:
                return Located(*self._orig(pos, pos + len(ev)), "verified_exact")
            # 2. fuzzy alignment
            al = fuzz.partial_ratio_alignment(ev, self.norm)
            if al is not None and al.score >= 75 and al.dest_end > al.dest_start:
                s, e = self._orig(al.dest_start, al.dest_end)
                return Located(s, e, "verified_fuzzy" if al.score >= 90 else "weak")
        # 3. the skill name itself is in the text: rebuild evidence from its sentence
        name = _norm(skill_name)
        if len(name) >= 1:
            m = re.search(r"(?<![a-z0-9+#])" + re.escape(name) + r"(?![a-z0-9+#])", self.norm)
            if m:
                s, e = self._orig(m.start(), m.end())
                ss, se = sentence_bounds(self.text, s, e)
                return Located(ss, se, "rebuilt")
        return None


# --- the pass ---------------------------------------------------------------------

_SPLIT = re.compile(r"\s*(?:/|,|\bor\b|\band\b)\s*")


def _clean_name(name: str) -> str:
    name = re.sub(r"\s*\((?:[^)]*)\)\s*$", "", name.strip())  # "Python (3.x)"
    name = re.sub(r"\s+v?\d+(\.\d+)*\+?$", "", name)  # "Java 17", "Python 3"
    return name.strip(" .;:-")


def split_names(name: str) -> list[str]:
    """'Java/C++' -> ['Java', 'C++'] only when every part is a known skill."""
    parts = [p for p in _SPLIT.split(name) if p]
    if len(parts) < 2:
        return [name]
    tax = get_taxonomy()
    hits = [tax.canonicalize(p)[0] for p in parts]
    # "Data structures and algorithms" is one skill: split only into distinct known skills
    if all(h is not None for h in hits) and len({h.id for h in hits if h}) == len(parts):
        return parts
    return [name]


def _step_down(conf: str) -> str:
    return CONF_ORDER[max(0, CONF_ORDER.index(conf) - 1)]


def resolve_requirement(sentence: str, section: Section | None, llm_value: str) -> str:
    if NICE_CUES.search(sentence):
        return "nice"
    if MUST_CUES.search(sentence):
        return "must"
    if section is not None and section.requirement_hint:
        return section.requirement_hint
    return llm_value or "must"


def confidence_for(explicit: bool, verify: str, section: Section | None) -> str:
    in_signal = bool(section and section.signal)
    if not explicit:
        return "low"
    if verify in ("verified_exact", "verified_fuzzy"):
        return "high" if in_signal else "medium"
    if verify == "weak":
        return "medium" if in_signal else "low"
    return "medium"  # rebuilt


def process(
    llm_skills: list[LlmSkill],
    text: str,
    line_starts: list[int],
    sections: list[Section],
    trace: list[str],
    dropped: list[dict],
    new_skills: list[str],
) -> list[Candidate]:
    tax = get_taxonomy()
    index = EvidenceIndex(text, line_starts)
    out: list[Candidate] = []
    for raw in llm_skills:
        names = split_names(_clean_name(raw.skill_name)) or [raw.skill_name]
        if len(names) > 1:
            trace.append(f"split:{raw.skill_name}->{'|'.join(names)}")
        for name in names:
            if not name:
                continue
            loc = index.locate(raw.evidence, raw.line, name if len(names) > 1 else raw.skill_name)
            if loc is None and len(names) > 1:
                loc = index.locate(raw.evidence, raw.line, raw.skill_name)
            if loc is None:
                dropped.append(
                    {"skill_name": name, "reason": "unverified_evidence", "evidence": raw.evidence[:120]}
                )
                continue
            if loc.method == "rebuilt" and raw.evidence:
                trace.append(f"evidence_rebuilt:{name}")
            evidence, s, e = _trim(text, loc.start, loc.end)

            hit, method = tax.canonicalize(name)
            if hit is None:
                # "Cross-functional communication" -> communication, when exactly one known skill is inside
                inside = {h.skill.id: h.skill for h in tax.find_in_text(name, "other")}
                if len(inside) == 1:
                    hit, method = next(iter(inside.values())), "contains"
            if hit is not None:
                canonical_id, category = hit.id, hit.category
                if raw.category_code != category:
                    trace.append(f"category_override:{name}:{raw.category_code}->{category}")
            else:
                canonical_id = slugify(name)
                category = raw.category_code if raw.category_code in ALL_CODES else "OTHER"
                new_skills.append(canonical_id)

            section = section_at(sections, s)
            ss, se = sentence_bounds(text, s, e)
            requirement = resolve_requirement(text[ss:se], section, raw.requirement)
            if requirement != raw.requirement:
                trace.append(f"requirement:{name}:{raw.requirement}->{requirement}")
            out.append(
                Candidate(
                    skill_name=name[:80],
                    category_code=category,
                    canonical_id=canonical_id,
                    evidence=evidence,
                    start=s,
                    end=e,
                    requirement=requirement,
                    confidence=confidence_for(raw.explicit, loc.method, section),
                    explicit=raw.explicit,
                    strength=raw.strength,
                    section=section,
                    verify=loc.method,
                    taxonomy_method=method,
                )
            )
    return out


def dedupe(cands: list[Candidate], trace: list[str]) -> list[Candidate]:
    """One skill per name: must over nice, highest confidence, signal-section evidence."""
    best: dict[str, Candidate] = {}
    order: list[str] = []
    for c in cands:
        key = slugify(c.skill_name)
        cur = best.get(key)
        if cur is None:
            best[key] = c
            order.append(key)
            continue
        trace.append(f"merge:{c.skill_name}")
        if c.requirement == "must":
            cur.requirement = "must"
        if CONF_ORDER.index(c.confidence) > CONF_ORDER.index(cur.confidence):
            cur.confidence = c.confidence
        cur_signal = bool(cur.section and cur.section.signal)
        c_signal = bool(c.section and c.section.signal)
        if (c_signal and not cur_signal) or (c_signal == cur_signal and len(c.evidence) < len(cur.evidence)):
            cur.evidence, cur.start, cur.end, cur.section = c.evidence, c.start, c.end, c.section
        cur.explicit = cur.explicit or c.explicit
        cur.providers = sorted(set(cur.providers) | set(c.providers))
    return [best[k] for k in order]
