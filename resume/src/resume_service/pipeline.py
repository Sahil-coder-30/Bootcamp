"""
pipeline.py
===========
The whole parse, offline:

    bytes -> documents.parse_document -> sections.split_sections -> entries.*  (structure)
          -> build_skills (taxonomy + grounding + confidence rule)
          -> build_units -> levels.infer_levels (lv-1.0)  -> ResumeExtraction

``rescore(extraction)`` re-runs skills and levels from a stored (or edited)
extraction, which is what ``POST /levels/infer`` uses.
"""

from __future__ import annotations

import hashlib
import re
import time
from collections import defaultdict
from dataclasses import dataclass

from . import entries, nlp, patterns, signals
from .contract import (
    CATEGORY_CODES,
    Candidate,
    Confidence,
    EvidenceSpan,
    Experience,
    ResumeExtraction,
    ResumeMeta,
    Skill,
)
from .documents import Line, ParsedDocument, parse_document, parse_text
from .levels import BASE, COMPETITIVE, Unit, infer_levels, skill_level_hint
from .sections import merge_sections, split_sections
from .taxonomy import SkillDef, get_taxonomy, slugify

APPLIED_SECTIONS = ("experience", "projects", "hackathons", "publications")
SECTION_PRIORITY = ("experience", "projects", "hackathons", "publications", "certifications", "achievements",
                    "positions", "skills", "coursework", "summary", "header", "other")
ISSUER_CATEGORY = {"AWS": "CLOUD", "Microsoft": "CLOUD", "Google": "CLOUD", "Oracle": "SQL", "Cisco": "NETW",
                   "CNCF": "CLOUD", "HashiCorp": "CLOUD", "Red Hat": "OS", "MongoDB": "SQL",
                   "DeepLearning.AI": "AI", "NVIDIA": "AI", "Linux Foundation": "OS"}
TODAY = (2026, 10)


@dataclass
class Mention:
    skill: SkillDef | None
    name: str
    category: str
    section: str
    evidence: str
    unit_ref: str | None = None  # which entry (for level hints)


# --- entry points ----------------------------------------------------------------

def parse_resume(data: bytes, file_name: str, mime: str | None = None) -> ResumeExtraction:
    started = time.perf_counter()
    doc = parse_document(data, file_name, mime)
    ext = _extract(doc, file_name)
    ext.meta.doc_sha256 = hashlib.sha256(data).hexdigest()
    ext.meta.latency_ms = int((time.perf_counter() - started) * 1000)
    return ext


def parse_resume_text(text: str, source_file: str = "pasted.txt") -> ResumeExtraction:
    started = time.perf_counter()
    doc = parse_text(text)
    ext = _extract(doc, source_file)
    ext.meta.doc_sha256 = hashlib.sha256(text.encode("utf-8")).hexdigest()
    ext.meta.latency_ms = int((time.perf_counter() - started) * 1000)
    return ext


def rescore(ext: ResumeExtraction) -> ResumeExtraction:
    """Recompute skills and levels from the structured fields (no document needed)."""
    full_text = "\n".join(ext.sections.values())
    mentions = _collect_mentions(ext)
    units, unit_by_skill = build_units(ext, mentions)
    ext.skills = _merge_skills(mentions, full_text, unit_by_skill)
    _attach_entry_skills(ext, mentions)
    details = infer_levels(units)
    ext.category_level_details = details
    ext.category_levels = {code: d.level for code, d in details.items()}
    return ext


# --- structure ---------------------------------------------------------------------

def _extract(doc: ParsedDocument, file_name: str) -> ResumeExtraction:
    secs, warnings = split_sections(doc.lines)
    by_name: dict[str, list[Line]] = defaultdict(list)
    for s in secs:
        by_name[s.name].extend(s.lines)
    texts = merge_sections(secs)
    full_text = doc.text

    header_lines = [ln.text for ln in by_name["header"]][:12]
    contact = patterns.find_contacts("\n".join(header_lines) or full_text)
    if not contact.email or not contact.phone:
        whole = patterns.find_contacts(full_text)
        contact.email = contact.email or whole.email
        contact.phone = contact.phone or whole.phone
        contact.links = contact.links or whole.links
    name, name_conf = nlp.find_name(header_lines or [ln.text for ln in doc.lines[:6]], contact.email)

    ext = ResumeExtraction(source_file=file_name)
    ext.candidate = Candidate(name=name, email=contact.email, phone=contact.phone, links=contact.links or [],
                              location=nlp.find_location("\n".join(header_lines[:6])) if header_lines else None)
    ext.education = entries.parse_education(by_name["education"])

    experience = [e for e, _ in entries.parse_experience(by_name["experience"])]
    # positions that read like jobs (a title + an org + dates) are kept as volunteer experience
    ext.experience = experience
    ext.projects = [p for p, _ in entries.parse_projects(by_name["projects"])]
    ext.certifications = entries.parse_certifications(by_name["certifications"])
    ext.hackathons = (entries.parse_hackathons(by_name["hackathons"], strict=False)
                      + entries.parse_hackathons(by_name["achievements"] + by_name["positions"], strict=True))
    hack_names = {h.name for h in ext.hackathons}
    ext.achievements = [a for a in entries.plain_items(by_name["achievements"]) if a not in hack_names]
    ext.positions = entries.plain_items(by_name["positions"])
    ext.coursework = entries.coursework_items(texts.get("coursework", ""))
    ext.summary = texts.get("summary")
    ext.sections = texts
    ext.role = _target_role(header_lines, ext.summary)

    field_confidence: dict[str, Confidence] = {
        "name": name_conf,
        "email": "high" if contact.email else "low",
        "education": "high" if any(e.degree and e.institution for e in ext.education) else
        ("medium" if ext.education else "low"),
        "experience": "high" if any(e.start and (e.title or e.org) for e in ext.experience) else
        ("medium" if ext.experience else "low"),
        "projects": "high" if ext.projects else "low",
    }
    ext.field_confidence = field_confidence
    ext.meta = ResumeMeta(layout=doc.layout, ocr_used=doc.ocr_used, page_count=doc.page_count,
                          sections_found=[s.name for s in secs if s.name != "header" and s.lines],
                          ner_model=nlp.model_name(), warnings=list(doc.warnings) + warnings)
    rescore(ext)
    unmapped = [s.skill_name for s in ext.skills if s.category_code == "OTHER" and s.canonical_id
                and get_taxonomy().by_id.get(s.canonical_id) is None]
    ext.meta.warnings += [f"unmapped_skill:{u}" for u in unmapped[:10]]
    return ext


def _target_role(header: list[str], summary: str | None) -> str | None:
    for line in header[1:6]:
        if entries.ROLE_WORDS.search(line) and len(line.split()) <= 6 and "@" not in line and not any(
                c.isdigit() for c in line):
            return line.strip(" |")
    if summary:
        m = re.search(r"(?:aspiring|seeking|looking for|targeting)\s+(?:an?\s+)?(?:role\s+as\s+(?:an?\s+)?)?"
                      r"([A-Za-z/\- ]{3,40}?(?:engineer|developer|analyst|scientist|role|position))",
                      summary, re.IGNORECASE)
        if m:
            return m.group(1).strip().title()
    return None


# --- skills ------------------------------------------------------------------------

def _line_with(text: str, start: int) -> str:
    s = text.rfind("\n", 0, start) + 1
    e = text.find("\n", start)
    return text[s: e if e != -1 else len(text)].strip().removeprefix("- ")


def _hits(text: str, section: str, ref: str | None) -> list[Mention]:
    tax = get_taxonomy()
    clean = patterns.strip_urls(text)
    return [Mention(h.skill, h.skill.name, h.skill.category, section, _line_with(clean, h.start), ref)
            for h in tax.find_in_text(clean, section)]


def _exp_ref(e: Experience) -> str:
    return (e.org or e.title or "experience").strip()


def _collect_mentions(ext: ResumeExtraction) -> list[Mention]:
    tax = get_taxonomy()
    out: list[Mention] = []
    for i, e in enumerate(ext.experience):
        text = "\n".join(filter(None, [e.title, e.org, *e.highlights]))
        out += _hits(text, "experience", f"exp:{i}")
    for i, p in enumerate(ext.projects):
        out += _hits(f"{p.name}\n{p.description}", "projects", f"proj:{i}")
    for i, h in enumerate(ext.hackathons):
        out += _hits(h.name, "hackathons", f"hack:{i}")
    for line in ext.sections.get("publications", "").splitlines():
        out += _hits(line, "publications", "pub")
    for i, c in enumerate(ext.certifications):
        out += _hits(c.name, "certifications", f"cert:{i}")
    for sec in ("achievements", "positions"):
        out += _hits(ext.sections.get(sec, ""), sec, None)
    out += _hits(", ".join(ext.coursework), "coursework", None)
    if ext.summary:
        out += _hits(ext.summary, "summary", None)

    for tok, line in entries.skill_tokens(ext.sections.get("skills", "")):
        found, _method = tax.canonicalize(tok)
        if found is None and "/" in tok:
            for part in tok.split("/"):
                sub, _ = tax.canonicalize(part)
                if sub is not None:
                    out.append(Mention(sub, sub.name, sub.category, "skills", line))
            continue
        if found is not None:
            out.append(Mention(found, found.name, found.category, "skills", line))
        elif _looks_like_tech(tok):
            out.append(Mention(None, tok, "OTHER", "skills", line))
    return out


def _looks_like_tech(tok: str) -> bool:
    words = tok.split()
    return (1 <= len(words) <= 3 and len(tok) <= 25 and not tok.islower()
            and not re.search(r"\b(and|the|of|with|for|skills?)\b", tok, re.IGNORECASE))


def _merge_skills(mentions: list[Mention], full_text: str, unit_by_skill: dict[str, list[Unit]]) -> list[Skill]:
    grouped: dict[str, list[Mention]] = defaultdict(list)
    for m in mentions:
        cid = m.skill.id if m.skill else slugify(m.name)
        grouped[cid].append(m)
    skills: list[Skill] = []
    for cid, ms in grouped.items():
        ms.sort(key=lambda m: SECTION_PRIORITY.index(m.section) if m.section in SECTION_PRIORITY else 99)
        best = ms[0]
        sections = {m.section for m in ms}
        conf: Confidence
        if sections & set(APPLIED_SECTIONS):
            conf = "high"
        elif sections & {"skills", "certifications"}:
            conf = "medium"
        else:
            conf = "low"
        evidence = (best.evidence or best.name)[:200]
        span = None
        idx = full_text.find(evidence[:80]) if evidence else -1
        if idx >= 0:
            span = EvidenceSpan(start=idx, end=idx + len(evidence))
        skills.append(Skill(skill_name=best.skill.name if best.skill else best.name, category_code=best.category,
                            evidence=evidence, confidence=conf, canonical_id=cid,
                            level_hint=skill_level_hint(unit_by_skill.get(cid, [])),
                            section=best.section, evidence_span=span))
    order = {"high": 0, "medium": 1, "low": 2}
    skills.sort(key=lambda s: (order[s.confidence], -(s.level_hint or 0), s.skill_name.lower()))
    return skills


def _attach_entry_skills(ext: ResumeExtraction, mentions: list[Mention]) -> None:
    per_ref: dict[str, list[str]] = defaultdict(list)
    for m in mentions:
        if m.unit_ref and m.name not in per_ref[m.unit_ref]:
            per_ref[m.unit_ref].append(m.name)
    for i, e in enumerate(ext.experience):
        e.skills = per_ref.get(f"exp:{i}", [])
    for i, p in enumerate(ext.projects):
        p.skills = per_ref.get(f"proj:{i}", [])


# --- evidence units ----------------------------------------------------------------

def _is_old(end: str | None) -> bool:
    months = patterns.months_between(end, "present", today=TODAY) if end and end != "present" else None
    return bool(months and months > 36)


def build_units(ext: ResumeExtraction, mentions: list[Mention]) -> tuple[list[Unit], dict[str, list[Unit]]]:
    base = BASE
    units: list[Unit] = []
    by_skill: dict[str, list[Unit]] = defaultdict(list)
    by_ref: dict[str, list[Mention]] = defaultdict(list)
    for m in mentions:
        if m.unit_ref:
            by_ref[m.unit_ref].append(m)

    def add(u: Unit, skill_ids: list[str]) -> None:
        units.append(u)
        for sid in skill_ids:
            by_skill[sid].append(u)

    def per_category(ms: list[Mention]) -> dict[str, list[str]]:
        cats: dict[str, list[str]] = defaultdict(list)
        for m in ms:
            if m.category in CATEGORY_CODES:
                sid = m.skill.id if m.skill else slugify(m.name)
                if sid not in cats[m.category]:
                    cats[m.category].append(sid)
        return cats

    # experience
    for i, e in enumerate(ext.experience):
        text = "\n".join(filter(None, [e.title, e.org, *e.highlights]))
        sig = signals.detect(text)
        months = e.months or 3
        bonus = min(base["experience_bonus_cap"], base["experience_per_quarter"] * max(0, (months - 3) // 3))
        cats = per_category(by_ref.get(f"exp:{i}", []))
        if not cats and e.title and re.search(r"engineer|developer|sde|programmer", e.title, re.IGNORECASE):
            cats = {"SWE": []}
        for cat, sids in cats.items():
            add(Unit(cat, "experience", base["experience"] + bonus + _breadth(sids), _exp_ref(e),
                     _first(e.highlights) or text,
                     leadership=sig.leadership, quantified=sig.quantified, production=True,
                     creation=sig.creation, old=_is_old(e.end)), sids)

    # projects
    for i, p in enumerate(ext.projects):
        sig = signals.detect(f"{p.name}\n{p.description}")
        for cat, sids in per_category(by_ref.get(f"proj:{i}", [])).items():
            add(Unit(cat, "project", base["project"] + _breadth(sids), p.name, p.description[:200] or p.name,
                     leadership=sig.leadership, quantified=sig.quantified, production=sig.production,
                     creation=sig.creation), sids)

    # hackathons (no detected tech -> it still shows problem solving)
    for i, h in enumerate(ext.hackathons):
        pts = base["hackathon"] + (base["hackathon_podium_bonus"] if signals.is_podium(h.result) else 0)
        cats = per_category(by_ref.get(f"hack:{i}", [])) or {"APTI": []}
        for cat, sids in cats.items():
            add(Unit(cat, "hackathon", pts, h.name, h.name, top_rank=signals.is_podium(h.result)), sids)

    # publications
    for m_cat, sids in per_category([m for m in mentions if m.section == "publications"]).items():
        add(Unit(m_cat, "publication", base["publication"], "publication",
                 ext.sections.get("publications", "")[:200], creation=True), sids)
    if ext.sections.get("publications") and not any(m.section == "publications" for m in mentions):
        add(Unit("SWE", "publication", base["publication"], "publication",
                 ext.sections["publications"][:200], creation=True), [])

    # certifications
    for i, c in enumerate(ext.certifications):
        pts = base["cert_professional"] if signals.cert_is_professional(c.name) else base["cert_foundational"]
        cats = per_category(by_ref.get(f"cert:{i}", []))
        if not cats and c.issuer in ISSUER_CATEGORY:
            cats[ISSUER_CATEGORY[c.issuer]] = []
        for cat, sids in cats.items():
            add(Unit(cat, "certification", pts, c.name[:40], c.name), sids)

    # listed skills and coursework (capped per category inside levels.score_category)
    seen_listed: set[str] = set()
    for m in mentions:
        if m.section == "skills" and m.category in CATEGORY_CODES:
            sid = m.skill.id if m.skill else slugify(m.name)
            if sid in seen_listed:
                continue
            seen_listed.add(sid)
            add(Unit(m.category, "listed", base["listed"], m.name, m.evidence), [sid])
        elif m.section == "coursework" and m.category in CATEGORY_CODES:
            sid = m.skill.id if m.skill else slugify(m.name)
            add(Unit(m.category, "coursework", base["coursework"], m.name, m.evidence), [sid])

    # competitive programming -> DSA and APTI
    full = "\n".join(ext.sections.values())
    for cs in patterns.find_competitive(full):
        pts = COMPETITIVE[cs.tier]
        for cat, factor in (("DSA", 1.0), ("APTI", base["competitive_apti_factor"])):
            add(Unit(cat, "competitive", pts * factor, cs.evidence[:40], cs.evidence,
                     top_rank=cs.kind == "top_rank"), [])

    # soft signals (COMM, APTI, SWE) from what the candidate did, not from claims
    soft_text = "\n".join([*(h for e in ext.experience for h in e.highlights),
                           *(f"{e.title or ''} {e.org or ''}" for e in ext.experience),
                           *ext.positions, *ext.achievements])
    seen_soft: set[tuple[str, str]] = set()
    for cat, pts, label, line in signals.soft_signals(soft_text):
        if (cat, line) in seen_soft or not line.strip():
            continue
        seen_soft.add((cat, line))
        sig = signals.detect(line)
        if pts >= 2.5:
            base_pts = base["soft_signal_client"]
        else:
            base_pts = base["soft_signal_comm"] if cat == "COMM" else base["soft_signal"]
        add(Unit(cat, "soft_signal", base_pts, label, line, leadership=sig.leadership,
                 quantified=sig.quantified), [])
    return units, by_skill


def _breadth(skill_ids: list[str]) -> float:
    return min(BASE["breadth_cap"], BASE["breadth_per_skill"] * max(0, len(skill_ids) - 1))


def _first(items: list[str]) -> str | None:
    return items[0] if items else None

