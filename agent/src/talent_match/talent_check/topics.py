"""
topics.py
=========
Topic ladder resolution and text normalization for missing skill levels.
"""

from __future__ import annotations

from talent_match.contract import NextTopic
from talent_match.talent_check.bar import bloom_for
from talent_match.talent_check.constants import BLOOM_NAMES, CODE_NAMES


def clean_text(s: str) -> str:
    """Fix common UTF-8 encoding artifacts (mojibake) in topic text."""
    if not s:
        return ""
    # Map common Windows-1252 / UTF-8 double-encoding artifacts
    replacements = {
        "Ã¢â‚¬â€œ": "–",
        "Ã¢â‚¬â„¢": "'",
        "Ã¢â‚¬Å“": '"',
        "Ã¢â‚¬Â": '"',
        "â€“": "–",
        "â€”": "—",
        "â€™": "'",
        "â€œ": '"',
        "â€": '"',
    }
    cleaned = s
    for bad, good in replacements.items():
        cleaned = cleaned.replace(bad, good)
    return cleaned.strip()


def next_topics_for(
    code: str,
    candidate_level: int,
    required_level: int,
    ladder: dict[str, dict[str, str]] | None = None,
) -> list[NextTopic]:
    """
    Generate next topics for missing levels from candidate_level + 1 to required_level.
    Returns empty list if candidate meets or exceeds bar.
    """
    if candidate_level >= required_level:
        return []

    code_topics = (ladder or {}).get(code, {})
    result: list[NextTopic] = []

    for lvl in range(candidate_level + 1, required_level + 1):
        lvl_str = str(lvl)
        raw_topic = code_topics.get(lvl_str)
        if raw_topic:
            topic_text = clean_text(raw_topic)
        else:
            b_code = bloom_for(lvl)
            b_name = BLOOM_NAMES.get(b_code, b_code)
            skill_name = CODE_NAMES.get(code, code)
            topic_text = f"Level {lvl} ({b_name}): Advanced practice and evaluation in {skill_name}"

        result.append(NextTopic(level=lvl, topics=topic_text))

    return result
