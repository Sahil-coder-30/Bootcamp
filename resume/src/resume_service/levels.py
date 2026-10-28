"""
levels.py
=========
Level inference ``lv-1.0`` (role-2 plan, section 3.7): a deterministic points
model on the shared evidence -> Bloom rubric.

1. evidence units, one per (category, context entry), so keyword stuffing does not pay
2. depth (quantified / leadership) and recency multipliers
3. points -> level 1..10
4. Bloom gates, so a pile of weak evidence cannot reach a high band
5. confidence + a one-line template basis (never free text)

All weights are the module constants below and are tuned globally, never per candidate.
"""

from __future__ import annotations

from collections import defaultdict
from dataclasses import dataclass

from .contract import CATEGORY_CODES, CategoryLevelDetail, Confidence

# Base points per evidence unit (plan 3.7, step 1).
BASE: dict[str, float] = {
    "listed": 0.5, "listed_cap": 1.0,
    "coursework": 0.5, "coursework_cap": 0.5,
    "cert_foundational": 0.75, "cert_professional": 1.5,
    "project": 1.5,
    "hackathon": 1.5, "hackathon_podium_bonus": 1.0,
    "experience": 2.5, "experience_per_quarter": 0.5, "experience_bonus_cap": 1.5,
    "soft_signal": 1.0, "soft_signal_comm": 1.5, "soft_signal_client": 2.5,
    # each extra distinct skill of the same category used in one entry (cap below)
    "breadth_per_skill": 0.5, "breadth_cap": 1.5,
    # contest ratings say more about DSA than about general aptitude
    "competitive_apti_factor": 0.75,
    "publication": 3.0,
}
COMPETITIVE: dict[int, float] = {1: 1.5, 2: 2.5, 3: 4.0}  # 200+ problems / 1600-1999 / 2000+ or ICPC
SOFT_CAP_PER_CATEGORY = 3
DEPTH_STEP, DEPTH_CAP = 0.25, 1.5
OLD_RECENCY, OLD_AFTER_MONTHS = 0.8, 36
# upper bound of each level band: P <= bound -> level; above the last bound -> 10
THRESHOLDS: list[tuple[float, int]] = [
    (0.0, 1), (1.0, 2), (2.5, 3), (4.0, 4), (6.0, 5), (8.5, 6), (11.0, 7), (14.0, 8), (18.0, 9)]

APPLIED_KINDS = frozenset({"project", "experience", "hackathon", "competitive", "soft_signal", "publication"})
BLOOM = {1: "CU", 2: "CU", 3: "AP", 4: "AP", 5: "AS", 6: "AS", 7: "EV", 8: "EV", 9: "CR", 10: "CR"}


def bloom(level: int) -> str:
    return BLOOM[max(1, min(10, level))]


@dataclass
class Unit:
    category: str
    # listed | coursework | certification | project | experience | hackathon | competitive
    # | soft_signal | publication
    kind: str
    base: float
    ref: str  # short label for the basis, e.g. "Raft KV store"
    evidence: str = ""
    leadership: bool = False
    quantified: bool = False
    production: bool = False
    creation: bool = False
    top_rank: bool = False
    old: bool = False

    @property
    def applied(self) -> bool:
        return self.kind in APPLIED_KINDS

    @property
    def points(self) -> float:
        if self.kind in ("listed", "coursework"):
            return self.base  # capped per category in score_category
        depth = min(DEPTH_CAP, 1 + DEPTH_STEP * self.quantified + DEPTH_STEP * self.leadership)
        recency = OLD_RECENCY if self.old else 1.0
        return self.base * depth * recency


def points_to_level(p: float) -> int:
    for bound, level in THRESHOLDS:
        if p <= bound:
            return level
    return 10


def _gate_cap(units: list[Unit]) -> tuple[int, str | None]:
    applied = [u for u in units if u.applied]
    certs = [u for u in units if u.kind == "certification"]
    has_exp = any(u.kind == "experience" for u in units)
    if not applied and not certs:
        return 2, "G-AP"
    if not (len(applied) >= 2 or has_exp):
        return 4, "G-AS"
    strong = any(u.leadership or u.top_rank or (u.production and u.quantified) for u in applied)
    if not (strong and (has_exp or len(applied) >= 3)):
        return 6, "G-EV"
    if not any(u.creation for u in applied):
        return 8, "G-CR"
    return 10, None


_GATE_REASON = {"G-AP": "no applied use", "G-AS": "needs 2+ uses or an internship",
                "G-EV": "no lead/design evidence", "G-CR": "no published/novel work"}


def score_category(code: str, units: list[Unit]) -> CategoryLevelDetail:
    if not units:
        return CategoryLevelDetail(level=1, bloom="CU", confidence="low", basis="no evidence", points=0.0)
    listed = min(BASE["listed_cap"], sum(u.base for u in units if u.kind == "listed"))
    course = min(BASE["coursework_cap"], sum(u.base for u in units if u.kind == "coursework"))
    soft = sorted((u for u in units if u.kind == "soft_signal"), key=lambda u: -u.points)[:SOFT_CAP_PER_CATEGORY]
    others = [u for u in units if u.kind not in ("listed", "coursework", "soft_signal")]
    total = listed + course + sum(u.points for u in others + soft)
    raw = points_to_level(total)
    cap, gate = _gate_cap(units)
    level = min(raw, cap)
    gate_applied = gate if raw > cap else None

    applied = [u for u in others + soft if u.applied]
    confidence: Confidence
    if len(applied) >= 2:
        confidence = "high"
    elif applied or any(u.kind == "certification" for u in units):
        confidence = "medium"
    else:
        confidence = "low"

    basis = _basis(units, level, gate_applied)
    evidence = [u.evidence[:160] for u in sorted(others + soft, key=lambda u: -u.points) if u.evidence][:5]
    return CategoryLevelDetail(level=level, bloom=bloom(level), confidence=confidence, basis=basis,
                               points=round(total, 3), evidence=evidence, gate_applied=gate_applied)


def _basis(units: list[Unit], level: int, gate: str | None) -> str:
    groups: dict[str, list[str]] = defaultdict(list)
    for u in units:
        if u.ref and u.ref not in groups[u.kind]:
            groups[u.kind].append(u.ref)
    names = [("experience", "internship/job"), ("project", "project"), ("hackathon", "hackathon"),
             ("competitive", "contest signal"), ("publication", "publication"), ("certification", "cert"),
             ("soft_signal", "signal"), ("listed", "listed skill"), ("coursework", "course")]
    parts: list[str] = []
    for kind, label in names:
        refs = groups.get(kind)
        if not refs:
            continue
        n = len(refs)
        plural = "s" if n > 1 and not label.endswith("job") else ""
        shown = ", ".join(r[:28] for r in refs[:2])
        parts.append(f"{n} {label}{plural} ({shown})")
    flags = []
    if any(u.leadership for u in units if u.applied):
        flags.append("led/designed")
    if any(u.quantified for u in units if u.applied):
        flags.append("quantified")
    if any(u.top_rank for u in units):
        flags.append("top rank")
    text = " + ".join(parts[:3])
    if flags:
        text += " · " + ", ".join(flags)
    text += f" → {level} {bloom(level)}"
    if gate:
        text += f" · capped: {_GATE_REASON[gate]}"
    if len(text) > 140:
        text = text[:137] + "..."
    return text


def infer_levels(units: list[Unit]) -> dict[str, CategoryLevelDetail]:
    by_cat: dict[str, list[Unit]] = defaultdict(list)
    for u in units:
        if u.category in CATEGORY_CODES:
            by_cat[u.category].append(u)
    return {code: score_category(code, by_cat.get(code, [])) for code in CATEGORY_CODES}


def skill_level_hint(units: list[Unit]) -> int | None:
    """level_hint for one skill: the same model run on that skill's own units only."""
    if not units:
        return None
    return score_category("skill", units).level
