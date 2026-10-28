"""
sections.py
===========
Section segmentation using heading style candidates and rapidfuzz fuzzy lexicon matching.
"""

from __future__ import annotations

import re

from rapidfuzz import fuzz

from talent_match.resume.models import Line, Section, SectionName

HEADING_LEXICON: dict[SectionName, tuple[str, ...]] = {
    "summary": (
        "summary",
        "profile",
        "professional summary",
        "career objective",
        "objective",
        "about me",
        "executive summary",
        "overview",
    ),
    "education": (
        "education",
        "academic background",
        "academics",
        "qualifications",
        "scholastic achievements",
        "educational qualifications",
        "academic credentials",
    ),
    "experience": (
        "experience",
        "work experience",
        "internships",
        "internship",
        "professional experience",
        "employment",
        "industry experience",
        "work history",
        "practical experience",
    ),
    "projects": (
        "projects",
        "academic projects",
        "personal projects",
        "key projects",
        "technical projects",
        "selected projects",
        "engineering projects",
    ),
    "skills": (
        "skills",
        "technical skills",
        "tech stack",
        "tools and technologies",
        "core competencies",
        "skill set",
        "technical proficiencies",
        "programming skills",
        "technologies",
        "key skills",
    ),
    "certifications": (
        "certifications",
        "certificates",
        "licenses",
        "courses",
        "online courses",
        "credentials",
        "professional certifications",
    ),
    "hackathons": (
        "hackathons",
        "competitions",
        "coding competitions",
        "contests",
        "hackathon participations",
        "competitive coding",
    ),
    "achievements": (
        "achievements",
        "awards",
        "honors",
        "accomplishments",
        "scholarships",
        "honours and awards",
        "academic achievements",
    ),
    "positions": (
        "positions of responsibility",
        "leadership",
        "extracurricular",
        "volunteering",
        "activities",
        "extra curricular activities",
        "co curricular",
    ),
    "publications": (
        "publications",
        "research",
        "papers",
        "conference proceedings",
        "journal articles",
        "patents",
    ),
    "coursework": (
        "relevant coursework",
        "coursework",
        "subjects",
        "core subjects",
    ),
    "other": (
        "languages",
        "interests",
        "hobbies",
        "declaration",
        "references",
    ),
}


def classify_heading(line: Line, body_size: float = 10.0) -> SectionName | None:
    """Classify if a line is a section heading candidate using style + rapidfuzz."""
    text = line.text.strip()
    if not text:
        return None

    words = text.split()
    # Heading candidates must be short, not end in a full period (unless bullet prefix)
    if len(words) > 5 or (text.endswith(".") and len(words) > 2):
        return None

    # Must possess at least one heading style signal
    is_candidate_style = (
        line.is_bold
        or line.font_size >= (body_size + 1.0)
        or line.is_caps
        or text.endswith(":")
        or bool(line.docx_style and any(h in line.docx_style.lower() for h in ("heading", "title")))
    )
    if not is_candidate_style:
        return None

    clean_text = re.sub(r"[:\-&/•#]", " ", text).strip().lower()
    if not clean_text:
        return None

    # Match against heading lexicon
    best_section: SectionName | None = None
    best_score = 0.0

    for section_name, variants in HEADING_LEXICON.items():
        for variant in variants:
            # Exact match check
            if clean_text == variant:
                return section_name
            # Strict token similarity
            score = fuzz.token_sort_ratio(clean_text, variant)
            if score > best_score:
                best_score = score
                best_section = section_name

    # Require >= 80 similarity
    if best_score >= 80.0:
        return best_section

    return None


def segment(lines: list[Line]) -> list[Section]:
    """Segment document lines into canonical section chunks."""
    if not lines:
        return []

    # Calculate median body font size
    sizes = sorted(ln.font_size for ln in lines)
    median_size = sizes[len(sizes) // 2] if sizes else 10.0

    sections: list[Section] = []
    current_name: SectionName = "header"
    current_heading = "Header"
    current_lines: list[Line] = []

    for line in lines:
        heading_type = classify_heading(line, median_size)
        if heading_type:
            # Save prior section if it has content
            if current_lines:
                sections.append(Section(name=current_name, heading_text=current_heading, lines=current_lines))
            current_name = heading_type
            current_heading = line.text.strip()
            current_lines = []
        else:
            current_lines.append(line)

    if current_lines:
        sections.append(Section(name=current_name, heading_text=current_heading, lines=current_lines))

    return sections
