"""
Unit tests for cascade.py
"""

from talent_match.skill_match.adjudicate import Adjudicator
from talent_match.skill_match.cascade import run_cascade
from talent_match.skill_match.embeddings import SnapshotEmbedder
from talent_match.skill_match.terms import CandTerm, JdTerm


def test_cascade_exact_and_alias():
    jd_terms = [
        JdTerm(id="j1", raw_name="Python", norm_name="python", canonical_id="python", category_code="COD"),
        JdTerm(
            id="j2",
            raw_name="Kubernetes",
            norm_name="kubernete",
            canonical_id="kubernetes",
            category_code="CLOUD",
        ),
    ]
    cand_terms = [
        CandTerm(id="c1", raw_name="Python", norm_name="python", canonical_id="python", category_code="COD"),
        CandTerm(id="c2", raw_name="k8s", norm_name="k8", canonical_id="kubernetes", category_code="CLOUD"),
    ]

    decisions, counts, _, _ = run_cascade(
        jd_terms=jd_terms,
        cand_terms=cand_terms,
        candidate_levels={},
        required_levels={},
        embedder=SnapshotEmbedder(),
        adjudicator=Adjudicator(),
        use_llm=False,
    )

    d_map = {d.jd_id: d for d in decisions}
    assert d_map["j1"].method == "exact"
    assert d_map["j1"].credit == 1.0

    assert d_map["j2"].method == "alias"
    assert d_map["j2"].credit == 1.0


def test_cascade_implied():
    # PostgreSQL for relational-databases -> instance_of (0.90)
    # Spring Boot for Java -> implies (0.80)
    jd_terms = [
        JdTerm(
            id="j1",
            raw_name="Relational Databases",
            norm_name="relational database",
            canonical_id="relational-databases",
            category_code="SQL",
        ),
        JdTerm(id="j2", raw_name="Java", norm_name="java", canonical_id="java", category_code="COD"),
    ]
    cand_terms = [
        CandTerm(
            id="c1",
            raw_name="PostgreSQL",
            norm_name="postgresql",
            canonical_id="postgresql",
            category_code="SQL",
        ),
        CandTerm(
            id="c2",
            raw_name="Spring Boot",
            norm_name="spring boot",
            canonical_id="spring-boot",
            category_code="SWE",
        ),
    ]

    decisions, counts, _, _ = run_cascade(
        jd_terms=jd_terms,
        cand_terms=cand_terms,
        candidate_levels={},
        required_levels={},
        embedder=SnapshotEmbedder(),
        adjudicator=Adjudicator(),
        use_llm=False,
    )

    d_map = {d.jd_id: d for d in decisions}
    assert d_map["j1"].method == "implied"
    assert d_map["j1"].relation == "instance_of"
    assert d_map["j1"].credit == 0.90

    assert d_map["j2"].method == "implied"
    assert d_map["j2"].relation == "implies"
    assert d_map["j2"].credit == 0.80


def test_cascade_false_friends_blocked():
    # Java should never match JavaScript
    jd_terms = [
        JdTerm(id="j1", raw_name="Java", norm_name="java", canonical_id="java", category_code="COD"),
    ]
    cand_terms = [
        CandTerm(
            id="c1",
            raw_name="JavaScript",
            norm_name="javascript",
            canonical_id="javascript",
            category_code="COD",
        ),
    ]

    decisions, counts, _, _ = run_cascade(
        jd_terms=jd_terms,
        cand_terms=cand_terms,
        candidate_levels={},
        required_levels={},
        embedder=SnapshotEmbedder(),
        adjudicator=Adjudicator(),
        use_llm=False,
    )

    assert decisions[0].method == "unmatched"
    assert decisions[0].credit == 0.0
