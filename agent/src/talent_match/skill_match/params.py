"""
params.py
=========
Tunable parameters, thresholds, and weights for Role 5 Skill Matching.
Matching engine version: sm-1.0
"""

from __future__ import annotations

MATCHING_VERSION = "sm-1.0"
TAXONOMY_VERSION = "tx-1.0"
PROMPT_VERSION = "sm-adj-v1"

# Cascade thresholds
THRESHOLDS = {
    "fuzzy_accept": 92.0,
    "fuzzy_gray": 78.0,
    "semantic_accept": 0.88,
    "semantic_gray": 0.76,
    "cross_category_semantic_boost": 0.04,
    "min_char_length_for_fuzzy": 4,
}

# Credits per match method / verdict
CREDITS = {
    "exact": 1.00,
    "alias": 1.00,
    "implied_instance_of": 0.90,
    "implied_implies": 0.80,
    "implied_general": 0.60,
    "implied_sibling": 0.50,
    "fuzzy_accept": 0.95,
    "semantic_accept": 0.90,
    "llm_equivalent": 0.90,
    "llm_partial": 0.50,
    "llm_unrelated": 0.00,
}

# Candidate evidence confidence factor multipliers
EVIDENCE_FACTORS = {
    "high": 1.00,
    "medium": 0.90,
    "low": 0.75,
}

# JD requirement weights
BASE_WEIGHTS = {
    "must": 3.0,
    "nice": 1.0,
}

# Section weights
SECTION_FACTOR = {
    "requirements": 1.0,
    "skills": 1.0,
    "responsibilities": 0.8,
    "education": 0.6,
    "other": 0.6,
}

# Overall scoring weights
WEIGHTS = {
    "must": 0.60,
    "nice": 0.20,
    "level": 0.20,
}

MAX_LLM_PAIRS = 40
