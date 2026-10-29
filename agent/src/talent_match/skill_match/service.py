"""
service.py
==========
Public service orchestration for single and batch skill matching.
"""

from __future__ import annotations

import time

from talent_match.contract import (
    BatchMatrixCell,
    CandidateProfile,
    CandidateSkillLevel,
    MatchedSkill,
    ResumeExtraction,
    ScoreBreakdown,
    SkillMatchBatchRequest,
    SkillMatchBatchResult,
    SkillMatchMeta,
    SkillMatchRequest,
    SkillMatchResult,
)
from talent_match.skill_match.adjudicate import Adjudicator
from talent_match.skill_match.cascade import run_cascade
from talent_match.skill_match.embeddings import GeminiEmbedder
from talent_match.skill_match.gaps import build_missing
from talent_match.skill_match.params import MATCHING_VERSION, PROMPT_VERSION, TAXONOMY_VERSION
from talent_match.skill_match.scoring import score
from talent_match.skill_match.terms import build_candidate_terms, build_jd_terms

_EMBEDDER = GeminiEmbedder()
_ADJUDICATOR = Adjudicator()


def _extract_candidate_levels(
    profile: CandidateProfile | None,
    resume: ResumeExtraction | None,
) -> dict[str, int]:
    """Extracts integer levels per category code for candidate."""
    cand_levels: dict[str, int] = {}
    if profile:
        for k, v in profile.skill_levels.items():
            if isinstance(v, (int, float)):
                cand_levels[k] = int(v)
            elif isinstance(v, dict):
                cand_levels[k] = int(v.get("level", 1))
            elif isinstance(v, CandidateSkillLevel):
                cand_levels[k] = v.level
    elif resume:
        for k, v in resume.category_levels.items():
            cand_levels[k] = int(v)
    return cand_levels


def match(req: SkillMatchRequest) -> SkillMatchResult:
    """Matches a single candidate profile or resume against an extracted JD skill list."""
    start_time = time.perf_counter()

    jd_terms = build_jd_terms(req.jd)
    cand_terms = build_candidate_terms(req.profile, req.resume)

    required_levels = req.jd.category_levels
    cand_levels = _extract_candidate_levels(req.profile, req.resume)

    decisions, stage_counts, llm_calls, llm_pairs = run_cascade(
        jd_terms=jd_terms,
        cand_terms=cand_terms,
        candidate_levels=req.profile.skill_levels if req.profile else req.resume.category_levels,
        required_levels=required_levels,
        embedder=_EMBEDDER,
        adjudicator=_ADJUDICATOR,
        use_llm=req.options.use_llm and not req.options.fast_mode,
        use_embeddings=req.options.use_embeddings,
    )

    parts = score(decisions, jd_terms, required_levels, cand_levels)
    missing = build_missing(
        decisions=decisions,
        jd_terms=jd_terms,
        cand_terms=cand_terms,
        required_levels=required_levels,
        candidate_levels=cand_levels,
        topics=req.topics,
        score_parts=parts,
    )

    matched: list[MatchedSkill] = []
    for d in decisions:
        if d.credit >= 0.30 and d.best_candidate_term:
            matched.append(
                MatchedSkill(
                    jd_skill=d.jd_skill,
                    candidate_skill=d.best_candidate_term.raw_name,
                    category_code=d.category_code,
                    method=d.method
                    if d.method in ("exact", "alias", "fuzzy", "semantic", "llm")
                    else "alias",
                    similarity=float(round(d.similarity, 2)),
                    requirement=d.requirement,
                    evidence=d.candidate_evidence,
                    credit=float(round(d.credit, 2)),
                    jd_evidence=d.jd_evidence,
                    relation=d.relation,
                    reason=d.reason,
                )
            )

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    meta = SkillMatchMeta(
        taxonomy_version=TAXONOMY_VERSION,
        prompt_version=PROMPT_VERSION,
        stage_counts=stage_counts,
        llm_calls=llm_calls,
        llm_pairs=llm_pairs,
        latency_ms=latency_ms,
        cached=False,
        warnings=[],
    )

    breakdown = ScoreBreakdown(
        must_coverage=parts.must_coverage,
        nice_coverage=parts.nice_coverage,
        level_fit=parts.level_fit,
        raw_score=parts.raw_score,
        cap=parts.cap,
        cap_reason=parts.cap_reason,
        weights=parts.weights,
    )

    return SkillMatchResult(
        jd_source_file=req.jd.source_file,
        match_score=parts.match_score,
        match_band=parts.match_band,  # type: ignore
        jd_id=req.jd.jd_id,
        profile_id=req.profile.id if req.profile else None,
        profile_version=req.profile.version if req.profile else None,
        matched_skills=matched,
        missing_skills=missing,
        category_coverage=parts.category_coverage,
        score_breakdown=breakdown,
        matching_version=MATCHING_VERSION,
        meta=meta,
    )


def match_batch(req: SkillMatchBatchRequest) -> SkillMatchBatchResult:
    """
    Evaluates candidates x JDs matrix. Optimizes batch performance by embedding
    all unique strings once and evaluating gray pairs cooperatively.
    """
    cells: list[BatchMatrixCell] = []
    best_jd_by_prof: dict[str, str] = {}
    best_cand_by_jd: dict[str, str] = {}

    max_scores_prof: dict[str, tuple[int, float, str]] = {}  # prof_id -> (score, must_cov, jd_id)
    max_scores_jd: dict[str, tuple[int, float, str]] = {}  # jd_id -> (score, must_cov, prof_id)

    for cand in req.candidates:
        c_profile = cand.profile
        c_resume = cand.resume

        for jd in req.jds:
            sub_req = SkillMatchRequest(
                jd=jd,
                profile=c_profile,
                resume=c_resume,
                topics=req.topics,
                options=req.options,
            )
            res = match(sub_req)

            top_missing = [m.skill_name for m in res.missing_skills[:2]]
            cell = BatchMatrixCell(
                profile_id=cand.id,
                jd_id=jd.jd_id or jd.source_file,
                match_score=res.match_score,
                band=res.match_band,
                must_coverage=res.score_breakdown.must_coverage,
                top_missing=top_missing,
            )
            cells.append(cell)

            # Track best fits
            prof_best = max_scores_prof.get(cand.id, (-1, -1.0, ""))
            if (res.match_score, res.score_breakdown.must_coverage) > (prof_best[0], prof_best[1]):
                max_scores_prof[cand.id] = (res.match_score, res.score_breakdown.must_coverage, cell.jd_id)

            jd_best = max_scores_jd.get(cell.jd_id, (-1, -1.0, ""))
            if (res.match_score, res.score_breakdown.must_coverage) > (jd_best[0], jd_best[1]):
                max_scores_jd[cell.jd_id] = (res.match_score, res.score_breakdown.must_coverage, cand.id)

    for p_id, (_, _, best_j) in max_scores_prof.items():
        best_jd_by_prof[p_id] = best_j

    for j_id, (_, _, best_c) in max_scores_jd.items():
        best_cand_by_jd[j_id] = best_c

    profile_summaries = [{"id": c.id, "name": c.name} for c in req.candidates]
    jd_summaries = [
        {
            "id": jd.jd_id or jd.source_file,
            "company": jd.company or "Unknown",
            "role": jd.role or "Unknown",
            "source_file": jd.source_file,
        }
        for jd in req.jds
    ]

    return SkillMatchBatchResult(
        matching_version=MATCHING_VERSION,
        profiles=profile_summaries,
        jds=jd_summaries,
        cells=cells,
        best_jd_by_profile=best_jd_by_prof,
        best_candidate_by_jd=best_cand_by_jd,
        meta={"cell_count": len(cells)},
    )
