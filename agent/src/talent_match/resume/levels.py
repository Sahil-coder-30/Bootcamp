"""
levels.py
=========
Deterministic Bloom's Taxonomy evidence-to-level inference engine (lv-1.0).
Computes 1-10 levels across all 12 categories with strict Bloom gates,
evidence tracking, confidence ratings, and explainable audit bases.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal
from talent_match.contract import CategoryLevelDetail, ResumeExtraction

LEVELS_VERSION = "lv-1.0"

ALL_CATEGORIES = [
    "COD", "DSA", "APTI", "COMM", "OOD", "AI",
    "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS",
]

BLOOM_CODES = {
    1: "CU", 2: "CU",
    3: "AP", 4: "AP",
    5: "AS", 6: "AS",
    7: "EV", 8: "EV",
    9: "CR", 10: "CR",
}


@dataclass(frozen=True)
class EvidenceUnit:
    category: str
    kind: Literal[
        "listed", "coursework", "certification", "project",
        "hackathon", "experience", "competitive", "soft_signal", "publication",
    ]
    ref: str
    text: str
    base_points: float
    quantified: bool = False
    leadership: bool = False
    production: bool = False
    creation: bool = False
    top_rank: bool = False
    months: int = 3
    is_recent: bool = True

    @property
    def points(self) -> float:
        depth = min(1.5, 1.0 + (0.25 if self.quantified else 0.0) + (0.25 if self.leadership else 0.0))
        recency = 1.0 if self.is_recent else 0.8
        extra_exp = 0.0
        if self.kind == "experience" and self.months > 3:
            extra_exp = min(1.5, ((self.months - 3) // 3) * 0.5)
        return (self.base_points + extra_exp) * depth * recency


def bloom_for_level(level: int) -> str:
    return BLOOM_CODES.get(max(1, min(10, level)), "CU")


def points_to_level(points: float, units: list[EvidenceUnit]) -> tuple[int, str | None]:
    """Map points P to raw level 1-10 and enforce Bloom gates."""
    if points <= 0.0:
        raw = 1
    elif points <= 1.0:
        raw = 2
    elif points <= 2.5:
        raw = 3
    elif points <= 4.0:
        raw = 4
    elif points <= 6.0:
        raw = 5
    elif points <= 8.5:
        raw = 6
    elif points <= 11.0:
        raw = 7
    elif points <= 14.0:
        raw = 8
    elif points <= 18.0:
        raw = 9
    else:
        raw = 10

    # Bloom Gating Rules
    applied_units = [u for u in units if u.kind in ("project", "hackathon", "experience", "competitive", "publication", "soft_signal")]
    has_cert = any(u.kind == "certification" for u in units)
    has_exp = any(u.kind == "experience" for u in units)
    has_lead_or_top = any(u.leadership or u.top_rank or (u.production and u.quantified) for u in units)
    has_creation = any(u.creation or u.kind == "publication" for u in units)

    cap_reason: str | None = None
    level = raw

    # G-AP: At least 1 applied unit or certification to go above level 2
    if level > 2 and not (applied_units or has_cert):
        level = 2
        cap_reason = "G-AP: listed/theory only, no applied context"

    # G-AS: At least 2 applied units or 1 experience unit to go above level 4
    elif level > 4 and not (len(applied_units) >= 2 or has_exp):
        level = 4
        cap_reason = "G-AS: requires internship or multiple projects"

    # G-EV: Leadership/top_rank/quantified production AND experience/3 applied to go above level 6
    elif level > 6 and not (has_lead_or_top and (has_exp or len(applied_units) >= 3)):
        level = 6
        cap_reason = "G-EV: requires demonstrated lead, design or production impact"

    # G-CR: Creation unit (publication, novel OSS, novel system) to go above level 8
    elif level > 8 and not has_creation:
        level = 8
        cap_reason = "G-CR: requires novel system creation, research publication or maintained OSS"

    return level, cap_reason


def collect_evidence(extraction: ResumeExtraction) -> dict[str, list[EvidenceUnit]]:
    """Gather discrete EvidenceUnits per category from the extracted candidate data."""
    evidence: dict[str, list[EvidenceUnit]] = {c: [] for c in ALL_CATEGORIES}

    # 1. Experience units
    for exp in extraction.experience:
        text = f"{exp.title} at {exp.org}: " + " ".join(exp.highlights)
        is_lead = any(w in text.lower() for w in ("led", "designed", "architected", "owned", "spearheaded", "mentored"))
        is_quant = any(w in text for w in ("%", "ms", "x", "users", "k", "M", "sec", "00"))

        # Map experience skills into category units
        cat_seen: set[str] = set()
        for sk in extraction.skills:
            if sk.section == "experience" or any(s.lower() in sk.skill_name.lower() for s in exp.skills):
                cat = sk.category_code
                if cat in evidence and cat not in cat_seen:
                    cat_seen.add(cat)
                    evidence[cat].append(
                        EvidenceUnit(
                            category=cat,
                            kind="experience",
                            ref=f"{exp.title} ({exp.org})",
                            text=sk.evidence or text[:120],
                            base_points=2.5,
                            quantified=is_quant,
                            leadership=is_lead,
                            production=True,
                            months=3,
                        )
                    )

    # 2. Project units
    for proj in extraction.projects:
        p_text = f"{proj.name}: {proj.description}"
        is_lead = any(w in p_text.lower() for w in ("designed", "built", "implemented", "authored", "created"))
        is_quant = any(w in p_text for w in ("%", "ms", "ops/s", "users", "scale", "rps", "latency"))
        is_create = any(w in p_text.lower() for w in ("novel", "from scratch", "open source", "published", "patent"))

        cat_seen = set()
        for sk in extraction.skills:
            if sk.section == "projects" or any(s.lower() in sk.skill_name.lower() for s in proj.skills):
                cat = sk.category_code
                if cat in evidence and cat not in cat_seen:
                    cat_seen.add(cat)
                    evidence[cat].append(
                        EvidenceUnit(
                            category=cat,
                            kind="project",
                            ref=proj.name,
                            text=sk.evidence or p_text[:120],
                            base_points=1.5,
                            quantified=is_quant,
                            leadership=is_lead,
                            creation=is_create,
                        )
                    )

    # 3. Hackathons
    for h in extraction.hackathons:
        is_top = any(w in (h.result or "").lower() for w in ("winner", "runner", "1st", "2nd", "finalist", "top"))
        # Hackathons boost COD, DSA, and APTI
        for cat in ("COD", "DSA", "APTI"):
            evidence[cat].append(
                EvidenceUnit(
                    category=cat,
                    kind="hackathon",
                    ref=h.name,
                    text=f"{h.name} ({h.result})",
                    base_points=2.5 if is_top else 1.5,
                    quantified=is_top,
                    top_rank=is_top,
                )
            )

    # 4. Certifications
    for cert in extraction.certifications:
        c_name = cert.name.lower()
        cat = "CLOUD" if any(w in c_name for w in ("aws", "cloud", "azure", "gcp")) else "SWE"
        is_pro = any(w in c_name for w in ("associate", "professional", "certified", "expert"))
        evidence[cat].append(
            EvidenceUnit(
                category=cat,
                kind="certification",
                ref=cert.name,
                text=f"{cert.name} ({cert.issuer or 'Cert'})",
                base_points=1.5 if is_pro else 0.75,
            )
        )

    # 5. Listed skills (self-claim)
    for sk in extraction.skills:
        cat = sk.category_code
        if cat in evidence and sk.section in ("skills", None):
            evidence[cat].append(
                EvidenceUnit(
                    category=cat,
                    kind="listed",
                    ref=sk.skill_name,
                    text=sk.evidence or sk.skill_name,
                    base_points=0.5,
                )
            )

    return evidence


def infer_levels(extraction: ResumeExtraction) -> tuple[dict[str, int], dict[str, CategoryLevelDetail]]:
    """Compute deterministic Bloom levels and detailed audit basis for all 12 categories."""
    evidence_by_cat = collect_evidence(extraction)
    category_levels: dict[str, int] = {}
    category_level_details: dict[str, CategoryLevelDetail] = {}

    for cat in ALL_CATEGORIES:
        units = evidence_by_cat.get(cat, [])
        if not units:
            category_levels[cat] = 1
            category_level_details[cat] = CategoryLevelDetail(
                level=1,
                bloom="CU",
                confidence="low",
                points=0.0,
                basis="no evidence",
                capped_by="G-AP: no evidence",
                evidence_refs=[],
            )
            continue

        # Cap listed points at 1.0 max per category
        total_points = 0.0
        listed_points = 0.0
        for u in units:
            if u.kind == "listed":
                if listed_points < 1.0:
                    add = min(u.points, 1.0 - listed_points)
                    listed_points += add
                    total_points += add
            else:
                total_points += u.points

        level, capped_by = points_to_level(total_points, units)
        bloom = bloom_for_level(level)

        # Confidence assignment
        applied_count = sum(1 for u in units if u.kind in ("experience", "project", "hackathon", "competitive"))
        if applied_count >= 2:
            confidence = "high"
        elif applied_count == 1 or any(u.kind == "certification" for u in units):
            confidence = "medium"
        else:
            confidence = "low"

        # Build concise explainable basis sentence
        refs = [u.ref for u in units if u.kind != "listed"][:2]
        ref_summary = ", ".join(refs) if refs else "self-listed"
        exp_count = sum(1 for u in units if u.kind == "experience")
        proj_count = sum(1 for u in units if u.kind == "project")

        signals = []
        if any(u.leadership for u in units):
            signals.append("led/designed")
        if any(u.quantified for u in units):
            signals.append("quantified")
        sig_str = f" · {', '.join(signals)}" if signals else ""

        if exp_count > 0 or proj_count > 0:
            basis = f"{exp_count} exp + {proj_count} proj ({ref_summary}){sig_str} → {level} {bloom}"
        else:
            basis = f"{len(units)} unit(s) ({ref_summary}) → {level} {bloom}"

        if capped_by:
            basis += f" [capped: {capped_by.split(':')[0]}]"

        category_levels[cat] = level
        category_level_details[cat] = CategoryLevelDetail(
            level=level,
            bloom=bloom,
            confidence=confidence,
            points=round(total_points, 2),
            basis=basis[:140],
            capped_by=capped_by,
            evidence_refs=[u.ref for u in units[:4]],
        )

    return category_levels, category_level_details
