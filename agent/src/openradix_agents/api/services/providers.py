"""Provider health checks for the API (wraps ``doctor.check_provider``)."""

import os
from concurrent.futures import ThreadPoolExecutor

from ... import config, doctor


def keys_present(names) -> dict[str, bool]:
    """Cheap check (no network): is each provider's key set?"""
    return {n: bool(os.getenv(doctor.KEY_FOR.get(n, ""), "")) for n in names}


def check_all(names) -> list[dict]:
    """Live ping of every provider, in parallel so a slow one doesn't add up."""
    names = list(names or config.RESEARCH_PROVIDERS)
    with ThreadPoolExecutor(max_workers=max(1, len(names))) as pool:
        return list(pool.map(doctor.check_provider, names))
