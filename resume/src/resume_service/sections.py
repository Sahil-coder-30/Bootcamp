"""
sections.py
===========
Split resume lines into canonical sections (plan 3.3): a heading candidate is a
short line that looks like a heading (bold, bigger font, ALL CAPS, trailing ":"
or a Heading style), and its text must fuzzy-match the heading lexicon.
"""

from __future__ import annotations

import re
import statistics
from dataclasses import dataclass, field

from rapidfuzz import fuzz

from .documents import Line

HEADINGS: dict[str, tuple[str, ...]] = {
    "summary": ("summary", "profile", "professional summary", "objective", "career objective", "about me",
                "about", "profile summary", "career summary"),
    "education": ("education", "academic background", "academics", "qualifications", "academic qualifications",
                  "educational qualifications", "scholastic", "education details"),
    "experience": ("experience", "work experience", "internships", "internship", "internship experience",
                   "professional experience", "employment", "employment history", "industry experience",
                   "work history", "relevant experience"),
    "projects": ("projects", "academic projects", "personal projects", "key projects", "technical projects",
                 "major projects", "selected projects", "project work", "projects undertaken"),
    "skills": ("skills", "technical skills", "tech stack", "tools and technologies", "core competencies",
               "skill set", "skills summary", "technologies", "key skills", "technical proficiency",
               "programming languages", "areas of expertise", "soft skills"),
    "certifications": ("certifications", "certificates", "licenses", "courses", "online courses",
                       "certifications and courses", "trainings", "training"),
    "hackathons": ("hackathons", "competitions", "coding competitions", "contests", "competitive programming",
                   "coding profiles"),
    "achievements": ("achievements", "awards", "honors", "honours", "accomplishments", "scholarships",
                     "awards and achievements", "achievements and awards"),
    "positions": ("positions of responsibility", "leadership", "extracurricular", "extra curricular",
                  "extracurricular activities", "volunteering", "volunteer experience", "activities",
                  "co-curricular activities", "clubs"),
    "publications": ("publications", "research", "papers", "research papers", "research experience"),
    "coursework": ("relevant coursework", "coursework", "subjects", "core subjects", "courses taken"),
    "other": ("languages", "interests", "hobbies", "declaration", "references", "personal details",
              "personal information", "additional information"),
}

_LEXICON = [(v, k) for k, vs in HEADINGS.items() for v in vs]
HEADING_MATCH = 88


@dataclass
class Section:
    name: str
    heading: str
    lines: list[Line] = field(default_factory=list)

    @property
    def text(self) -> str:
        return "\n".join(ln.text for ln in self.lines)


def _norm_heading(text: str) -> str:
    t = text.lower().strip().rstrip(":").strip()
    t = re.sub(r"[&/|]", " and ", t)
    t = re.sub(r"[^a-z\- ]", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def classify_heading(text: str) -> str | None:
    t = _norm_heading(text)
    if not t or len(t) > 45:
        return None
    best_score, best = 0.0, None
    for variant, canon in _LEXICON:
        score = 100.0 if t == variant else fuzz.ratio(t, variant)
        if score > best_score:
            best_score, best = score, canon
    # "Technical Skills & Tools" style: every word belongs to a heading vocabulary
    if best_score < HEADING_MATCH:
        for variant, canon in _LEXICON:
            if fuzz.token_set_ratio(t, variant) >= 95 and len(t.split()) <= len(variant.split()) + 2:
                return canon
        return None
    return best


def looks_like_heading(line: Line, body_size: float) -> bool:
    text = line.text.strip()
    words = text.rstrip(":").split()
    if not words or len(words) > 5 or text.endswith(".") or text.startswith("- "):
        return False
    letters = [c for c in text if c.isalpha()]
    caps = bool(letters) and all(c.isupper() for c in letters)
    style = (line.style or "").lower()
    return (line.bold or line.size >= body_size + 1 or caps or text.endswith(":")
            or style.startswith("heading") or style == "title")


def split_sections(lines: list[Line]) -> tuple[list[Section], list[str]]:
    """Returns sections in document order (first one is ``header``) and warnings."""
    sizes = [ln.size for ln in lines if len(ln.text) > 25] or [ln.size for ln in lines] or [11.0]
    body = statistics.median(sizes)
    sections = [Section("header", "")]
    found = 0
    for ln in lines:
        canon = None
        if ln.region != "header":
            # "Skills: Python, Java" is a heading and content on one line
            inline = re.match(r"^([A-Za-z &/]{3,40}):\s+(\S.*)$", ln.text)
            label = classify_heading(inline.group(1)) if inline and len(inline.group(1).split()) <= 4 else None
            # "Languages: Go, Java" inside Skills is a sub-label, not the spoken-languages section
            if inline and label and label != "other" and not (sections[-1].name == "skills" and label == "skills"):
                canon = label
                if canon != sections[-1].name:
                    sections.append(Section(canon, inline.group(1)))
                    found += 1
                sections[-1].lines.append(ln)
                continue
            if label:
                sections[-1].lines.append(ln)
                continue
            if looks_like_heading(ln, body) or (ln.size >= body and len(ln.text.split()) <= 4):
                canon = classify_heading(ln.text)
        if canon:
            found += 1
            sections.append(Section(canon, ln.text))
        else:
            sections[-1].lines.append(ln)
    warnings: list[str] = []
    if found < 2:
        warnings.append("segmentation_fallback")
    return sections, warnings


def merge_sections(sections: list[Section]) -> dict[str, str]:
    out: dict[str, str] = {}
    for s in sections:
        if not s.lines:
            continue
        out[s.name] = (out[s.name] + "\n" + s.text) if s.name in out else s.text
    return out
