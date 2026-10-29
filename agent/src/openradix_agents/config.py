"""
config.py
=========
Central configuration: loads `.env`, exposes model ids and paths, and fails fast
with a clear message when a required key is missing.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[2]
# override=True makes the project's .env the single source of truth. Without it,
# a stale OS-level variable (e.g. a GROQ_API_KEY left over in your Windows user
# environment) silently shadows .env, so editing .env appears to do nothing and
# you get a 401. With override=True, what you put in .env is what gets used.
load_dotenv(ROOT / ".env", override=True)

PROMPTS_DIR = ROOT / "prompts"
OUTPUTS_DIR = ROOT / "outputs"

NVIDIA_MODEL = (os.getenv("NVIDIA_MODEL") or "nvidia/nemotron-3.5-super-vl-120b-a12b")
# A SECOND NVIDIA model. One NVIDIA API key serves many models, so
# this is the easy way to add a third "voice" to the research fan-out without a
# third vendor account — handy when, say, your Gemini free-tier quota is dead.
NVIDIA_MODEL_2 = (os.getenv("NVIDIA_MODEL_2") or "nvidia/nemotron-3.5-lightning-30b-a3b")
GROQ_MODEL = (os.getenv("GROQ_MODEL") or "llama-3.3-70b-versatile")
GEMINI_MODEL = (os.getenv("GEMINI_MODEL") or "gemini-2.0-flash")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))
# Hard ceiling per LLM call (seconds) and SDK-level retries. Without a timeout a
# hung provider blocks the whole pipeline forever.
LLM_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "300"))
LLM_MAX_RETRIES = int(os.getenv("LLM_MAX_RETRIES", "2"))

# Which providers the research fan-out queries, in order. Override in .env to
# swap a dead provider — e.g. drop "gemini" for "nvidia-alt" (a 2nd
# NVIDIA model) by setting:  RESEARCH_PROVIDERS=nvidia,groq,nvidia-alt
RESEARCH_PROVIDERS = tuple(
    p.strip()
    for p in (os.getenv("RESEARCH_PROVIDERS") or "nvidia,groq,gemini").split(",")
    if p.strip()
)

# The single-LLM steps (consolidation, skills, hiring) try this provider first,
# then fall back through RESEARCH_PROVIDERS. Defaults to the first research one.
PRIMARY_PROVIDER = os.getenv("PRIMARY_PROVIDER", "").strip() or (
    RESEARCH_PROVIDERS[0] if RESEARCH_PROVIDERS else "nvidia")


def get_env(key: str, required: bool = True, default: str | None = None) -> str | None:
    value = os.getenv(key, default)
    if required and not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Copy .env.example to .env and fill it in (see PREWORK.md)."
        )
    return value
