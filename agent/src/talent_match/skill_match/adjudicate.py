"""
adjudicate.py
=============
Stage 6: Batched LLM adjudication for gray-zone skill pairs with structured output and cache.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Literal

from pydantic import BaseModel, Field

from talent_match.skill_match.params import PROMPT_VERSION

logger = logging.getLogger("talent_match.adjudicate")

SNAPSHOT_VERDICTS_PATH = (
    Path(__file__).resolve().parent.parent.parent.parent / "data" / "snapshots" / "skill_pair_verdicts.json"
)


class GrayPair(BaseModel):
    id: str
    jd_skill: str
    jd_context: str = ""
    candidate_skill: str
    candidate_context: str = ""
    category_code: str = ""


class Verdict(BaseModel):
    id: str
    verdict: Literal["equivalent", "partial", "unrelated"]
    reason: str = Field(default="", max_length=150)


class AdjudicationResponse(BaseModel):
    verdicts: list[Verdict] = Field(default_factory=list)


class Adjudicator:
    """
    Handles batched LLM adjudication with provider fallback and snapshot cache.
    """

    def __init__(self):
        self.verdicts_cache: dict[str, Verdict] = {}
        self._load_snapshot_cache()
        self._disabled = os.getenv("SKILL_MATCH_USE_LLM", "true").lower() in ("false", "0", "no")

    def _load_snapshot_cache(self):
        if SNAPSHOT_VERDICTS_PATH.exists():
            try:
                with open(SNAPSHOT_VERDICTS_PATH, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    for k, v in data.items():
                        self.verdicts_cache[k] = Verdict(**v)
            except Exception as e:
                logger.warning(f"Failed to load snapshot verdicts: {e}")

    def _cache_key(self, jd_skill: str, cand_skill: str) -> str:
        return f"{jd_skill.strip().lower()}:::{cand_skill.strip().lower()}:::{PROMPT_VERSION}"

    def adjudicate(self, pairs: list[GrayPair], budget: int = 40) -> tuple[dict[str, Verdict], int]:
        """
        Adjudicate gray pairs in at most one batched call.
        Returns (dict of id -> Verdict, number of LLM calls made).
        """
        results: dict[str, Verdict] = {}
        missing_pairs: list[GrayPair] = []

        # Check local cache first
        for p in pairs:
            ck = self._cache_key(p.jd_skill, p.candidate_skill)
            if ck in self.verdicts_cache:
                v = self.verdicts_cache[ck]
                results[p.id] = Verdict(id=p.id, verdict=v.verdict, reason=v.reason)
            else:
                missing_pairs.append(p)

        if not missing_pairs or self._disabled:
            # For any remaining missing pair when disabled or offline, default to partial or unrelated
            for p in missing_pairs:
                results[p.id] = Verdict(
                    id=p.id,
                    verdict="unrelated",
                    reason="LLM adjudication skipped or cached out",
                )
            return results, 0

        # Enforce budget cap
        to_call = missing_pairs[:budget]
        llm_calls = 0

        try:
            from openradix_agents.providers import get_chat_model

            model = get_chat_model(temperature=0.0)
            structured_model = model.with_structured_output(AdjudicationResponse)

            system_prompt = (
                "You are a strict technical recruiter. For each pair decide whether"
                " the candidate's skill satisfies the job requirement.\n"
                "Definitions:\n"
                "- equivalent: a recruiter would tick this requirement as met"
                " (same skill, synonym, or the candidate skill is a specific"
                " instance of the required general skill).\n"
                "- partial: adjacent or transferable; candidate needs weeks,"
                " not months. General for specific is partial.\n"
                "- unrelated: anything else. Different languages are unrelated"
                " (Java vs JavaScript). SQL vs NoSQL is partial at most.\n"
                "Answer only with JSON matching schema."
            )

            user_payload = {
                "pairs": [
                    {
                        "id": p.id,
                        "jd_skill": p.jd_skill,
                        "jd_context": p.jd_context,
                        "candidate_skill": p.candidate_skill,
                        "candidate_context": p.candidate_context,
                    }
                    for p in to_call
                ]
            }

            resp: AdjudicationResponse = structured_model.invoke(
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(user_payload)},
                ]
            )
            llm_calls += 1

            for v in resp.verdicts:
                results[v.id] = v
                # Update cache
                matching_p = next((p for p in to_call if p.id == v.id), None)
                if matching_p:
                    ck = self._cache_key(matching_p.jd_skill, matching_p.candidate_skill)
                    self.verdicts_cache[ck] = v

        except Exception as e:
            logger.warning(f"Adjudication LLM call failed: {e}. Falling back gracefully.")
            for p in to_call:
                # Heuristic fallback if LLM network fails
                results[p.id] = Verdict(id=p.id, verdict="unrelated", reason="Adjudication network fallback")

        # Any pairs beyond budget
        for p in missing_pairs[budget:]:
            results[p.id] = Verdict(id=p.id, verdict="unrelated", reason="Budget limit reached")

        return results, llm_calls
