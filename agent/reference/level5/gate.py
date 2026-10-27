"""
gate.py
=======
The SECOND validation gate: replays the Level-3 metadata-driven rules against a
golden record (a dict keyed by column name) and returns the list of failures.

Invokes the rule library directly as functions (no pytest subprocess), so it can
run inside a LangGraph node.
"""

from . import registry, rules


def check_record(record: dict) -> list[dict]:
    meta_rows = registry.load_metadata()
    cases = registry.load_master_cases()
    failures = []
    for meta in meta_rows:
        value = record.get(meta["parameter"], "")
        for case in registry.applicable_cases(meta, cases):
            rule_fn = rules.REGISTRY.get(case["rule_id"])
            if rule_fn is None:
                continue
            message = rule_fn(value, meta)
            if message:
                failures.append({
                    "parameter": meta["parameter"],
                    "case_id": case["case_id"],
                    "rule_id": case["rule_id"],
                    "severity": case.get("severity", "error"),
                    "message": message,
                })
    return failures


def errors_only(failures: list[dict]) -> list[dict]:
    return [f for f in failures if f.get("severity") == "error"]
