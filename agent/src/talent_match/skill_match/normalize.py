"""
normalize.py
============
Surface form normalization for skill names.
"""

from __future__ import annotations

import re
import unicodedata

FILLERS = [
    r"\bexperience with\b",
    r"\bknowledge of\b",
    r"\bproficiency in\b",
    r"\bhands-on\b",
    r"\bhands on\b",
    r"\bstrong\b",
    r"\bfamiliarity with\b",
    r"\bworking with\b",
    r"\bdeep understanding of\b",
]

_FILLER_RE = re.compile("|".join(FILLERS), re.IGNORECASE)
_VERSION_RE = re.compile(r"\b\d+(\.\d+)*(\.[xX])?\b")


def normalize(text: str) -> str:
    """
    Lowercase, NFKC, strip versions ('Python 3.11' -> 'python'),
    drop filler ('experience with'), '&' -> 'and', clean punctuation.
    Preserves '+', '#', and '.' within tokens ('c++', 'c#', '.net', 'node.js').
    """
    if not text:
        return ""

    # NFKC
    s = unicodedata.normalize("NFKC", text).strip().lower()

    # Drop filler phrases
    s = _FILLER_RE.sub(" ", s)

    # & -> and
    s = s.replace("&", " and ")

    # Strip version numbers like 3.11, 2.0
    s = _VERSION_RE.sub(" ", s)

    # Replace / and , with space when normalizing single terms (split_compound handles split)
    s = re.sub(r"[,\t\n\r]+", " ", s)

    # Remove extraneous punctuation, preserving +, #, and internal dots
    # Keep alphanumeric, +, #, ., -, and whitespace
    s = re.sub(r"[^\w\s\+\#\.\-]", " ", s)

    # Strip trailing dots or dashes
    tokens = [t.strip("-") for t in s.split()]
    tokens = [t.rstrip(".") if len(t) > 1 and not t.startswith(".") else t for t in tokens]

    # Simple singularization of last token (if ends with 'ies' -> 'y', or 's' -> '')
    if tokens:
        last = tokens[-1]
        if last.endswith("ies") and len(last) > 4:
            tokens[-1] = last[:-3] + "y"
        elif last.endswith("s") and not last.endswith(("ss", "us", "is", "js")) and len(last) > 3:
            tokens[-1] = last[:-1]

    cleaned = " ".join(t for t in tokens if t)
    return cleaned


def split_compound(text: str) -> list[str]:
    """
    Splits compound skills on '/' or ',' like 'HTML/CSS' -> ['HTML', 'CSS'].
    Does not split 'C/C++' if desired or handles it nicely into ['C', 'C++'].
    """
    if not text:
        return []
    parts = re.split(r"[\/,]|\band\b", text)
    result = []
    for p in parts:
        cleaned = p.strip()
        if cleaned:
            result.append(cleaned)
    return result if result else [text.strip()]


def is_short(norm: str) -> bool:
    """Return True if normalized term is shorter than 4 characters (e.g. 'go', 'c', 'sql')."""
    return len(norm.strip()) < 4

