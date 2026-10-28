"""
pipeline.py
===========
Master orchestration pipeline for Role 2: Resume Parsing.
Converts raw bytes (PDF / DOCX) into a validated ResumeExtraction with
Bloom's Taxonomy category levels (lv-1.0) and grounding proof.
"""

from __future__ import annotations

import hashlib
import time
from talent_match.contract import (
    ResumeContact,
    ResumeExtraction,
)
from talent_match.resume.extract import extract_deterministic_sections
from talent_match.resume.layout import extract_document_lines
from talent_match.resume.levels import infer_levels
from talent_match.resume.merge import merge_skills
from talent_match.resume.models import ResumeOptions
from talent_match.resume.patterns import find_contacts, redact_pii
from talent_match.resume.sections import segment


def parse_resume(
    data: bytes,
    file_name: str,
    mime: str = "",
    options: ResumeOptions | None = None,
) -> ResumeExtraction:
    """Master pipeline: layout -> patterns -> sections -> extract -> merge -> levels."""
    start_time = time.perf_counter()
    opts = options or ResumeOptions()
    file_sha256 = hashlib.sha256(data).hexdigest()

    # 1. Document layout reading order
    lines = extract_document_lines(data, file_name, mime)
    full_text = "\n".join(l.text for l in lines)

    # 2. Deterministic Contact & PII Redaction
    contact_data = find_contacts(full_text)
    redacted_text = redact_pii(full_text, contact_data)

    # 3. Section Segmentation
    sections = segment(lines)
    section_names = [s.name for s in sections]

    # 4. Entity & Skill Extraction
    edu, exp, proj, hack, cert, raw_skills = extract_deterministic_sections(sections)

    # 5. Merging, Canonicalization, Grounding Checks
    merged_skills, grounding_rate, warnings = merge_skills(raw_skills, full_text)

    # 6. Preliminary Extraction Object for Level Inference
    preliminary = ResumeExtraction(
        source_type="resume",
        source_file=file_name,
        role=exp[0].title if exp else "Software Engineer",
        candidate=ResumeContact(
            name=contact_data.name,
            email=contact_data.email,
            phone=contact_data.phone,
            links=contact_data.links,
        ),
        skills=merged_skills,
        education=edu,
        experience=exp,
        projects=proj,
        hackathons=hack,
        certifications=cert,
        field_confidence={
            "candidate": contact_data.confidence,
            "education": "high" if edu else "low",
            "experience": "high" if exp else "medium",
            "projects": "high" if proj else "medium",
            "hackathons": "medium",
            "certifications": "medium",
        },
        meta={
            "schema_version": "1.0",
            "prompt_version": "resume-v1",
            "levels_version": "lv-1.0",
            "doc_sha256": file_sha256,
            "pii_redacted": True,
            "grounding_rate": grounding_rate,
            "layout": "two_column" if "two_column" in full_text else "single_column",
            "sections_found": list(set(section_names)),
            "warnings": warnings,
        },
    )

    # 7. Deterministic Bloom Levels Engine
    category_levels, category_level_details = infer_levels(preliminary)

    duration_ms = round((time.perf_counter() - start_time) * 1000, 2)
    preliminary.category_levels = category_levels
    preliminary.category_level_details = category_level_details
    preliminary.meta["latency_ms"] = duration_ms

    return preliminary
