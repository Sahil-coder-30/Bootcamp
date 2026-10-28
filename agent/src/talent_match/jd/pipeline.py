"""
pipeline.py
===========
JD text -> contract ExtractedSkillList (plan 3.1).

    prepare (number lines, tag sections, drop boilerplate)
    -> LLM pass (llm.run_structured, provider fallback, one repair)
    -> postprocess (evidence gate, taxonomy, must/nice, confidence, dedupe)
    -> keyword backfill + baseline diff
    -> levels (level_hint, category_levels) -> company resolution

If every provider fails, the keyword baseline is the result (meta.degraded).
"""

from __future__ import annotations

import hashlib
import logging
import time

from pydantic import BaseModel, Field

from talent_match.contract import ExtractedSkillList, Skill
from talent_match.documents import parse_text
from talent_match.jd import levels as lv
from talent_match.jd.company import CompanyRef, resolve_company
from talent_match.jd.postprocess import (
    CONTRACT_SECTION,
    Candidate,
    dedupe,
    process,
    resolve_requirement,
    sentence_bounds,
)
from talent_match.jd.schema import JdLlmOutput
from talent_match.jd.sections import Section, StructuredDocument, section_at, structure
from talent_match.llm import AllProvidersFailed, load_prompt, run_structured
from talent_match.taxonomy import get_taxonomy

logger = logging.getLogger("talent_match.jd")
SCHEMA_VERSION = "1.0"
MAX_PROMPT_CHARS = 16000


class JdExtractRequest(BaseModel):
    source_file: str = "jd.txt"
    text: str | None = None
    document: StructuredDocument | None = None  # from /documents/parse; preferred over text
    document_id: str | None = None
    doc_sha256: str | None = None
    company_id: int | None = None
    company_hint: str | None = None
    role: str | None = None
    companies: list[CompanyRef] = Field(default_factory=list)
    providers: list[str] | None = None
    use_llm: bool = True


def line_starts(text: str) -> list[int]:
    starts = [0]
    for i, ch in enumerate(text):
        if ch == "\n":
            starts.append(i + 1)
    return starts


def prepare(doc: StructuredDocument) -> str:
    """Numbered lines (L001) with a [SECTION ...] tag before each kept section."""
    starts = line_starts(doc.text)
    lines = doc.text.split("\n")
    out: list[str] = []
    current: Section | None = None
    for n, (start, line) in enumerate(zip(starts, lines, strict=True), start=1):
        sec = section_at(doc.sections, start)
        if sec is not None and sec.drop:
            continue
        if sec is not current and sec is not None and sec.label not in ("Introduction", "Full text"):
            out.append(f'[SECTION {sec.kind} | {sec.requirement_hint or "-"} | "{sec.label}"]')
        current = sec
        out.append(f"L{n:03d} {line}")
    prompt = "\n".join(out)
    return prompt[:MAX_PROMPT_CHARS]


def keyword_candidates(doc: StructuredDocument) -> list[Candidate]:
    """Taxonomy keyword scan over the kept sections (plan 3.11)."""
    tax = get_taxonomy()
    out: list[Candidate] = []
    for sec in doc.sections:
        if sec.drop:
            continue
        chunk = doc.text[sec.start : sec.end]
        mode = "skills" if sec.kind in ("skills", "requirements") else "other"
        for hit in tax.find_in_text(chunk, mode):
            s, e = sec.start + hit.start, sec.start + hit.end
            ss, se = sentence_bounds(doc.text, s, e)
            evidence = doc.text[ss:se].strip()[:200]
            out.append(
                Candidate(
                    skill_name=hit.skill.name,
                    category_code=hit.skill.category,
                    canonical_id=hit.skill.id,
                    evidence=evidence,
                    start=ss,
                    end=ss + len(evidence),
                    requirement=resolve_requirement(doc.text[ss:se], sec, "must"),
                    confidence="low",
                    explicit=True,
                    strength=None,
                    section=sec,
                    verify="keyword",
                    taxonomy_method="keyword",
                )
            )
    return out


def _to_skill(c: Candidate, doc: StructuredDocument, pages: dict[int, list[int]]) -> Skill:
    page = 1
    for p, (s, e) in pages.items():
        if s <= c.start <= e:
            page = p
    return Skill(
        skill_name=c.skill_name,
        category_code=c.category_code,
        evidence=c.evidence[:200],
        confidence=c.confidence,
        canonical_id=c.canonical_id,
        level_hint=c.level_hint,
        requirement=c.requirement,
        section=CONTRACT_SECTION.get(c.section.kind, "other") if c.section else "other",
        evidence_span={"start": c.start, "end": c.end, "page": page},
    )


def extract_jd(req: JdExtractRequest) -> ExtractedSkillList:
    t0 = time.perf_counter()
    doc = req.document or structure(parse_text(req.text or ""))
    if not doc.text.strip():
        raise ValueError("JD text is empty")
    prompt = load_prompt("jd_extract")
    trace: list[str] = []
    dropped: list[dict] = []
    new_skills: list[str] = []
    warnings: list[str] = list(doc.warnings)
    attempts: list[dict] = []
    llm_out: JdLlmOutput | None = None
    model = "keyword-baseline"
    llm_ms = 0

    if req.use_llm:
        try:
            res = run_structured(
                JdLlmOutput,
                prompt,
                {
                    "source_file": req.source_file,
                    "company_hint": req.company_hint or "-",
                    "role_hint": req.role or "-",
                    "numbered_jd": prepare(doc),
                },
                provider_order=req.providers,
            )
            llm_out, attempts, llm_ms = res.value, res.attempts, res.latency_ms
            model = f"{res.provider}:{res.model}"
        except AllProvidersFailed as exc:
            attempts = exc.attempts
            warnings.append("degraded:all_llm_providers_failed")
    else:
        warnings.append("degraded:llm_disabled")

    baseline = dedupe(keyword_candidates(doc), [])
    if llm_out is not None:
        cands = process(
            llm_out.skills, doc.text, line_starts(doc.text), doc.sections, trace, dropped, new_skills
        )
        cands = dedupe(cands, trace)
        found = {c.canonical_id for c in cands}
        for b in baseline:
            # explicit keyword hits in requirement/skill sections that the LLM skipped
            if b.canonical_id not in found and b.section is not None and b.section.signal:
                b.confidence = "medium"
                b.verify = "keyword_backfill"
                cands.append(b)
                found.add(b.canonical_id)
                trace.append(f"keyword_backfill:{b.skill_name}")
    else:
        cands = baseline

    seniority, seniority_src = lv.detect_seniority(
        doc.text, req.role or (llm_out.role if llm_out else None), llm_out.seniority if llm_out else None
    )
    for c in cands:
        lv.skill_level(c, doc.text, seniority)
    category_levels, level_basis = lv.category_levels(cands, seniority)

    companies = req.companies
    company_id, company_name, company_method = resolve_company(
        (llm_out.company if llm_out else None) or req.company_hint, doc.text, companies, req.company_id
    )
    if company_id is None:
        warnings.append("company_unresolved")

    pages = {i + 1: [s, e] for i, (s, e) in enumerate(doc.pages)}
    skills = [_to_skill(c, doc, pages) for c in cands]
    llm_ids = {c.canonical_id for c in cands if c.verify not in ("keyword", "keyword_backfill")}
    baseline_ids = sorted({b.canonical_id for b in baseline})
    sha = req.doc_sha256 or hashlib.sha256(doc.text.encode("utf-8")).hexdigest()
    return ExtractedSkillList(
        source_type="jd",
        source_file=req.source_file,
        company=company_name,
        role=req.role or (llm_out.role if llm_out else None),
        skills=skills,
        document_id=req.document_id,
        company_id=company_id,
        category_levels=category_levels,
        meta={
            "schema_version": SCHEMA_VERSION,
            "prompt_version": prompt.version,
            "model": model,
            "doc_sha256": sha,
            "latency_ms": int((time.perf_counter() - t0) * 1000),
            "llm_latency_ms": llm_ms,
            "cached": False,
            "degraded": llm_out is None,
            "warnings": warnings,
            "location": llm_out.location if llm_out else None,
            "seniority": seniority,
            "seniority_source": seniority_src,
            "years_min": llm_out.years_min if llm_out else None,
            "company_method": company_method,
            "levels_version": lv.LEVELS_VERSION,
            "taxonomy_version": get_taxonomy().version,
            "level_basis": level_basis,
            "dropped": dropped,
            "new_skills": sorted(set(new_skills)),
            "trace": trace,
            "attempts": attempts,
            "baseline_ids": baseline_ids,
            "baseline_missed": sorted(llm_ids - set(baseline_ids)),
            "evidence_verified": sum(1 for c in cands if c.verify != "rebuilt"),
        },
    )
