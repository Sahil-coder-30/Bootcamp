"""
profile.py
==========
ResumeExtraction -> CandidateProfile draft (contract 3.4). Role 3 saves profiles;
this only pre-fills one, with every ``skill_levels`` entry marked
``source: resume_inferred`` and ``inferred_level`` kept for later overrides.
Talent Check (Role 4) reads exactly this ``skill_levels`` shape.
"""

from __future__ import annotations

from .contract import CATEGORY_CODES, ProfileDraft, ResumeExtraction, SkillLevel


def education_line(ext: ResumeExtraction) -> str:
    if not ext.education:
        return ""
    e = ext.education[0]
    return ", ".join(x for x in (e.degree, e.institution, e.year, e.score) if x)


def profile_draft(ext: ResumeExtraction, cv_file: str | None = None) -> ProfileDraft:
    levels: dict[str, SkillLevel] = {}
    for code in CATEGORY_CODES:
        d = ext.category_level_details.get(code)
        if d is None:
            levels[code] = SkillLevel(level=1, confidence="low", basis="no evidence", inferred_level=1)
        else:
            levels[code] = SkillLevel(level=d.level, confidence=d.confidence, basis=d.basis,
                                      inferred_level=d.level)
    return ProfileDraft(
        name=ext.candidate.name,
        email=ext.candidate.email,
        phone=ext.candidate.phone,
        links=ext.candidate.links,
        education=education_line(ext),
        education_details=ext.education,
        skills=[s for s in ext.skills if s.category_code != "OTHER" or s.confidence != "low"],
        hackathons=ext.hackathons,
        internships=[e for e in ext.experience if e.kind in ("internship", "job", "research")],
        certifications=ext.certifications,
        projects=ext.projects,
        preferred_roles=[ext.role] if ext.role else [],
        cv_file=cv_file,
        skill_levels=levels,
        resume_extraction_id=ext.extraction_id,
    )
