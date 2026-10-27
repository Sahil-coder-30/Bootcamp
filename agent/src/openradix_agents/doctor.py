"""
doctor.py
=========
Provider health-check. For each of the three LLM providers it verifies the key
is (a) present in your environment and (b) actually accepted by the provider,
using a tiny live "ping" call. Run this BEFORE the pipeline so a bad key is
caught in a few seconds instead of halfway through a research run.

    python -m openradix_agents doctor
    python -m openradix_agents doctor --providers groq gemini

Exit code is 0 when every checked provider works and 1 otherwise, so it also
works as a pre-flight gate in a script.
"""

import os

from . import config, providers

# Which environment variable holds each provider's key.
KEY_FOR = {
    "openrouter": "OPENROUTER_API_KEY",
    "openrouter-alt": "OPENROUTER_API_KEY",  # same key, different model
    "groq": "GROQ_API_KEY",
    "gemini": "GOOGLE_API_KEY",
}

# The model each provider will actually use (from config / .env).
MODEL_FOR = {
    "openrouter": config.OPENROUTER_MODEL,
    "openrouter-alt": config.OPENROUTER_MODEL_2,
    "groq": config.GROQ_MODEL,
    "gemini": config.GEMINI_MODEL,
}

# A deliberately tiny, cheap prompt — we only care that the key is accepted.
PING = "Reply with exactly one word: pong"


def _mask(value: str | None) -> str:
    """Show enough of the key to recognise it without leaking it."""
    if not value:
        return "(missing)"
    v = value.strip()
    if len(v) <= 10:
        return "*" * len(v)
    return f"{v[:5]}...{v[-4:]} (len {len(v)})"


def check_provider(name: str) -> dict:
    """Return a status dict for one provider after a live ping."""
    if name not in KEY_FOR:
        return {
            "provider": name, "key_name": "?", "model": "?",
            "preview": "(unknown provider)", "status": "FAIL",
            "detail": f"unknown provider '{name}' - valid: {', '.join(KEY_FOR)}",
        }
    key_name = KEY_FOR[name]
    resolved = os.getenv(key_name)
    info = {
        "provider": name,
        "key_name": key_name,
        "model": MODEL_FOR[name],
        "preview": _mask(resolved),
        "status": "FAIL",
        "detail": "",
    }
    if not resolved:
        info["status"] = "MISS"
        info["detail"] = f"{key_name} is not set - add it to .env"
        return info
    try:
        reply = providers.invoke(name, PING)
        info["status"] = "OK"
        info["detail"] = " ".join((reply or "").split())[:50] or "(empty reply)"
    except Exception as exc:  # noqa: BLE001 - we want to surface ANY provider error
        first_line = str(exc).splitlines()[0] if str(exc) else ""
        info["detail"] = f"{type(exc).__name__}: {first_line[:150]}"
    return info


_TAG = {"OK": "[ OK ]", "FAIL": "[FAIL]", "MISS": "[MISS]"}


def run(provider_names: tuple = config.RESEARCH_PROVIDERS) -> int:
    """Check every named provider, print a report, return an exit code.

    Defaults to the configured research fan-out, so `doctor` checks exactly the
    providers the pipeline will use.
    """
    print("OpenRADIX provider health-check")
    print(f"  reading keys from: {config.ROOT / '.env'}\n")

    results = [check_provider(name) for name in provider_names]
    width = max(len(r["provider"]) for r in results)
    any_bad = False

    for r in results:
        if r["status"] != "OK":
            any_bad = True
        print(f"{_TAG[r['status']]} {r['provider']:<{width}}  "
              f"{r['key_name']} = {r['preview']}")
        print(f"       model: {r['model']}")
        print(f"       {r['detail']}\n")

    if any_bad:
        print("One or more providers are NOT working. Fix the key(s) above in .env "
              "(the file is the single source of truth), then run doctor again.")
    else:
        print("All providers responded. You're ready to run the pipeline.")
    return 1 if any_bad else 0
