"""
artifacts.py
============
Read-only access to ``outputs/<company>/``: list the files a run produced and
load one of them.
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from ... import io_utils
from ..schemas import ArtifactInfo

# Only these files are served. Everything else in the folder stays private.
ALLOWED = {
    "golden_record.json", "golden_record.csv", "skill_matrix.json", "skill_matrix.csv",
    "hiring_rounds.json", "data_quality_report.json", "data_quality_report.md",
    "consolidation_raw.txt", "skill_matrix_raw.txt", "hiring_raw.txt",
}


def _is_research_file(name: str) -> bool:
    return name.startswith("research_") and name.endswith(".json")


def is_allowed(name: str) -> bool:
    return name in ALLOWED or (_is_research_file(name) and "/" not in name and ".." not in name)


def list_artifacts(company: str) -> list[ArtifactInfo]:
    folder = io_utils.company_dir(company)
    if not folder.is_dir():
        return []
    out = []
    for path in sorted(folder.iterdir()):
        if path.is_file() and is_allowed(path.name):
            st = path.stat()
            out.append(ArtifactInfo(
                name=path.name, size=st.st_size,
                modified_at=datetime.fromtimestamp(st.st_mtime, tz=timezone.utc)))
    return out


def artifact_path(company: str, name: str) -> Path | None:
    if not is_allowed(name):
        return None
    path = io_utils.company_dir(company) / name
    return path if path.is_file() else None


def load_json(company: str, name: str):
    path = artifact_path(company, name)
    return None if path is None else json.loads(path.read_text(encoding="utf-8"))
