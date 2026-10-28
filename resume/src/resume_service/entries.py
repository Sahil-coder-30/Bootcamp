"""
entries.py
==========
Section text -> structured entries (experience, projects, education,
certifications, hackathons, ...). This is the part an LLM would normally do; here
it is layout heuristics + regex + spaCy ORG entities, so the same resume always
gives the same answer and nothing leaves the machine.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal

from . import nlp, patterns, signals
from .contract import Certification, Education, Experience, Hackathon, Project
from .documents import Line

ROLE_WORDS = re.compile(
    r"\b(intern|internship|engineer|developer|analyst|assistant|associate|consultant|scientist|researcher|"
    r"lead|manager|trainee|sde|swe|member|fellow|architect|designer|specialist|executive|programmer|"
    r"administrator|head|founder|co-founder|volunteer|apprentice|officer|representative|tester|qa)\b",
    re.IGNORECASE)
ORG_HINT = re.compile(
    r"\b(pvt|private|ltd|limited|inc|llc|llp|corp|corporation|technologies|technology|solutions|labs?|"
    r"systems|software|services|university|institute|college|foundation|bank|consulting|group|"
    r"startup|studio|ventures|global|india)\b", re.IGNORECASE)
SEP = re.compile(r"\s*(?:\||•|·| — | – | - |,| at | @ )\s*")
DEGREE = re.compile(
    r"\b(b\.?\s?tech|b\.?\s?e\b|b\.?\s?sc|b\.?\s?com|bca|mca|m\.?\s?tech|m\.?\s?e\b|m\.?\s?sc|mba|ph\.?\s?d|"
    r"bachelor(?:'s)?|master(?:'s)?|diploma|class\s*(?:x|xii|10|12)(?:th)?|(?:10|12)th|hsc|ssc|cbse|icse|"
    r"senior secondary|higher secondary|secondary|intermediate|matriculation|b\.?\s?s\b|m\.?\s?s\b)",
    re.IGNORECASE)
INSTITUTION = re.compile(r"\b(university|institute|college|school|iit|nit|iiit|bits|academy|vidyalaya|"
                         r"polytechnic|campus)\b", re.IGNORECASE)


@dataclass
class Entry:
    head: list[Line] = field(default_factory=list)
    body: list[Line] = field(default_factory=list)

    @property
    def head_text(self) -> str:
        return " | ".join(ln.text for ln in self.head)

    @property
    def body_text(self) -> str:
        return "\n".join(ln.text for ln in self.body)

    @property
    def text(self) -> str:
        return "\n".join(ln.text for ln in self.head + self.body)


ACTION_START = re.compile(
    r"^(?:[A-Z][a-z]+ed|Built|Led|Wrote|Ran|Won|Made|Set up|Took|Taught|Drove|Grew|Cut|Spearheaded|Handling|"
    r"Handled|Developing|Building|Working|Responsible|Collaborat\w+|Contribut\w+|Implement\w+|Design\w+|"
    r"Develop\w+|Creat\w+|Manag\w+|Optimi[sz]\w+|Automat\w+|Integrat\w+|Migrat\w+|Deploy\w+|Analy[sz]\w+|"
    r"Maintain\w+|Improv\w+|Reduc\w+|Increas\w+|Achiev\w+|Train\w+|Fine-tun\w+|Architect\w+|Use[ds]?|Using)\b")


def _is_bullet(text: str) -> bool:
    # DOCX/PDF bullets often lose their glyph; a line opening with an action verb is still a bullet
    # (but "Distributed Rate Limiter | Java" is a heading: short, or has a separator)
    return text.startswith("- ") or (bool(ACTION_START.match(text)) and len(text.split()) >= 7
                                     and not re.search(r"\s[|•·]\s", text))


def split_entries(lines: list[Line]) -> list[Entry]:
    """Group a section's lines into entries: 1-3 heading lines, then description lines."""
    entries: list[Entry] = []
    cur: Entry | None = None
    for ln in lines:
        t = ln.text
        sentence = len(t) > 110 or (t.endswith(".") and len(t) > 60)
        is_head = not _is_bullet(t) and not sentence
        if is_head and (cur is None or cur.body or (ln.bold and len(cur.head) >= 2)
                        or (cur.head and patterns.DATE_RANGE.search(cur.head_text)
                            and patterns.DATE_RANGE.search(t))):
            cur = Entry(head=[ln])
            entries.append(cur)
        elif is_head and cur is not None and not cur.body and len(cur.head) < 3:
            cur.head.append(ln)
        else:
            if cur is None:
                cur = Entry()
                entries.append(cur)
            cur.body.append(ln)
    # an entry with a head but no body that is followed by... keep as is; drop empty ones
    return [e for e in entries if e.head or e.body]


def _strip_dates(text: str) -> str:
    text = patterns.DATE_RANGE.sub(" ", text)
    text = re.sub(r"\(\s*\)", " ", text)
    return re.sub(r"\s{2,}", " ", text).strip(" |,-–—:")


def _tidy(part: str) -> str:
    part = re.sub(r"\s{2,}", " ", part).strip(" |,-–—:")
    if part.count("(") > part.count(")"):
        part += ")"
    elif part.count(")") > part.count("("):
        part = part.rstrip(")").strip()
    return part.strip()


def _parts(text: str) -> list[str]:
    return [t for t in (_tidy(p) for p in SEP.split(_strip_dates(text)) if p) if t and t not in "()"]


def _bullet_text(text: str) -> str:
    return text[2:].strip() if _is_bullet(text) else text.strip()


def parse_experience(lines: list[Line], kind_hint: str | None = None) -> list[tuple[Experience, Entry]]:
    out: list[tuple[Experience, Entry]] = []
    for e in split_entries(lines):
        head = e.head_text or (e.body[0].text if e.body else "")
        start, end, _ = patterns.find_date_range(e.text if not e.head else head)
        if start is None and e.head:
            start, end, _ = patterns.find_date_range(e.text)
        parts = [p for p in _parts(head) if not patterns.SINGLE_DATE.fullmatch(p) and len(p) > 1]
        title = next((p for p in parts if ROLE_WORDS.search(p)), None)
        org = next((p for p in parts if p != title and ORG_HINT.search(p)), None)
        if org is None:
            orgs = [o for o in nlp.find_orgs(head) if o != title]
            org = orgs[0] if orgs else next((p for p in parts if p != title and len(p.split()) <= 6), None)
        if title is None and parts:
            title = next((p for p in parts if p != org), None)
        low = head.lower()
        kind: Literal["internship", "job", "research", "volunteer", "freelance"]
        if "intern" in low or kind_hint == "internship":
            kind = "internship"
        elif "research" in low:
            kind = "research"
        elif "volunteer" in low:
            kind = "volunteer"
        elif "freelanc" in low:
            kind = "freelance"
        else:
            kind = "job"
        highlights = [_bullet_text(b.text) for b in e.body][:12]
        exp = Experience(title=title, org=org, kind=kind, start=start, end=end if start else None,
                         months=patterns.months_between(start, end), highlights=highlights)
        if not (title or org or highlights):
            continue
        out.append((exp, e))
    return out


def parse_projects(lines: list[Line]) -> list[tuple[Project, Entry]]:
    out: list[tuple[Project, Entry]] = []
    for e in split_entries(lines):
        if e.head:
            head = e.head[0].text
            body_lines = [ln.text for ln in e.head[1:]] + [ln.text for ln in e.body]
        else:
            head = _bullet_text(e.body[0].text)
            body_lines = [ln.text for ln in e.body[1:]]
        name_part = head
        inline_desc = ""
        m = re.match(r"^(.{3,80}?)\s*(?::| – | — | - )\s+(.{15,})$", head)
        if m and not patterns.DATE_RANGE.match(m.group(2)):
            name_part, inline_desc = m.group(1), m.group(2)
        pieces = _parts(name_part)
        name = pieces[0] if pieces else name_part.strip()
        # "Raft KV Store | Go, gRPC": the rest of the heading is the tech stack
        stack = ", ".join(p for p in pieces[1:] if not patterns.URL.fullmatch(p))
        name = re.sub(r"\s*\(?(?:github|link|demo|live)\)?\s*$", "", name, flags=re.IGNORECASE).strip()
        desc = " ".join(filter(None, [inline_desc] + [_bullet_text(t) for t in body_lines]))
        if stack:
            desc = f"{desc} (Tech: {stack})".strip()
        links = patterns.find_contacts(e.text).links or []
        if not name:
            continue
        out.append((Project(name=name[:120], description=desc[:1500], link=links[0] if links else None), e))
    return out


def parse_education(lines: list[Line]) -> list[Education]:
    blocks: list[list[str]] = []
    cur: list[str] = []
    has_degree = has_inst = False
    for ln in lines:
        t = _bullet_text(ln.text)
        d, i = bool(DEGREE.search(t)), bool(INSTITUTION.search(t))
        if cur and ((d and has_degree) or (i and has_inst and not d and has_degree)):
            blocks.append(cur)
            cur, has_degree, has_inst = [], False, False
        cur.append(t)
        has_degree, has_inst = has_degree or d, has_inst or i
    if cur:
        blocks.append(cur)
    out: list[Education] = []
    for b in blocks:
        text = " | ".join(b)
        degree = next((_strip_dates(x) for x in b if DEGREE.search(x)), None)
        inst = next((_strip_dates(x) for x in b if INSTITUTION.search(x) and _strip_dates(x) != degree), None)
        if degree and inst is None and INSTITUTION.search(degree):
            pieces = [p for p in _parts(degree)]
            inst = next((p for p in pieces if INSTITUTION.search(p)), None)
            degree = next((p for p in pieces if DEGREE.search(p)), degree)
        if degree:
            degree = re.sub(patterns.CGPA.pattern, "", degree, flags=re.IGNORECASE)
            degree = re.sub(r"\s*\|?\s*\d{2}(\.\d+)?\s*%", "", degree).strip(" |,-:")
        years = patterns.YEAR.findall(text)
        if not (degree or inst):
            continue
        out.append(Education(degree=degree or None, institution=inst, year=years[-1] if years else None,
                             score=patterns.find_score(text)))
    return out


def parse_certifications(lines: list[Line]) -> list[Certification]:
    out: list[Certification] = []
    for ln in lines:
        t = _bullet_text(ln.text)
        if len(t) < 3:
            continue
        years = patterns.YEAR.findall(t)
        name = _strip_dates(re.sub(r"\(?\b(?:19|20)\d{2}\b\)?", "", t)).strip(" |,-–")
        name = re.sub(r"\s*(?:\||–|—| - )\s*(?:credential|id|link).*$", "", name, flags=re.IGNORECASE)
        if name:
            out.append(Certification(name=name[:150], issuer=signals.cert_issuer(t), year=years[-1] if years else None))
    return out


def parse_hackathons(lines: list[Line], strict: bool) -> list[Hackathon]:
    """Hackathon entries. ``strict`` (used for the achievements section) keeps only lines
    that name a hackathon/competition."""
    out: list[Hackathon] = []
    for ln in lines:
        t = _bullet_text(ln.text)
        if len(t) < 4 or (strict and not signals.HACKATHON_WORDS.search(t)):
            continue
        if not strict and not signals.HACKATHON_WORDS.search(t) and not signals.hackathon_result(t):
            # descriptive continuation line of the previous hackathon
            continue
        years = patterns.YEAR.findall(t)
        parts = [p for p in _parts(t) if not signals.hackathon_result(p) or signals.HACKATHON_WORDS.search(p)]
        name = next((p for p in parts if signals.HACKATHON_WORDS.search(p)), parts[0] if parts else t)
        name = re.sub(r"\(?\b(?:19|20)\d{2}\b\)?", "", name)
        name = _tidy(re.sub(r"\s*\(.*$", "", name) or name)
        out.append(Hackathon(name=name[:150], result=signals.hackathon_result(t), year=years[-1] if years else None))
    return out


def plain_items(lines: list[Line]) -> list[str]:
    return [_bullet_text(ln.text) for ln in lines if len(_bullet_text(ln.text)) > 2]


def coursework_items(text: str) -> list[str]:
    items = re.split(r"[,;|•\n]", re.sub(r"^[A-Za-z ]{3,30}:\s*", "", text))
    return [i.strip(" -.") for i in items if 2 < len(i.strip(" -.")) < 60]


def skill_tokens(text: str) -> list[tuple[str, str]]:
    """Skills section -> (token, original line). Handles 'Languages: Python, Java (Advanced)'."""
    out: list[tuple[str, str]] = []
    for line in text.splitlines():
        body = _bullet_text(line)
        body = re.sub(r"^[A-Za-z /&+\-]{2,40}:\s*", "", body)
        # "/" is not split here: CI/CD, TCP/IP and PL/SQL are one skill (the caller splits
        # "React/Vue" only when the whole token is unknown).
        for tok in re.split(r"[,;|•]|\s{2,}|\band\b|\s-\s", body):
            tok = re.sub(r"\((?:basic|beginner|intermediate|advanced|expert|proficient|familiar)\)", "", tok,
                         flags=re.IGNORECASE)
            tok = re.sub(r"\s+v?\d+(\.\d+)*$", "", tok).strip(" .()-:*")
            if 1 <= len(tok) <= 40 and not re.fullmatch(r"\d+", tok):
                out.append((tok, line.strip()))
    return out
