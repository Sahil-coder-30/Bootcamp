"""io_utils.py — output directory + file writers shared by the agents."""

import csv
import json
from pathlib import Path

from .config import OUTPUTS_DIR


def out_dir(company: str) -> Path:
    d = OUTPUTS_DIR / company.replace("/", "_")
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
