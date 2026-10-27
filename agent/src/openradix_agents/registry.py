"""
registry.py
===========
Loads the two data-driven inputs of the test suite and decides which master
test cases apply to which parameter.

* ``load_metadata()``      -> list of 163 parameter metadata dicts
* ``load_master_cases()``  -> list of generic test-case dicts
* ``applicable_cases(meta, cases)`` -> the cases whose ``applies_when``
  predicate is true for that parameter

``applies_when`` is a tiny Python boolean expression evaluated against the
parameter's metadata (e.g. ``"ac == 'Composite'"`` or ``"data_type == 'url'"``).
"""

import json
from pathlib import Path

# data/ lives two levels up from this file: <level>/src/openradix_tests/registry.py
DATA_DIR = Path(__file__).resolve().parents[2] / "data"

_SAFE_BUILTINS = {"True": True, "False": False, "None": None}


def load_metadata(path: Path | None = None) -> list[dict]:
    path = path or (DATA_DIR / "parameter_metadata.json")
    return json.loads(path.read_text(encoding="utf-8"))


def load_master_cases(path: Path | None = None) -> list[dict]:
    path = path or (DATA_DIR / "master_test_cases.json")
    return json.loads(path.read_text(encoding="utf-8"))


def matches(expr: str, meta: dict) -> bool:
    """Evaluate an ``applies_when`` predicate against a parameter's metadata."""
    try:
        return bool(eval(expr, {"__builtins__": _SAFE_BUILTINS}, dict(meta)))
    except Exception:
        return False


# backwards-compatible private alias
_matches = matches


def applicable_cases(meta: dict, cases: list[dict]) -> list[dict]:
    return [c for c in cases if matches(c.get("applies_when", "False"), meta)]
