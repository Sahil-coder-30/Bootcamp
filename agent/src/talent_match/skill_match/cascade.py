"""
cascade.py
==========
7-stage matching cascade:
Stage 1: exact (1.00)
Stage 2: alias (1.00)
Stage 3: implied (taxonomy DAG: 0.90 / 0.80 / 0.60 / 0.50)
Stage 4: fuzzy (RapidFuzz token_set_ratio: >=92 accept 0.95 | 78-91 gray)
Stage 5: semantic (Cosine similarity: >=0.88 accept 0.90 | 0.76-0.879 gray)
Stage 6: llm (Batched adjudication of gray pairs)
Stage 7: category fallback for concept terms
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel
from rapidfuzz import fuzz

import talent_match.skill_match.sm_taxonomy as taxonomy
from talent_match.contract import CandidateSkillLevel
from talent_match.skill_match.adjudicate import Adjudicator, GrayPair
from talent_match.skill_match.embeddings import Embedder, cosine_matrix
from talent_match.skill_match.normalize import is_short
from talent_match.skill_match.params import CREDITS, MAX_LLM_PAIRS, THRESHOLDS
from talent_match.skill_match.terms import CandTerm, JdTerm


class Decision(BaseModel):
    jd_id: str
    jd_skill: str
    category_code: str
    requirement: Literal["must", "nice"]
    section: str
    weight: float
    best_candidate_term: CandTerm | None = None
    method: Literal["exact", "alias", "implied", "fuzzy", "semantic", "llm", "category", "unmatched"] = (
        "unmatched"
    )
    similarity: float = 0.0
    credit: float = 0.0
    relation: str | None = None
    reason: str | None = None
    jd_evidence: str = ""
    candidate_evidence: str = ""


def run_cascade(
    jd_terms: list[JdTerm],
    cand_terms: list[CandTerm],
    candidate_levels: dict[str, int | CandidateSkillLevel] | None,
    required_levels: dict[str, int],
    embedder: Embedder,
    adjudicator: Adjudicator,
    use_llm: bool = True,
    use_embeddings: bool = True,
) -> tuple[list[Decision], dict[str, int], int, int]:
    """
    Executes the 7-stage cascade matching for every JD term against candidate terms.
    Returns:
      (list of decisions, stage_counts, llm_calls_made, llm_pairs_processed)
    """
    decisions: list[Decision] = []
    stage_counts: dict[str, int] = {
        "exact": 0,
        "alias": 0,
        "implied": 0,
        "fuzzy": 0,
        "semantic": 0,
        "llm": 0,
        "category": 0,
    }

    # Pre-index candidate terms
    exact_map: dict[str, CandTerm] = {}
    cid_map: dict[str, list[CandTerm]] = {}

    for ct in cand_terms:
        if ct.norm_name not in exact_map:
            exact_map[ct.norm_name] = ct
        if ct.canonical_id:
            cid_map.setdefault(ct.canonical_id, []).append(ct)

    # Pairs identified for potential gray-zone LLM adjudication
    gray_candidates: list[tuple[JdTerm, CandTerm, str, float]] = []  # (jd, cand, reason_source, sim)

    # Track pre-resolved decisions or terms needing further stages
    unresolved_jd: list[JdTerm] = []

    for jt in jd_terms:

        # --- Stage 1: Exact match ---
        if jt.norm_name in exact_map:
            ct = exact_map[jt.norm_name]
            sim = 1.0
            credit = CREDITS["exact"] * ct.evidence_factor
            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    best_candidate_term=ct,
                    method="exact",
                    similarity=sim,
                    credit=credit,
                    jd_evidence=jt.evidence,
                    candidate_evidence=ct.evidence,
                )
            )
            stage_counts["exact"] += 1
            continue

        # --- Stage 2: Alias match ---
        if jt.canonical_id and jt.canonical_id in cid_map:
            ct = max(cid_map[jt.canonical_id], key=lambda x: x.evidence_factor)
            sim = 1.0
            credit = CREDITS["alias"] * ct.evidence_factor
            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    best_candidate_term=ct,
                    method="alias",
                    similarity=sim,
                    credit=credit,
                    jd_evidence=jt.evidence,
                    candidate_evidence=ct.evidence,
                )
            )
            stage_counts["alias"] += 1
            continue

        # --- Stage 3: Implied via Taxonomy Graph ---
        best_implied_ct = None
        best_implied_rel = None
        best_implied_credit = 0.0

        if jt.canonical_id:
            for ct in cand_terms:
                if not ct.canonical_id:
                    continue
                # False friends check
                if taxonomy.is_distinct(jt.canonical_id, ct.canonical_id):
                    continue

                rel = taxonomy.relation(ct.canonical_id, jt.canonical_id)
                if rel:
                    base_credit = 0.0
                    if rel == "instance_of":
                        base_credit = CREDITS["implied_instance_of"]
                    elif rel == "implies":
                        base_credit = CREDITS["implied_implies"]
                    elif rel == "general_form":
                        base_credit = CREDITS["implied_general"]
                    elif rel == "sibling":
                        base_credit = CREDITS["implied_sibling"]

                    cand_credit = base_credit * ct.evidence_factor
                    if cand_credit > best_implied_credit:
                        best_implied_credit = cand_credit
                        best_implied_rel = rel
                        best_implied_ct = ct

        if best_implied_ct and best_implied_credit >= 0.80:
            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    best_candidate_term=best_implied_ct,
                    method="implied",
                    similarity=0.90,
                    credit=best_implied_credit,
                    relation=best_implied_rel,
                    jd_evidence=jt.evidence,
                    candidate_evidence=best_implied_ct.evidence,
                )
            )
            stage_counts["implied"] += 1
            continue

        # Otherwise term needs stages 4-7
        unresolved_jd.append(jt)

    # --- Stage 4: Fuzzy & Stage 5: Semantic on Unresolved Terms ---
    # Prepare embeddings if enabled
    jd_embeddings = None
    cand_embeddings = None
    cos_sims = None

    if use_embeddings and unresolved_jd and cand_terms:
        try:
            jd_texts = [f"{jt.raw_name} ({jt.category_code})" for jt in unresolved_jd]
            cand_texts = [f"{ct.raw_name} ({ct.category_code})" for ct in cand_terms]
            jd_embeddings = embedder.embed(jd_texts)
            cand_embeddings = embedder.embed(cand_texts)
            cos_sims = cosine_matrix(jd_embeddings, cand_embeddings)
        except Exception:
            cos_sims = None

    # Process unresolved JD terms
    remaining_for_category_or_unmatched: list[JdTerm] = []

    for idx, jt in enumerate(unresolved_jd):
        best_cand: CandTerm | None = None
        best_method = None
        best_sim = 0.0
        best_credit = 0.0

        # RapidFuzz check against all candidate terms
        for c_idx, ct in enumerate(cand_terms):
            if jt.canonical_id and ct.canonical_id and taxonomy.is_distinct(jt.canonical_id, ct.canonical_id):
                continue

            # Short tokens only exact/alias
            if is_short(jt.norm_name) or is_short(ct.norm_name):
                continue

            # Token set ratio
            ratio = fuzz.token_set_ratio(jt.norm_name, ct.norm_name)

            # Strict subset rule: if one token set strictly contains the other ("python" vs "python django")
            # score is capped at 85 to route to gray zone
            tokens_j = set(jt.norm_name.split())
            tokens_c = set(ct.norm_name.split())
            if tokens_j != tokens_c and (tokens_j.issubset(tokens_c) or tokens_c.issubset(tokens_j)):
                ratio = min(ratio, 85.0)

            if ratio >= THRESHOLDS["fuzzy_accept"]:
                sim = ratio / 100.0
                cand_credit = CREDITS["fuzzy_accept"] * ct.evidence_factor
                if cand_credit > best_credit:
                    best_credit = cand_credit
                    best_sim = sim
                    best_cand = ct
                    best_method = "fuzzy"
            elif ratio >= THRESHOLDS["fuzzy_gray"]:
                gray_candidates.append((jt, ct, "fuzzy", ratio / 100.0))

            # Semantic check if available
            if cos_sims is not None:
                sim = float(cos_sims[idx, c_idx])
                accept_bound = THRESHOLDS["semantic_accept"]
                gray_bound = THRESHOLDS["semantic_gray"]
                if jt.category_code != ct.category_code and "OTHER" not in (
                    jt.category_code,
                    ct.category_code,
                ):
                    accept_bound += THRESHOLDS["cross_category_semantic_boost"]
                    gray_bound += THRESHOLDS["cross_category_semantic_boost"]

                if sim >= accept_bound:
                    cand_credit = CREDITS["semantic_accept"] * ct.evidence_factor
                    if cand_credit > best_credit:
                        best_credit = cand_credit
                        best_sim = sim
                        best_cand = ct
                        best_method = "semantic"
                elif sim >= gray_bound:
                    gray_candidates.append((jt, ct, "semantic", sim))

        if best_cand and best_credit >= 0.85:
            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    best_candidate_term=best_cand,
                    method=best_method,
                    similarity=best_sim,
                    credit=best_credit,
                    jd_evidence=jt.evidence,
                    candidate_evidence=best_cand.evidence,
                )
            )
            stage_counts[best_method] += 1
        else:
            remaining_for_category_or_unmatched.append(jt)

    # --- Stage 6: Batched LLM Adjudication ---
    llm_calls_made = 0
    llm_pairs_processed = 0

    if use_llm and gray_candidates:
        # Group and dedupe gray candidates per JD term
        gray_pairs_to_evaluate: list[GrayPair] = []
        pair_to_terms: dict[str, tuple[JdTerm, CandTerm, float]] = {}

        # Prioritize must-have requirements
        sorted_gray = sorted(gray_candidates, key=lambda x: (0 if x[0].requirement == "must" else 1, -x[3]))

        for jt, ct, _src, sim in sorted_gray:
            # Check if jt already resolved
            if any(d.jd_id == jt.id for d in decisions):
                continue
            pair_id = f"p_{jt.id}_{ct.id}"
            if pair_id not in pair_to_terms and len(gray_pairs_to_evaluate) < MAX_LLM_PAIRS:
                gray_pairs_to_evaluate.append(
                    GrayPair(
                        id=pair_id,
                        jd_skill=jt.raw_name,
                        jd_context=jt.evidence,
                        candidate_skill=ct.raw_name,
                        candidate_context=ct.evidence,
                        category_code=jt.category_code,
                    )
                )
                pair_to_terms[pair_id] = (jt, ct, sim)

        if gray_pairs_to_evaluate:
            verdicts, llm_calls_made = adjudicator.adjudicate(gray_pairs_to_evaluate)
            llm_pairs_processed = len(gray_pairs_to_evaluate)

            for p_id, verdict in verdicts.items():
                if p_id in pair_to_terms:
                    jt, ct, sim = pair_to_terms[p_id]
                    # If this JD term is already decided, continue
                    if any(d.jd_id == jt.id for d in decisions):
                        continue

                    if verdict.verdict == "equivalent":
                        credit = CREDITS["llm_equivalent"] * ct.evidence_factor
                        decisions.append(
                            Decision(
                                jd_id=jt.id,
                                jd_skill=jt.raw_name,
                                category_code=jt.category_code,
                                requirement=jt.requirement,
                                section=jt.section,
                                weight=jt.weight,
                                best_candidate_term=ct,
                                method="llm",
                                similarity=sim,
                                credit=credit,
                                reason=verdict.reason,
                                jd_evidence=jt.evidence,
                                candidate_evidence=ct.evidence,
                            )
                        )
                        stage_counts["llm"] += 1
                        if jt in remaining_for_category_or_unmatched:
                            remaining_for_category_or_unmatched.remove(jt)
                    elif verdict.verdict == "partial":
                        credit = CREDITS["llm_partial"] * ct.evidence_factor
                        decisions.append(
                            Decision(
                                jd_id=jt.id,
                                jd_skill=jt.raw_name,
                                category_code=jt.category_code,
                                requirement=jt.requirement,
                                section=jt.section,
                                weight=jt.weight,
                                best_candidate_term=ct,
                                method="llm",
                                similarity=sim,
                                credit=credit,
                                reason=verdict.reason,
                                jd_evidence=jt.evidence,
                                candidate_evidence=ct.evidence,
                            )
                        )
                        stage_counts["llm"] += 1
                        if jt in remaining_for_category_or_unmatched:
                            remaining_for_category_or_unmatched.remove(jt)

    # --- Stage 7: Category Fallback for Concept Terms ---
    for jt in remaining_for_category_or_unmatched:
        entry = taxonomy.get(jt.canonical_id) if jt.canonical_id else None
        is_concept = entry and entry.kind in ("concept", "soft", "domain")

        cat_code = jt.category_code
        cand_level = 1
        conf_factor = 0.90

        if candidate_levels and cat_code in candidate_levels:
            lvl_val = candidate_levels[cat_code]
            if isinstance(lvl_val, (int, float)):
                cand_level = int(lvl_val)
            elif hasattr(lvl_val, "level"):
                cand_level = lvl_val.level
                conf = getattr(lvl_val, "confidence", "medium")
                conf_factor = 1.0 if conf == "high" else (0.9 if conf == "medium" else 0.75)

        req_level = required_levels.get(cat_code, jt.level_hint or 5)

        if is_concept or jt.norm_name in ("strong cs fundamental", "problem solving", "communication"):
            ratio = min(1.0, cand_level / max(1, req_level))
            credit = round(0.8 * ratio * conf_factor, 3)

            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    method="category",
                    similarity=float(round(ratio, 2)),
                    credit=credit,
                    reason=f"Candidate level {cand_level} vs required {req_level} in {cat_code}",
                    jd_evidence=jt.evidence,
                )
            )
            stage_counts["category"] += 1
        else:
            # Unmatched
            decisions.append(
                Decision(
                    jd_id=jt.id,
                    jd_skill=jt.raw_name,
                    category_code=jt.category_code,
                    requirement=jt.requirement,
                    section=jt.section,
                    weight=jt.weight,
                    method="unmatched",
                    similarity=0.0,
                    credit=0.0,
                    jd_evidence=jt.evidence,
                )
            )

    return decisions, stage_counts, llm_calls_made, llm_pairs_processed
