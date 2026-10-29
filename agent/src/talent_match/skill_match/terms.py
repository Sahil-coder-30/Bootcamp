"""
terms.py
========
Builds and deduplicates JdTerm and CandTerm models from contract objects.
Handles alternative groups and evidence factors.
"""

from __future__ import annotations

import re
from typing import Literal

from pydantic import BaseModel

import talent_match.skill_match.sm_taxonomy as taxonomy
from talent_match.contract import (
    CandidateProfile,
    ExtractedSkillList,
    ResumeExtraction,
    Skill,
)
from talent_match.skill_match.normalize import normalize, split_compound
from talent_match.skill_match.params import BASE_WEIGHTS, EVIDENCE_FACTORS, SECTION_FACTOR


class JdTerm(BaseModel):
    id: str  # unique id, e.g. "jd_0", "jd_1"
    raw_name: str
    norm_name: str
    canonical_id: str | None
    category_code: str
    requirement: Literal["must", "nice"] = "must"
    section: str = "requirements"
    weight: float = 3.0
    evidence: str = ""
    level_hint: int | None = None
    alt_group: str | None = None


class CandTerm(BaseModel):
    id: str
    raw_name: str
    norm_name: str
    canonical_id: str | None
    category_code: str
    confidence: Literal["high", "medium", "low"] = "high"
    evidence_factor: float = 1.0
    evidence: str = ""
    source: str = "skills"


_ALT_TRIGGER_RE = re.compile(r"\b(or|one of|any of|one or more of)\b", re.IGNORECASE)


def detect_alt_groups(skills: list[Skill]) -> dict[int, str]:
    """
    Detects alternative skill sets. If multiple skills share evidence containing
    ' or ', 'one of', 'any of', 'one or more', groups them under the same alt_group id.
    """
    alt_map: dict[int, str] = {}
    evidence_to_indices: dict[str, list[int]] = {}

    for idx, s in enumerate(skills):
        if s.alt_group:
            alt_map[idx] = s.alt_group
        elif s.evidence and _ALT_TRIGGER_RE.search(s.evidence):
            norm_ev = s.evidence.strip().lower()
            evidence_to_indices.setdefault(norm_ev, []).append(idx)

    group_counter = 1
    for _ev, indices in evidence_to_indices.items():
        if len(indices) > 1:
            grp_id = f"alt_group_{group_counter}"
            group_counter += 1
            for i in indices:
                if i not in alt_map:
                    alt_map[i] = grp_id

    return alt_map


def build_jd_terms(jd: ExtractedSkillList) -> list[JdTerm]:
    """
    Processes JD skills: normalizes names, resolves canonical_id, merges exact duplicates,
    computes weights, and assigns alt groups.
    """
    alt_groups = detect_alt_groups(jd.skills)
    terms: list[JdTerm] = []

    # Map canonical_id or norm_name -> term to dedupe
    seen: dict[str, JdTerm] = {}

    for idx, s in enumerate(jd.skills):
        norm = normalize(s.skill_name)
        if not norm:
            continue

        cid = s.canonical_id or taxonomy.resolve(s.skill_name, s.category_code) or taxonomy.resolve(norm)
        req = s.requirement or "must"
        sec = s.section or "requirements"
        base_w = BASE_WEIGHTS.get(req, 3.0)
        sec_w = SECTION_FACTOR.get(sec.lower(), 1.0)
        conf_w = 1.0 if s.confidence in ("high", "medium") else 0.7
        total_w = base_w * sec_w * conf_w
        alt = alt_groups.get(idx) or s.alt_group

        key = cid if cid else norm
        if key in seen:
            existing = seen[key]
            if total_w > existing.weight:
                existing.weight = total_w
                existing.requirement = req
                existing.section = sec
            if s.evidence and s.evidence not in existing.evidence:
                existing.evidence = f"{existing.evidence}; {s.evidence}".strip("; ")
        else:
            term = JdTerm(
                id=f"jd_{len(terms)}",
                raw_name=s.skill_name,
                norm_name=norm,
                canonical_id=cid,
                category_code=s.category_code,
                requirement=req,
                section=sec,
                weight=total_w,
                evidence=s.evidence or "",
                level_hint=s.level_hint,
                alt_group=alt,
            )
            seen[key] = term
            terms.append(term)

    return terms


def build_candidate_terms(
    profile: CandidateProfile | None = None,
    resume: ResumeExtraction | None = None,
) -> list[CandTerm]:
    """
    Extracts and normalizes all candidate terms from skills, projects, internships,
    and certifications. Deduplicates by canonical_id or norm_name, keeping the highest
    evidence factor.
    """
    candidates_raw: list[tuple[str, str, str, str, str]] = []  # (name, cat, evidence, confidence, source)

    if profile:
        for s in profile.skills:
            candidates_raw.append((s.skill_name, s.category_code, s.evidence or "", s.confidence, "skills"))
        for p in profile.projects:
            for sk in p.skills:
                ev = f"Project: {p.name}. {p.description or ''}"
                candidates_raw.append((sk, "OTHER", ev[:200], "high", "projects"))
        for exp in profile.internships:
            for sk in exp.skills:
                ev = f"Experience: {exp.title} at {exp.org or ''}"
                candidates_raw.append((sk, "OTHER", ev[:200], "high", "experience"))
        for cert in profile.certifications:
            ev = f"Certification: {cert.name} by {cert.issuer or ''}"
            candidates_raw.append((cert.name, "OTHER", ev[:200], "high", "certifications"))

    elif resume:
        for s in resume.skills:
            candidates_raw.append((s.skill_name, s.category_code, s.evidence or "", s.confidence, "skills"))
        for p in resume.projects:
            for sk in p.skills:
                ev = f"Project: {p.name}. {p.description or ''}"
                candidates_raw.append((sk, "OTHER", ev[:200], "high", "projects"))
        for exp in resume.experience:
            for sk in exp.skills:
                ev = f"Experience: {exp.title} at {exp.org or ''}"
                candidates_raw.append((sk, "OTHER", ev[:200], "high", "experience"))
        for cert in resume.certifications:
            ev = f"Certification: {cert.name} by {cert.issuer or ''}"
            candidates_raw.append((cert.name, "OTHER", ev[:200], "high", "certifications"))

    seen: dict[str, CandTerm] = {}
    terms: list[CandTerm] = []

    for name, cat, ev, conf, src in candidates_raw:
        for piece in split_compound(name):
            norm = normalize(piece)
            if not norm:
                continue

            cid = taxonomy.resolve(piece, cat) or taxonomy.resolve(norm)
            factor = EVIDENCE_FACTORS.get(conf, 1.0)
            key = cid if cid else norm

            if key in seen:
                existing = seen[key]
                if factor > existing.evidence_factor:
                    existing.evidence_factor = factor
                    existing.confidence = conf
                    existing.evidence = ev
                    existing.source = src
            else:
                ct = CandTerm(
                    id=f"cand_{len(terms)}",
                    raw_name=piece,
                    norm_name=norm,
                    canonical_id=cid,
                    category_code=cat,
                    confidence=conf,
                    evidence_factor=factor,
                    evidence=ev,
                    source=src,
                )
                seen[key] = ct
                terms.append(ct)

    return terms
