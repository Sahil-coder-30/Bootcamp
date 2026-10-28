"""
patterns.py
===========
Deterministic regex parsing for contacts, links, education scores, dates,
competitive programming ranks, and PII redaction before LLM calls.
"""

from __future__ import annotations

import re
from datetime import datetime

from talent_match.resume.models import Contact, Rank

EMAIL_RE = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b")
PHONE_RE = re.compile(r"(?:(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}|\b\+?[1-9]\d{1,14}\b)")
LINK_RE = re.compile(
    r"\b(?:https?://)?(?:www\.)?(?:github\.com/[A-Za-z0-9_.-]+|linkedin\.com/in/[A-Za-z0-9_.-]+|leetcode\.com/(?:u/)?[A-Za-z0-9_.-]+|codeforces\.com/profile/[A-Za-z0-9_.-]+|kaggle\.com/[A-Za-z0-9_.-]+|[A-Za-z0-9_.-]+\.(?:dev|me|io|tech|com|in))\b",
    re.IGNORECASE,
)
SCORE_RE = re.compile(
    r"\b(?:\d\.\d{1,2}(?:\s*/\s*10)?\s*(?:CGPA|GPA|CPI)?|\d{2}(?:\.\d+)?\s*%)\b", re.IGNORECASE
)
DATE_RANGE_RE = re.compile(
    r"(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{2}/\d{4}|\d{4}-\d{2}|\b\d{4}\b)\s*(?:–|-|to)\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4}|\d{2}/\d{4}|\d{4}-\d{2}|\b\d{4}\b|present|current)",
    re.IGNORECASE,
)
RANK_PATTERNS = [
    (
        re.compile(r"LeetCode\s*(?:Contest\s*Rating|Rating|Rank)?\s*[:\-]?\s*(\d{3,4})", re.IGNORECASE),
        "LeetCode",
    ),
    (
        re.compile(
            r"Codeforces\s*(?:Rating|Rank)?\s*[:\-]?\s*"
            r"(\d{3,4}|\b(?:Expert|Specialist|Candidate Master|Master)\b)",
            re.IGNORECASE,
        ),
        "Codeforces",
    ),
    (
        re.compile(
            r"(?:ICPC|ACM\s*ICPC)\s*[:\-]?\s*([A-Za-z0-9\s]+(?:Regional|World\s*Finalist|Rank\s*\d+))",
            re.IGNORECASE,
        ),
        "ICPC",
    ),
    (re.compile(r"\b(?:AIR|All India Rank)\s*[:\-]?\s*(\d+)", re.IGNORECASE), "AIR"),
]


def find_contacts(text: str) -> Contact:
    """Extract email, phone, links, and candidate name deterministically."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    raw_header = "\n".join(lines[:12]) if lines else ""

    # Email
    email_match = EMAIL_RE.search(raw_header) or EMAIL_RE.search(text)
    email = email_match.group(0) if email_match else None

    # Phone
    phone_match = PHONE_RE.search(raw_header) or PHONE_RE.search(text)
    phone = None
    if phone_match:
        raw_p = phone_match.group(0).replace(" ", "").replace("-", "")
        if not raw_p.startswith("+") and len(raw_p) == 10:
            phone = f"+91{raw_p}"
        else:
            phone = raw_p

    # Links
    links: list[str] = []
    for m in LINK_RE.finditer(raw_header + "\n" + text):
        url = m.group(0)
        if url not in links:
            links.append(url)

    # Name extraction heuristic from top 5 lines
    candidate_name = "Candidate"
    confidence = "medium"
    for line in lines[:5]:
        clean = re.sub(r"[^A-Za-z\s]", "", line).strip()
        tokens = clean.split()
        if 2 <= len(tokens) <= 4 and all(t[0].isupper() for t in tokens if t):
            candidate_name = clean
            if email and any(t.lower() in email.lower() for t in tokens):
                confidence = "high"
            break

    return Contact(
        name=candidate_name,
        email=email,
        phone=phone,
        links=links[:5],
        confidence=confidence,
    )


def find_scores(text: str) -> list[str]:
    """Find CGPA, percentage or grade indicators."""
    return [m.group(0) for m in SCORE_RE.finditer(text)]


def parse_date_range(s: str) -> tuple[str | None, str | None]:
    """Parse start and end dates from a range string."""
    m = DATE_RANGE_RE.search(s)
    if not m:
        return (None, None)
    parts = re.split(r"\s*(?:–|-|to)\s*", m.group(0), flags=re.IGNORECASE)
    if len(parts) != 2:
        return (None, None)

    start_raw, end_raw = parts[0].strip(), parts[1].strip()

    def norm_date(raw: str) -> str | None:
        if raw.lower() in ("present", "current", "now"):
            return "present"
        # Try Month YYYY
        for fmt in ("%b %Y", "%B %Y", "%m/%Y", "%Y-%m", "%Y"):
            try:
                dt = datetime.strptime(raw, fmt)
                return dt.strftime("%Y-%m")
            except ValueError:
                pass
        return raw

    return (norm_date(start_raw), norm_date(end_raw))


def months_between(start: str | None, end: str | None) -> int:
    """Calculate duration in months between start and end (defaults to 3)."""
    if not start:
        return 3
    try:
        dt_start = datetime.strptime(start[:7], "%Y-%m")
        if not end or end.lower() == "present":
            dt_end = datetime.now()
        else:
            dt_end = datetime.strptime(end[:7], "%Y-%m")
        months = (dt_end.year - dt_start.year) * 12 + (dt_end.month - dt_start.month)
        return max(1, months)
    except Exception:
        return 3


def find_ranks(text: str) -> list[Rank]:
    """Detect competitive ranks and ratings."""
    ranks: list[Rank] = []
    for pat, platform in RANK_PATTERNS:
        for m in pat.finditer(text):
            val = m.group(1).strip()
            ranks.append(Rank(platform=platform, rank_val=val, raw_text=m.group(0)))
    return ranks


def redact_pii(text: str, contact: Contact) -> str:
    """Mask email, phone, and specific URLs before passing text to 3rd-party LLM."""
    redacted = text
    if contact.email:
        redacted = redacted.replace(contact.email, "[EMAIL]")
    if contact.phone:
        redacted = redacted.replace(contact.phone, "[PHONE]")
    for i, link in enumerate(contact.links, 1):
        redacted = redacted.replace(link, f"[LINK_{i}]")

    # Generic regex redaction cleanup
    redacted = EMAIL_RE.sub("[EMAIL]", redacted)
    redacted = PHONE_RE.sub("[PHONE]", redacted)
    return redacted
