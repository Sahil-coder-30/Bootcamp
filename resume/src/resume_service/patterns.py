"""
patterns.py
===========
Deterministic fields (plan 3.4): contacts, links, dates and durations, CGPA /
percentage, competitive-programming ranks. Pure regex, no model.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

EMAIL = re.compile(r"[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}")
PHONE_IN = re.compile(r"(?<!\d)(?:\+?91[\s\-]?)?[6-9]\d{4}[\s\-]?\d{5}(?!\d)")
PHONE_ANY = re.compile(r"(?<![\d\w])\+?\d[\d\s\-().]{8,16}\d(?!\d)")
URL = re.compile(
    r"(?:https?://)?(?:www\.)?(?:[a-z0-9\-]+\.)+(?:com|in|io|dev|me|org|net|ai|app|co|tech|xyz)(?:/[^\s,;|)]*)?",
    re.IGNORECASE)
PROFILE_HOSTS = ("github.com", "linkedin.com", "leetcode.com", "codeforces.com", "codechef.com", "kaggle.com",
                 "hackerrank.com", "gitlab.com", "medium.com", "dev.to", "behance.net", "huggingface.co")

MONTHS = {m: i for i, m in enumerate(
    ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"], start=1)}
_MONTH_RE = r"(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)"  # noqa: E501
_SEASON_RE = r"(?:summer|winter|spring|fall|autumn)"
_DATE_RE = (rf"(?:{_MONTH_RE}\.?,?\s*'?\d{{2,4}}|{_SEASON_RE}\s+\d{{4}}|\d{{1,2}}[/\-.]\d{{4}}|\d{{4}}[/\-]\d{{1,2}}"
            rf"|(?<!\d)(?:19|20)\d{{2}}(?!\d))")
_PRESENT_RE = r"(?:present|current|now|ongoing|till date|today)"
DATE_RANGE = re.compile(rf"({_DATE_RE})\s*(?:-|–|—|to|until|till|~)\s*({_DATE_RE}|{_PRESENT_RE})", re.IGNORECASE)
SINGLE_DATE = re.compile(_DATE_RE, re.IGNORECASE)
YEAR = re.compile(r"(?<!\d)((?:19|20)\d{2})(?!\d)")

CGPA = re.compile(r"(?:(?:cgpa|gpa|cpi|sgpa)\s*[:\-]?\s*(\d{1,2}(?:\.\d{1,2})?)\s*(?:/\s*(10|4)(?:\.0+)?)?)"
                  r"|(?:(\d{1,2}\.\d{1,2})\s*(?:/\s*(10|4)(?:\.0+)?)?\s*(?:cgpa|gpa|cpi|sgpa))", re.IGNORECASE)
PERCENT = re.compile(r"(\d{2}(?:\.\d{1,2})?)\s*%")


@dataclass
class Contact:
    email: str | None = None
    phone: str | None = None
    links: list[str] | None = None


def find_contacts(text: str) -> Contact:
    emails = EMAIL.findall(text)
    email = emails[0].lower() if emails else None
    stripped = EMAIL.sub(" ", text)
    phone = None
    m = PHONE_IN.search(stripped)
    if m:
        digits = re.sub(r"\D", "", m.group(0))[-10:]
        phone = "+91" + digits
    else:
        for cand in PHONE_ANY.finditer(stripped):
            digits = re.sub(r"\D", "", cand.group(0))
            if 10 <= len(digits) <= 15 and not YEAR.fullmatch(cand.group(0).strip()) and "-" not in cand.group(0)[:5]:
                phone = ("+" if cand.group(0).startswith("+") else "") + digits
                break
    links: list[str] = []
    for u in URL.findall(stripped):
        u = u.rstrip(".")
        low = u.lower()
        if "@" in u or low.endswith((".py", ".js", ".ts", ".java", ".net")) and "/" not in low:
            continue
        if any(h in low for h in PROFILE_HOSTS) or low.startswith(("http", "www.")):
            norm = re.sub(r"^https?://(www\.)?", "", u, flags=re.IGNORECASE).rstrip("/")
            if norm.lower() not in {x.lower() for x in links}:
                links.append(norm)
    return Contact(email=email, phone=phone, links=links)


def strip_urls(text: str) -> str:
    return URL.sub(" ", EMAIL.sub(" ", text))


def normalize_date(s: str) -> str | None:
    s = s.strip().lower().rstrip(".,")
    if re.fullmatch(_PRESENT_RE, s):
        return "present"
    m = re.match(rf"({_MONTH_RE})\.?,?\s*'?(\d{{2,4}})", s)
    if m:
        year = int(m.group(2))
        year = year + 2000 if year < 100 else year
        return f"{year:04d}-{MONTHS[m.group(1)[:3]]:02d}"
    m = re.match(rf"({_SEASON_RE})\s+(\d{{4}})", s)
    if m:
        month = {"summer": 5, "winter": 12, "spring": 2, "fall": 9, "autumn": 9}[m.group(1)]
        return f"{m.group(2)}-{month:02d}"
    m = re.match(r"(\d{1,2})[/\-.](\d{4})", s)
    if m and 1 <= int(m.group(1)) <= 12:
        return f"{m.group(2)}-{int(m.group(1)):02d}"
    m = re.match(r"(\d{4})[/\-](\d{1,2})", s)
    if m and 1 <= int(m.group(2)) <= 12:
        return f"{m.group(1)}-{int(m.group(2)):02d}"
    m = YEAR.search(s)
    return m.group(1) if m else None


def find_date_range(text: str) -> tuple[str | None, str | None, tuple[int, int] | None]:
    m = DATE_RANGE.search(text)
    if m:
        return normalize_date(m.group(1)), normalize_date(m.group(2)), m.span()
    m = SINGLE_DATE.search(text)
    if m:
        return normalize_date(m.group(0)), None, m.span()
    return None, None, None


def months_between(start: str | None, end: str | None, today: tuple[int, int] = (2026, 10)) -> int | None:
    def ym(v: str | None, is_end: bool) -> tuple[int, int] | None:
        if not v:
            return None
        if v == "present":
            return today
        parts = v.split("-")
        if len(parts) == 2:
            return int(parts[0]), int(parts[1])
        return int(parts[0]), (12 if is_end else 1)

    s, e = ym(start, False), ym(end, True)
    if not s or not e:
        return None
    months = (e[0] - s[0]) * 12 + (e[1] - s[1]) + 1
    return months if 0 < months < 600 else None


def find_score(text: str) -> str | None:
    m = CGPA.search(text)
    if m:
        val = m.group(1) or m.group(3)
        scale = m.group(2) or m.group(4) or ("10" if float(val) > 4 else None)
        return f"{val} CGPA" if scale in (None, "10") else f"{val}/{scale} GPA"
    m = PERCENT.search(text)
    if m and 33 <= float(m.group(1)) <= 100:
        return f"{m.group(1)}%"
    return None


# --- competitive programming -----------------------------------------------------

@dataclass
class CompetitiveSignal:
    kind: str  # solved | rating | top_rank
    tier: int  # 1 (200+ problems), 2 (1600-1999 / Specialist), 3 (2000+ / Expert+ / ICPC regional)
    evidence: str


_CF_TIERS = {"newbie": 0, "pupil": 1, "specialist": 2, "expert": 3, "candidate master": 3, "master": 3,
             "international master": 3, "grandmaster": 3}


def find_competitive(text: str) -> list[CompetitiveSignal]:
    out: list[CompetitiveSignal] = []
    for line in text.splitlines():
        line = line.strip().removeprefix("- ")
        low = line.lower()
        m = re.search(r"(\d{3,4})\+?\s*(?:problems|questions|dsa problems)", low)
        if m and int(m.group(1)) >= 200:
            out.append(CompetitiveSignal("solved", 1, line.strip()))
        ratings = [int(x.group(1)) for x in re.finditer(
            r"(?:leetcode|codechef|codeforces|rating|rated)[^0-9\n]{0,40}?(\d{4})(?!\d)", low)
            if 1000 <= int(x.group(1)) <= 4000 and not (1990 <= int(x.group(1)) <= 2035
                                                         and re.search(r"\b(19|20)\d{2}\s*[-–)]", low))]
        if ratings:
            r = max(ratings)
            if r >= 2000:
                out.append(CompetitiveSignal("top_rank", 3, line.strip()))
            elif r >= 1600:
                out.append(CompetitiveSignal("rating", 2, line.strip()))
        m = re.search(r"codeforces[^\n]{0,40}?\b(" + "|".join(sorted(_CF_TIERS, key=len, reverse=True)) + r")\b", low)
        if m and _CF_TIERS[m.group(1)] >= 2:
            out.append(CompetitiveSignal("rating", _CF_TIERS[m.group(1)], line.strip()))
        if re.search(r"\bicpc\b[^\n]*(regional|world finals?|asia)", low):
            out.append(CompetitiveSignal("top_rank", 3, line.strip()))
        m = re.search(r"\b(?:global\s+)?rank\s*(?:of\s*)?#?(\d+)\s*(?:/|out of|of)\s*(\d[\d,]*)", low)
        if m:
            rank, total = int(m.group(1)), int(m.group(2).replace(",", ""))
            if total and rank / total <= 0.01:
                out.append(CompetitiveSignal("top_rank", 3, line.strip()))
        m = re.search(r"\btop\s*(\d+(?:\.\d+)?)\s*%", low)
        if m and any(k in low for k in ("leetcode", "codechef", "codeforces", "contest", "coding", "hackerrank")):
            out.append(CompetitiveSignal("top_rank" if float(m.group(1)) <= 5 else "rating",
                                         3 if float(m.group(1)) <= 5 else 2, line.strip()))
        m = re.search(r"\b(\d)\s*(?:★|\*|star)", low)
        if m and "codechef" in low and int(m.group(1)) >= 4:
            out.append(CompetitiveSignal("top_rank" if int(m.group(1)) >= 5 else "rating",
                                         3 if int(m.group(1)) >= 5 else 2, line.strip()))
    # keep the strongest signal per line
    best: dict[str, CompetitiveSignal] = {}
    for s in out:
        if s.evidence not in best or s.tier > best[s.evidence].tier:
            best[s.evidence] = s
    return list(best.values())
