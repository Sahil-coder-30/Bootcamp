"""io_utils.py — output directory + file writers shared by the agents."""

import csv
import json
import re
from pathlib import Path

from .config import OUTPUTS_DIR

_UNSAFE = re.compile(r"[^\w .&()'-]+")


def company_slug(company: str) -> str:
    """Folder name for a company. Company names now arrive over HTTP, so strip
    path separators and dot-only names: "../../etc" must not escape outputs/."""
    slug = _UNSAFE.sub("_", company.strip()).strip(" ._")
    if not slug:
        raise ValueError(f"invalid company name: {company!r}")
    return slug[:100]


def company_dir(company: str) -> Path:
    """outputs/<company>/ without creating it."""
    d = (OUTPUTS_DIR / company_slug(company)).resolve()
    if d.parent != OUTPUTS_DIR.resolve():
        raise ValueError(f"invalid company name: {company!r}")
    return d


def out_dir(company: str) -> Path:
    d = company_dir(company)
    d.mkdir(parents=True, exist_ok=True)
    return d


def write_json(path: Path, data) -> None:
    Path(path).write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def write_record_csv(path: Path, record: dict) -> None:
    """Wide CSV: one header row of keys, one data row of values."""
    keys = list(record.keys())
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(keys)
        writer.writerow([record.get(k, "") for k in keys])
