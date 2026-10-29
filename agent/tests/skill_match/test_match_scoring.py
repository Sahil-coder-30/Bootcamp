"""
Unit tests for scoring.py and worked example
"""

from talent_match.skill_match.cascade import Decision
from talent_match.skill_match.scoring import compute_counterfactual_impact, score
from talent_match.skill_match.terms import JdTerm


def test_worked_example_scoring():
    """
    Tests scoring.py using the exact worked example from section 3.7:
    Ananya x Google SWE (71 match_score, band good).
    """
    jd_terms = [
        JdTerm(
            id="j1",
            raw_name="Data structures and algorithms",
            norm_name="dsa",
            canonical_id="dsa",
            category_code="DSA",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j2",
            raw_name="Java / C++ / Python / Go",
            norm_name="golang",
            canonical_id="golang",
            category_code="COD",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j3",
            raw_name="Distributed systems",
            norm_name="distributed system",
            canonical_id="distributed-systems",
            category_code="SYSD",
            requirement="must",
            section="responsibilities",
            weight=2.4,
        ),
        JdTerm(
            id="j4",
            raw_name="System design",
            norm_name="system design",
            canonical_id="system-design",
            category_code="SYSD",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j5",
            raw_name="Strong CS fundamentals",
            norm_name="cs fundamentals",
            canonical_id="cs-fundamentals",
            category_code="SWE",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j6",
            raw_name="Software testing",
            norm_name="software testing",
            canonical_id="software-testing",
            category_code="SWE",
            requirement="must",
            section="responsibilities",
            weight=2.4,
        ),
        JdTerm(
            id="j7",
            raw_name="Kubernetes",
            norm_name="kubernetes",
            canonical_id="kubernetes",
            category_code="CLOUD",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j8",
            raw_name="Git",
            norm_name="git",
            canonical_id="git",
            category_code="SWE",
            requirement="must",
            section="requirements",
            weight=3.0,
        ),
        JdTerm(
            id="j9",
            raw_name="Machine learning",
            norm_name="machine learning",
            canonical_id="machine-learning",
            category_code="AI",
            requirement="nice",
            section="skills",
            weight=1.0,
        ),
        JdTerm(
            id="j10",
            raw_name="GCP",
            norm_name="gcp",
            canonical_id="gcp",
            category_code="CLOUD",
            requirement="nice",
            section="skills",
            weight=1.0,
        ),
        JdTerm(
            id="j11",
            raw_name="Open-source contributions",
            norm_name="open source",
            canonical_id=None,
            category_code="SWE",
            requirement="nice",
            section="skills",
            weight=1.0,
        ),
        JdTerm(
            id="j12",
            raw_name="Communication",
            norm_name="communication",
            canonical_id="communication",
            category_code="COMM",
            requirement="nice",
            section="skills",
            weight=1.0,
        ),
    ]

    decisions = [
        Decision(
            jd_id="j1",
            jd_skill="Data structures and algorithms",
            category_code="DSA",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=1.0,
            method="exact",
        ),
        Decision(
            jd_id="j2",
            jd_skill="Java / C++ / Python / Go",
            category_code="COD",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=1.0,
            method="alias",
        ),
        Decision(
            jd_id="j3",
            jd_skill="Distributed systems",
            category_code="SYSD",
            requirement="must",
            section="responsibilities",
            weight=2.4,
            credit=0.9,
            method="llm",
        ),
        Decision(
            jd_id="j4",
            jd_skill="System design",
            category_code="SYSD",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=0.576,
            method="category",
        ),
        Decision(
            jd_id="j5",
            jd_skill="Strong CS fundamentals",
            category_code="SWE",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=0.72,
            method="category",
        ),
        Decision(
            jd_id="j6",
            jd_skill="Software testing",
            category_code="SWE",
            requirement="must",
            section="responsibilities",
            weight=2.4,
            credit=0.50,
            method="llm",
        ),
        Decision(
            jd_id="j7",
            jd_skill="Kubernetes",
            category_code="CLOUD",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=0.0,
            method="unmatched",
        ),
        Decision(
            jd_id="j8",
            jd_skill="Git",
            category_code="SWE",
            requirement="must",
            section="requirements",
            weight=3.0,
            credit=1.0,
            method="exact",
        ),
        Decision(
            jd_id="j9",
            jd_skill="Machine learning",
            category_code="AI",
            requirement="nice",
            section="skills",
            weight=1.0,
            credit=0.72,
            method="implied",
        ),
        Decision(
            jd_id="j10",
            jd_skill="GCP",
            category_code="CLOUD",
            requirement="nice",
            section="skills",
            weight=1.0,
            credit=0.50,
            method="implied",
        ),
        Decision(
            jd_id="j11",
            jd_skill="Open-source contributions",
            category_code="SWE",
            requirement="nice",
            section="skills",
            weight=1.0,
            credit=0.0,
            method="unmatched",
        ),
        Decision(
            jd_id="j12",
            jd_skill="Communication",
            category_code="COMM",
            requirement="nice",
            section="skills",
            weight=1.0,
            credit=0.72,
            method="category",
        ),
    ]

    req_levels = {"DSA": 6, "COD": 6, "SYSD": 5, "OS": 5, "NETW": 4, "CLOUD": 4, "SWE": 5}
    cand_levels = {"DSA": 6, "COD": 6, "SYSD": 4, "OS": 5, "NETW": 4, "CLOUD": 3, "SWE": 5}

    parts = score(decisions, jd_terms, req_levels, cand_levels)

    assert parts.match_score == 71
    assert parts.match_band == "good"
    assert round(parts.must_coverage, 2) == 0.71
    assert round(parts.level_fit, 2) == 0.94
    assert parts.cap == 90  # 1 missing must-have: Kubernetes

    # Counterfactual for Kubernetes
    delta_k8s = compute_counterfactual_impact(
        decisions=decisions,
        jd_terms=jd_terms,
        target_jd_id="j7",
        required_levels=req_levels,
        candidate_levels=cand_levels,
        current_score=parts.match_score,
    )
    assert delta_k8s == 8
