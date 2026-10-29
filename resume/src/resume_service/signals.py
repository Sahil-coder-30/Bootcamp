"""
signals.py
==========
Lexicon-based signals that the level model needs (plan 3.5 / 3.7), detected
without an LLM: leadership, quantified impact, production use, creation
(novel / published / OSS with users), soft signals for COMM, APTI and SWE,
hackathon results and certification tiers.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

LEADERSHIP = re.compile(
    r"\b(led|lead|leading|designed|architected|architect|owned|own(?:ed|ing)? the|spearheaded|mentored|mentoring|"
    r"headed|managed a team|managed|founded|co-founded|initiated|drove|driving|coordinated|captain|president|"
    r"head of|team lead|tech lead|reviewed|code reviews?)\b", re.IGNORECASE)
QUANTIFIED = re.compile(
    r"(\d+(?:\.\d+)?\s*%|\b\d+(?:\.\d+)?\s*[xX]\b|\b\d[\d,.]*\s*(?:k|K|M|million|lakh|crore)?\+?\s*"
    r"(?:users|customers|requests|rps|qps|ops|downloads|stars|visitors|transactions|records|rows|tickets|"
    r"students|members|participants|teams|clients|queries|images|documents|events|messages|calls|"
    r"ms|milliseconds|seconds|hours|minutes|people)\b|p9\d\b|\$\s?\d|₹\s?\d|\binr\s?\d)", re.IGNORECASE)
PRODUCTION = re.compile(
    r"\b(production|deployed|shipped|live|launched|released|in prod|real users|customers|clients|"
    r"rolled out|used by|serving|play store|app store)\b", re.IGNORECASE)
CREATION = re.compile(
    r"\b(published|publication|paper|patent|ieee|springer|acm|arxiv|conference|journal|"
    r"open[- ]source (?:library|package|project|tool)|maintainer|maintained|npm package|pypi package|"
    r"\d[\d,.]*k?\+?\s*(?:github )?stars|novel|invented)\b", re.IGNORECASE)

SOFT_SIGNALS: dict[str, list[tuple[re.Pattern[str], float, str]]] = {
    "COMM": [
        (re.compile(r"\b(client[- ]facing|customer[- ]facing|customer support|technical support|support "
                    r"engineer|help ?desk|tickets?|stakeholders?|clients?)\b", re.I), 2.5, "client-facing"),
        (re.compile(r"\b(presented|presentation|talk|speaker|spoke at|webinar|workshop|conducted|taught|"
                    r"teaching assistant|\bta\b|tutor|mentor(?:ed|ing)?|trained)\b", re.I), 1.0, "talks/teaching"),
        (re.compile(r"\b(documentation|technical writ|blog|article|wrote (?:the )?docs|content writer|editor)\b",
                    re.I), 1.0, "writing"),
        (re.compile(r"\b(debate|mun|model united nations|anchor|host(?:ed)?|toastmasters|elocution)\b", re.I), 1.0,
         "public speaking"),
        (re.compile(r"\b(president|secretary|coordinator|head|lead|captain|organi[sz]ed|organi[sz]er)\b", re.I),
         1.0, "leadership role"),
    ],
    "APTI": [
        (re.compile(r"\b(aptitude|quantitative|logical reasoning|puzzle|olympiad|ntse|kvpy|jee|gate|cat "
                    r"percentile|percentile|air \d+|all india rank|rank \d+)\b", re.I), 1.0, "aptitude exam"),
        (re.compile(r"\b(optimi[sz]ed|reduced|improved|root cause|troubleshoot|debugged|diagnosed|"
                    r"analy[sz]ed)\b", re.I), 1.0, "problem solving"),
    ],
    "SWE": [
        (re.compile(r"\b(unit tests?|test coverage|ci/cd|code reviews?|pull requests?|agile|scrum|sprints?|"
                    r"refactor(?:ed|ing)?|git workflow|tdd|documentation|jira)\b", re.I), 1.0, "engineering practice"),
    ],
}

HACKATHON_WORDS = re.compile(r"\b(hackathon|hack|ideathon|codefest|datathon|buildathon|sih|smart india|"
                             r"devfolio|mlh|challenge|competition|contest)\b", re.IGNORECASE)
RESULT_PATTERNS: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"\b(winner|won|1st|first place|first prize|champion|gold)\b", re.I), "Winner"),
    (re.compile(r"\b(runner[- ]?up|2nd|second place|second prize|silver|3rd|third place|bronze)\b", re.I),
     "Runner-up"),
    (re.compile(r"\btop\s*(\d+)\b", re.I), "Top N"),
    (re.compile(r"\b(finalist|finals|shortlisted)\b", re.I), "Finalist"),
    (re.compile(r"\b(participa\w*|participant|attended)\b", re.I), "Participant"),
]

CERT_ISSUERS = {
    "aws": "AWS", "amazon": "AWS", "azure": "Microsoft", "microsoft": "Microsoft", "google": "Google",
    "gcp": "Google", "oracle": "Oracle", "nptel": "NPTEL", "coursera": "Coursera", "udemy": "Udemy",
    "cisco": "Cisco", "ccna": "Cisco", "kubernetes": "CNCF", "cka": "CNCF", "ckad": "CNCF", "hashicorp": "HashiCorp",
    "terraform": "HashiCorp", "meta": "Meta", "ibm": "IBM", "deeplearning.ai": "DeepLearning.AI",
    "nvidia": "NVIDIA", "mongodb": "MongoDB", "red hat": "Red Hat", "linux foundation": "Linux Foundation",
    "hackerrank": "HackerRank", "infosys": "Infosys", "edx": "edX", "udacity": "Udacity", "salesforce": "Salesforce",
}
PRO_CERT = re.compile(r"\b(associate|professional|specialty|expert|architect|administrator|developer|cka|ckad|"
                      r"ccna|ccnp|rhce|rhcsa|elite|gold|topper)\b", re.IGNORECASE)


@dataclass
class Signals:
    leadership: bool = False
    quantified: bool = False
    production: bool = False
    creation: bool = False


def detect(text: str) -> Signals:
    return Signals(
        leadership=bool(LEADERSHIP.search(text)),
        quantified=bool(QUANTIFIED.search(text)),
        production=bool(PRODUCTION.search(text)),
        creation=bool(CREATION.search(text)),
    )


def soft_signals(text: str) -> list[tuple[str, float, str, str]]:
    """(category, base points, label, evidence line) for each line with a soft signal."""
    out: list[tuple[str, float, str, str]] = []
    for line in text.splitlines():
        for cat, patterns in SOFT_SIGNALS.items():
            best: tuple[float, str] | None = None
            for pat, pts, label in patterns:
                if pat.search(line) and (best is None or pts > best[0]):
                    best = (pts, label)
            if best:
                out.append((cat, best[0], best[1], line.strip()))
    return out


def hackathon_result(text: str) -> str | None:
    for pat, label in RESULT_PATTERNS:
        m = pat.search(text)
        if m:
            if label == "Top N":
                n = int(m.group(1))
                return "Winner" if n == 1 else f"Top {n}"
            return label
    return None


def is_podium(result: str | None) -> bool:
    if not result:
        return False
    if result in ("Winner", "Runner-up"):
        return True
    m = re.match(r"Top (\d+)", result)
    return bool(m and int(m.group(1)) <= 3)


def cert_issuer(text: str) -> str | None:
    low = text.lower()
    for key, issuer in CERT_ISSUERS.items():
        if re.search(rf"(?<![a-z]){re.escape(key)}(?![a-z])", low):
            return issuer
    return None


def cert_is_professional(text: str) -> bool:
    return bool(PRO_CERT.search(text))
