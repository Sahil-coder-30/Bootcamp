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

OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL", "anthropic/claude-3.5-sonnet")
# A SECOND OpenRouter model. OpenRouter is one key in front of many models, so
# this is the easy way to add a third "voice" to the research fan-out without a
# third vendor account — handy when, say, your Gemini free-tier quota is dead.
OPENROUTER_MODEL_2 = os.getenv("OPENROUTER_MODEL_2", "nvidia/nemotron-nano-9b-v2:free")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.2"))

# Which providers the research fan-out queries, in order. Override in .env to
# swap a dead provider — e.g. drop "gemini" for "openrouter-alt" (a 2nd
# OpenRouter model) by setting:  RESEARCH_PROVIDERS=openrouter,groq,openrouter-alt
RESEARCH_PROVIDERS = tuple(
    p.strip()
    for p in os.getenv("RESEARCH_PROVIDERS", "openrouter,groq,gemini").split(",")
    if p.strip()
)


def get_env(key: str, required: bool = True, default: str | None = None) -> str | None:
    value = os.getenv(key, default)
    if required and not value:
        raise RuntimeError(
            f"Missing required environment variable: {key}. "
            f"Copy .env.example to .env and fill it in (see PREWORK.md)."
        )
    return value
