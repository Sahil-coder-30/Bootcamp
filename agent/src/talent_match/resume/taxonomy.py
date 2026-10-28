"""
taxonomy.py
===========
Canonical skill normalization mapping skills to standard canonical_id and Bloom category_code.
"""

from __future__ import annotations

import re

# (canonical_id, category_code)
SKILL_TAXONOMY: dict[str, tuple[str, str]] = {
    # COD - Coding & Core Languages
    "python": ("python", "COD"),
    "python3": ("python", "COD"),
    "java": ("java", "COD"),
    "c++": ("cpp", "COD"),
    "cpp": ("cpp", "COD"),
    "c": ("c", "COD"),
    "go": ("go", "COD"),
    "golang": ("go", "COD"),
    "rust": ("rust", "COD"),
    "javascript": ("javascript", "COD"),
    "typescript": ("typescript", "COD"),
    "scala": ("scala", "COD"),
    "kotlin": ("kotlin", "COD"),
    "ruby": ("ruby", "COD"),
    "c#": ("csharp", "COD"),
    # DSA - Data Structures & Algorithms
    "dsa": ("dsa", "DSA"),
    "algorithms": ("algorithms", "DSA"),
    "data structures": ("data-structures", "DSA"),
    "dynamic programming": ("dynamic-programming", "DSA"),
    "graphs": ("graphs", "DSA"),
    "trees": ("trees", "DSA"),
    "sorting": ("sorting", "DSA"),
    "competitive programming": ("competitive-programming", "DSA"),
    "leetcode": ("leetcode", "DSA"),
    # SQL - SQL & Relational Databases
    "sql": ("sql", "SQL"),
    "postgresql": ("postgresql", "SQL"),
    "postgres": ("postgresql", "SQL"),
    "mysql": ("mysql", "SQL"),
    "sqlite": ("sqlite", "SQL"),
    "oracle": ("oracle", "SQL"),
    "pl/sql": ("plsql", "SQL"),
    "database normalization": ("normalization", "SQL"),
    "indexing": ("indexing", "SQL"),
    "redis": ("redis", "SQL"),
    "mongodb": ("mongodb", "SQL"),
    # SYSD - System Design & Distributed Systems
    "system design": ("system-design", "SYSD"),
    "distributed systems": ("distributed-systems", "SYSD"),
    "kafka": ("kafka", "SYSD"),
    "apache kafka": ("kafka", "SYSD"),
    "rabbitmq": ("rabbitmq", "SYSD"),
    "microservices": ("microservices", "SYSD"),
    "grpc": ("grpc", "SYSD"),
    "load balancing": ("load-balancing", "SYSD"),
    "caching": ("caching", "SYSD"),
    "raft": ("raft", "SYSD"),
    "event-driven": ("event-driven", "SYSD"),
    "rate limiting": ("rate-limiting", "SYSD"),
    # CLOUD - DevOps & Cloud
    "cloud": ("cloud", "CLOUD"),
    "aws": ("aws", "CLOUD"),
    "amazon web services": ("aws", "CLOUD"),
    "azure": ("azure", "CLOUD"),
    "gcp": ("gcp", "CLOUD"),
    "google cloud": ("gcp", "CLOUD"),
    "docker": ("docker", "CLOUD"),
    "kubernetes": ("kubernetes", "CLOUD"),
    "k8s": ("kubernetes", "CLOUD"),
    "terraform": ("terraform", "CLOUD"),
    "ci/cd": ("cicd", "CLOUD"),
    "github actions": ("github-actions", "CLOUD"),
    "jenkins": ("jenkins", "CLOUD"),
    "ansible": ("ansible", "CLOUD"),
    # SWE - Software Engineering Practices & Web
    "react": ("react", "SWE"),
    "reactjs": ("react", "SWE"),
    "next.js": ("nextjs", "SWE"),
    "nextjs": ("nextjs", "SWE"),
    "node.js": ("nodejs", "SWE"),
    "nodejs": ("nodejs", "SWE"),
    "express": ("express", "SWE"),
    "django": ("django", "SWE"),
    "flask": ("flask", "SWE"),
    "fastapi": ("fastapi", "SWE"),
    "spring boot": ("spring-boot", "SWE"),
    "rest api": ("rest-api", "SWE"),
    "restful": ("rest-api", "SWE"),
    "graphql": ("graphql", "SWE"),
    "git": ("git", "SWE"),
    "agile": ("agile", "SWE"),
    "unit testing": ("testing", "SWE"),
    # AI - AI Native & Machine Learning
    "machine learning": ("machine-learning", "AI"),
    "deep learning": ("deep-learning", "AI"),
    "pytorch": ("pytorch", "AI"),
    "tensorflow": ("tensorflow", "AI"),
    "scikit-learn": ("scikit-learn", "AI"),
    "llm": ("llm", "AI"),
    "rag": ("rag", "AI"),
    "langchain": ("langchain", "AI"),
    "nlp": ("nlp", "AI"),
    "computer vision": ("computer-vision", "AI"),
    "huggingface": ("huggingface", "AI"),
    # OS - Operating Systems
    "linux": ("linux", "OS"),
    "unix": ("unix", "OS"),
    "operating systems": ("operating-systems", "OS"),
    "multithreading": ("concurrency", "OS"),
    "concurrency": ("concurrency", "OS"),
    "memory management": ("memory-management", "OS"),
    "bash": ("bash", "OS"),
    "shell scripting": ("shell", "OS"),
    # NETW - Computer Networking
    "networking": ("networking", "NETW"),
    "computer networks": ("networking", "NETW"),
    "tcp/ip": ("tcp-ip", "NETW"),
    "http": ("http", "NETW"),
    "dns": ("dns", "NETW"),
    "websockets": ("websockets", "NETW"),
    "tls/ssl": ("tls-ssl", "NETW"),
    # OOD - Object-Oriented Design
    "oop": ("oop", "OOD"),
    "object-oriented programming": ("oop", "OOD"),
    "design patterns": ("design-patterns", "OOD"),
    "solid principles": ("solid", "OOD"),
    # COMM & APTI
    "communication": ("communication", "COMM"),
    "leadership": ("leadership", "COMM"),
    "problem solving": ("problem-solving", "APTI"),
    "aptitude": ("aptitude", "APTI"),
}


def canonicalize(skill_name: str) -> tuple[str, str]:
    """Return (canonical_id, category_code) for any raw skill name."""
    clean = re.sub(r"[^a-zA-Z0-9+#.-]", " ", skill_name).strip().lower()
    if clean in SKILL_TAXONOMY:
        return SKILL_TAXONOMY[clean]

    # Partial / substring scan
    for key, val in SKILL_TAXONOMY.items():
        if re.search(r"\b" + re.escape(key) + r"\b", clean):
            return val

    # Default fallback
    slug = re.sub(r"[^a-z0-9]+", "-", clean).strip("-") or "skill"
    return (slug, "SWE")
