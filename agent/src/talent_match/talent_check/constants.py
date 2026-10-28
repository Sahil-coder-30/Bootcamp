"""
constants.py
============
Tunable constants, categories, Bloom mappings, and thresholds for Role 4: Talent Check.
All versioned under SCORING_VERSION = "tc-1.0".
"""

from typing import Final

SCORING_VERSION: Final[str] = "tc-1.0"

# Canonical 12 skill categories in skill_set_id order
CODES: Final[tuple[str, ...]] = (
    "COD",  # 1: Coding
    "DSA",  # 2: Data Structures and Algorithms
    "APTI",  # 3: Aptitude and Problem Solving
    "COMM",  # 4: Communication Skills
    "OOD",  # 5: Object-Oriented Programming and Design
    "AI",  # 6: AI Native Engineering
    "SQL",  # 7: SQL and Design
    "SYSD",  # 8: System Design and Architecture
    "CLOUD",  # 9: DevOps and Cloud
    "SWE",  # 10: Software Engineering
    "NETW",  # 11: Computer Networking
    "OS",  # 12: Operating System
)

CODE_TO_ID: Final[dict[str, int]] = {code: idx + 1 for idx, code in enumerate(CODES)}
ID_TO_CODE: Final[dict[int, str]] = {idx + 1: code for idx, code in enumerate(CODES)}

CODE_NAMES: Final[dict[str, str]] = {
    "COD": "Coding",
    "DSA": "Data Structures and Algorithms",
    "APTI": "Aptitude and Problem Solving",
    "COMM": "Communication Skills",
    "OOD": "Object-Oriented Programming and Design",
    "AI": "AI Native Engineering",
    "SQL": "SQL and Design",
    "SYSD": "System Design and Architecture",
    "CLOUD": "DevOps and Cloud",
    "SWE": "Software Engineering",
    "NETW": "Computer Networking",
    "OS": "Operating System",
}

# Bloom proficiency mappings (1-10 -> 2-letter code)
BLOOM_BANDS: Final[dict[int, str]] = {
    1: "CU",
    2: "CU",
    3: "AP",
    4: "AP",
    5: "AS",
    6: "AS",
    7: "EV",
    8: "EV",
    9: "CR",
    10: "CR",
}

BLOOM_NAMES: Final[dict[str, str]] = {
    "CU": "Conceptual Understanding",
    "AP": "Application",
    "AS": "Analysis & Synthesis",
    "EV": "Evaluation",
    "CR": "Creation",
}

# Readiness Thresholds
READY_THRESHOLD: Final[int] = 80
ALMOST_THRESHOLD: Final[int] = 60
BLOCKING_SHORTFALL: Final[int] = 3  # Gap of >= 3 levels is a full Bloom band short

# Confidence Uncertainty delta
CONFIDENCE_DELTA: Final[dict[str, int]] = {
    "high": 0,
    "medium": 1,
    "low": 2,
}

# Study Plan Effort hours per target level band
EFFORT_HOURS: Final[dict[str, int]] = {
    "CU": 4,
    "AP": 8,
    "AS": 12,
    "EV": 20,
    "CR": 30,
}

# Staging raw regex pattern (e.g. "8-CR", "4-AS")
RAW_BLOOM_REGEX: Final[str] = r"^(\d{1,2})-(CU|AP|AS|EV|CR)$"
