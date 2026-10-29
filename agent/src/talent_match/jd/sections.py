"""
sections.py
===========
Parsed JD lines -> one normalised text plus sections with char offsets
(plan 3.2-3.3). Offsets always point into ``StructuredDocument.text``, the
string the backend stores in ``documents.text``, so evidence spans can be
highlighted directly in the UI.
"""

from __future__ import annotations

import re
import statistics
from typing import Literal

from pydantic import BaseModel, Field
from rapidfuzz import fuzz

from talent_match.documents import Line, ParsedDocument

PARSER_VERSION = "doc-1.0"

SectionKind = Literal[
    "responsibilities",
    "requirements",
    "skills",
    "projects",
    "experience",
    "education",
    "certifications",
    "other",
]
SIGNAL_KINDS = frozenset({"responsibilities", "requirements", "skills"})

# (kind, requirement_hint, drop_before_llm, headings)
_HEADINGS: list[tuple[str, str | None, bool, tuple[str, ...]]] = [
    (
        "responsibilities",
        "must",
        False,
        (
            "key responsibilities",
            "responsibilities",
            "what you'll do",
            "what you will do",
            "the role",
            "your impact",
            "day to day",
            "job responsibilities",
            "role and responsibilities",
            "roles and responsibilities",
            "duties",
            "what you will be doing",
        ),
    ),
    (
        "requirements",
        "nice",
        False,
        (
            "preferred qualifications",
            "preferred skills",
            "nice to have",
            "good to have",
            "bonus points",
            "desired skills",
            "additional qualifications",
            "preferred",
            "it would be great if you have",
            "bonus",
            "plus points",
        ),
    ),
    (
        "requirements",
        "must",
        False,
        (
            "what we're looking for",
            "what we are looking for",
            "minimum qualifications",
            "basic qualifications",
            "requirements",
            "qualifications",
            "who you are",
            "required skills",
            "must have",
            "must haves",
            "eligibility criteria",
            "you should have",
            "what you need",
            "required qualifications",
            "job requirements",
            "skills and qualifications",
        ),
    ),
    (
        "skills",
        "must",
        False,
        (
            "technical skills",
            "skills",
            "tech stack",
            "tools",
            "key skills",
            "skills required",
            "technology stack",
            "primary skills",
            "mandatory skills",
        ),
    ),
    ("education", "must", False, ("education", "eligibility", "educational qualification")),
    (
        "other",
        None,
        True,
        (
            "benefits",
            "perks",
            "perks and benefits",
            "equal opportunity",
            "eeo",
            "how to apply",
            "why join us",
            "what we offer",
            "compensation",
            "salary",
            "equal employment opportunity",
        ),
    ),
    (
        "other",
        None,
        False,
        (
            "about us",
            "about the team",
            "about the role",
            "overview",
            "location",
            "about the company",
            "company overview",
            "job summary",
            "role overview",
            "who we are",
            "position summary",
            "job description",
        ),
    ),
]


def _norm_heading(s: str) -> str:
    s = s.replace("’", "'").lower()
    s = re.sub(r"[^a-z0-9' ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


_HEADING_INDEX = [(_norm_heading(h), kind, hint, drop) for kind, hint, drop, hs in _HEADINGS for h in hs]


def match_heading(text: str) -> tuple[str, str | None, bool] | None:
    """Known JD heading -> (kind, requirement_hint, drop). Fuzzy ratio >= 85."""
    norm = _norm_heading(text)
    if not norm or len(norm) > 60:
        return None
    best: tuple[int, tuple[str, str | None, bool]] | None = None
    for h, kind, hint, drop in _HEADING_INDEX:
        score = 100 if norm == h else fuzz.ratio(norm, h)
        if score >= 85 and (best is None or score > best[0]):
            best = (int(score), (kind, hint, drop))
    return best[1] if best else None


class Section(BaseModel):
    kind: SectionKind
    label: str
    requirement_hint: Literal["must", "nice"] | None = None
    start: int
    end: int
    page_start: int = 1
    page_end: int = 1
    signal: bool = False
    drop: bool = False  # boilerplate (benefits, EEO): never sent to the LLM


class StructuredDocument(BaseModel):
    text: str
    page_count: int
    pages: list[tuple[int, int]] = Field(default_factory=list)
    sections: list[Section] = Field(default_factory=list)
    layout: str = "single"
    parser_version: str = PARSER_VERSION
    warnings: list[str] = Field(default_factory=list)


def _is_heading_like(line: Line, body_size: float) -> bool:
    t = line.text
    if t.startswith("- ") or len(t) > 60 or t.endswith("."):
        return False
    if line.style and line.style.lower().startswith(("heading", "title")):
        return True
    return line.bold or line.size >= 1.15 * body_size


def structure(doc: ParsedDocument) -> StructuredDocument:
    """Lines -> text with offsets, page spans and sections."""
    body_size = statistics.median([ln.size for ln in doc.lines]) if doc.lines else 11.0
    text_parts: list[str] = []
    pos = 0
    pages: dict[int, list[int]] = {}
    # (line_start, kind, hint, drop, label, page)
    opens: list[tuple[int, str, str | None, bool, str, int]] = []
    for ln in doc.lines:
        start = pos
        page = ln.page + 1
        span = pages.setdefault(page, [start, start])
        text_parts.append(ln.text)
        pos += len(ln.text) + 1
        span[1] = pos - 1

        head = ln.text.rstrip(":").strip()
        hit = match_heading(head)
        if hit is None and ":" in ln.text[:45]:
            # inline heading: "Requirements: Python, Java"
            hit = match_heading(ln.text.split(":", 1)[0])
        if hit is not None and not ln.text.startswith("- "):
            opens.append((start, hit[0], hit[1], hit[2], head[:80], page))
        elif _is_heading_like(ln, body_size) and opens:
            # unknown heading (bold / big) closes the previous section
            opens.append((start, "other", None, False, head[:80], page))

    text = "\n".join(text_parts)
    sections: list[Section] = []
    for i, (start, kind, hint, drop, label, page) in enumerate(opens):
        end = opens[i + 1][0] - 1 if i + 1 < len(opens) else len(text)
        sections.append(
            Section(
                kind=kind,
                label=label,
                requirement_hint=hint,
                start=start,
                end=max(start, end),
                page_start=page,
                page_end=page_of(pages, max(start, end - 1)),
                signal=kind in SIGNAL_KINDS,
                drop=drop,
            )
        )
    if sections and sections[0].start > 0:
        # intro text before the first heading (title, company blurb) is context
        sections.insert(0, Section(kind="other", label="Introduction", start=0, end=sections[0].start - 1))
    if not sections:
        sections = [Section(kind="other", label="Full text", start=0, end=len(text))]

    warnings = list(doc.warnings)
    if not any(s.signal for s in sections):
        warnings.append("no_signal_sections")
    return StructuredDocument(
        text=text,
        page_count=doc.page_count,
        pages=[(s, e) for _, (s, e) in sorted(pages.items())],
        sections=sections,
        layout=doc.layout,
        warnings=warnings,
    )


def page_of(pages: dict[int, list[int]], offset: int) -> int:
    for page, (s, e) in pages.items():
        if s <= offset <= e:
            return page
    return max(pages) if pages else 1


def section_at(sections: list[Section], offset: int) -> Section | None:
    for s in sections:
        if s.start <= offset <= s.end:
            return s
    return None
