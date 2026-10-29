"""
Unit tests for normalize.py
"""

from talent_match.skill_match.normalize import is_short, normalize, split_compound


def test_normalize_version_stripping():
    assert normalize("Python 3.11") == "python"
    assert normalize("Python 3.11.4") == "python"
    assert normalize("Java 17") == "java"
    assert normalize("PostgreSQL 15.2") == "postgresql"


def test_normalize_filler_phrases():
    assert normalize("Experience with Node.js") == "node.js"
    assert normalize("Hands-on proficiency in React") == "react"
    assert normalize("Deep understanding of Kubernetes") == "kubernete"


def test_normalize_punctuation_preservation():
    # C++, C#, .NET, Node.js preserved
    assert normalize("C++") == "c++"
    assert normalize("C#") == "c#"
    assert normalize(".NET Core") == ".net core"
    assert normalize("Node.js") == "node.js"


def test_split_compound():
    assert split_compound("HTML/CSS") == ["HTML", "CSS"]
    assert split_compound("React and Redux") == ["React", "Redux"]
    assert split_compound("Python, Go, Java") == ["Python", "Go", "Java"]


def test_is_short():
    assert is_short("go") is True
    assert is_short("c") is True
    assert is_short("r") is True
    assert is_short("sql") is True
    assert is_short("java") is False
    assert is_short("python") is False
