"""
Unit tests for taxonomy.py
"""

import talent_match.skill_match.sm_taxonomy as taxonomy


def test_taxonomy_resolution():
    assert taxonomy.resolve("PostgreSQL") == "postgresql"
    assert taxonomy.resolve("postgres") == "postgresql"
    assert taxonomy.resolve("psql") == "postgresql"
    assert taxonomy.resolve("k8s") == "kubernetes"
    assert taxonomy.resolve("JS") == "javascript"
    assert taxonomy.resolve("Golang") == "golang"


def test_taxonomy_relations():
    # PostgreSQL is an instance of relational-databases
    assert taxonomy.relation("postgresql", "relational-databases") == "instance_of"

    # relational-databases is general_form of postgresql
    assert taxonomy.relation("relational-databases", "postgresql") == "general_form"

    # Spring Boot implies Java
    assert taxonomy.relation("spring-boot", "java") == "implies"

    # PyTorch implies Python and machine learning
    assert taxonomy.relation("pytorch", "python") == "implies"
    assert taxonomy.relation("pytorch", "machine-learning") == "implies"

    # MySQL and PostgreSQL are siblings
    assert taxonomy.relation("mysql", "postgresql") == "sibling"


def test_taxonomy_false_friends():
    # Java and JavaScript are distinct
    assert taxonomy.is_distinct("java", "javascript") is True
    assert taxonomy.is_distinct("javascript", "java") is True

    # C, C++, C#
    assert taxonomy.is_distinct("c", "cpp") is True
    assert taxonomy.is_distinct("cpp", "csharp") is True

    # SQL and NoSQL
    assert taxonomy.is_distinct("sql-lang", "nosql") is True
    assert taxonomy.is_distinct("relational-databases", "nosql") is True


def test_taxonomy_no_cycles():
    for cid in taxonomy.taxonomy_index.entries:
        anc = taxonomy.ancestors(cid)
        assert cid not in anc, f"Cycle detected in parents for {cid}"

        imp = taxonomy.implies_closure(cid)
        assert cid not in imp, f"Cycle detected in implies for {cid}"
