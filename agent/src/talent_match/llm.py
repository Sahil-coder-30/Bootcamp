"""
llm.py
======
Structured LLM calls with provider fallback (plan 3.9), shared by the
talent_match roles. Reuses openradix_agents.providers (nvidia, groq, gemini)
and openradix_agents.parsing.extract_json.

For each provider in order: call at temperature 0 -> parse JSON -> validate
with Pydantic. On invalid output, one repair call with the error. On any
other failure (timeout, 429, 5xx, missing key) move to the next provider.
"""

from __future__ import annotations

import logging
import os
import re
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Generic, TypeVar

from pydantic import BaseModel, ValidationError

from openradix_agents import parsing, providers

T = TypeVar("T", bound=BaseModel)
logger = logging.getLogger("talent_match.llm")

PROMPTS_DIR = Path(__file__).resolve().parents[2] / "prompts"


@dataclass
class PromptSpec:
    name: str
    version: str
    system: str
    user: str

    def render(self, variables: dict[str, str]) -> tuple[str, str]:
        user = self.user
        for key, value in variables.items():
            user = user.replace("{{" + key + "}}", value)
        return self.system, user


def load_prompt(name: str) -> PromptSpec:
    """agent/prompts/<name>.md: front matter ``version:``, then ## system / ## example / ## user."""
    raw = (PROMPTS_DIR / f"{name}.md").read_text(encoding="utf-8")
    m = re.match(r"^---\n(.*?)\n---\n(.*)$", raw, re.DOTALL)
    if not m:
        raise ValueError(f"prompt {name} has no front matter")
    front, body = m.groups()
    version = re.search(r"^version:\s*(\S+)", front, re.MULTILINE)
    parts = dict(re.findall(r"^## (\w+)\n(.*?)(?=^## \w+\n|\Z)", body, re.DOTALL | re.MULTILINE))
    system = parts.get("system", "").strip()
    if parts.get("example"):
        system += "\n\nEXAMPLE\n" + parts["example"].strip()
    return PromptSpec(
        name=name,
        version=version.group(1) if version else "v0",
        system=system,
        user=parts.get("user", "").strip(),
    )


@dataclass
class LlmResult(Generic[T]):
    value: T
    provider: str
    model: str
    latency_ms: int
    attempts: list[dict] = field(default_factory=list)


class AllProvidersFailed(RuntimeError):
    def __init__(self, attempts: list[dict]) -> None:
        super().__init__("; ".join(f"{a['provider']}: {a['error']}" for a in attempts) or "no providers")
        self.attempts = attempts


def extract_providers() -> list[str]:
    raw = os.getenv("EXTRACT_PROVIDERS") or os.getenv("RESEARCH_PROVIDERS") or "nvidia,groq,gemini"
    return [p.strip() for p in raw.split(",") if p.strip() in providers.PROVIDERS]


def _model(provider: str, timeout_s: float):
    base = providers.PROVIDERS[provider]()
    try:
        return base.model_copy(update={"temperature": 0.0, "max_retries": 0, "timeout": timeout_s})
    except Exception:  # pragma: no cover - a provider class without these fields
        return base


def _model_name(llm) -> str:
    return str(getattr(llm, "model_name", None) or getattr(llm, "model", None) or "unknown")


def _kind(exc: Exception) -> str:
    text = f"{type(exc).__name__} {exc}".lower()
    if "timeout" in text or "timed out" in text:
        return "timeout"
    if "429" in text or "rate" in text:
        return "rate_limit"
    return "http"


def run_structured(
    schema: type[T],
    prompt: PromptSpec,
    variables: dict[str, str],
    *,
    provider_order: list[str] | None = None,
    repair: int = 1,
    timeout_s: float | None = None,
) -> LlmResult[T]:
    from langchain_core.messages import HumanMessage, SystemMessage

    timeout_s = timeout_s or float(os.getenv("EXTRACT_TIMEOUT_S", "90"))
    system, user = prompt.render(variables)
    attempts: list[dict] = []
    for name in provider_order or extract_providers():
        t0 = time.perf_counter()
        try:
            llm = _model(name, timeout_s)
        except Exception as exc:  # missing API key etc.
            attempts.append({"provider": name, "error": str(exc)[:200], "kind": "config"})
            continue
        messages = [SystemMessage(content=system), HumanMessage(content=user)]
        for attempt in range(repair + 1):
            try:
                text = providers._text(llm.invoke(messages))
            except Exception as exc:
                attempts.append({"provider": name, "error": str(exc)[:200], "kind": _kind(exc)})
                break
            try:
                value = schema.model_validate(parsing.extract_json(text))
            except (ValueError, ValidationError) as exc:  # JSONDecodeError is a ValueError
                attempts.append({"provider": name, "error": str(exc)[:200], "kind": "invalid"})
                if attempt < repair:
                    messages = [
                        *messages,
                        HumanMessage(
                            content=(
                                f"Your answer was not valid: {str(exc)[:800]}\n"
                                "Return the corrected JSON object only, nothing else."
                            )
                        ),
                    ]
                continue
            ms = int((time.perf_counter() - t0) * 1000)
            logger.info(
                "llm provider=%s prompt=%s ms=%d ok=true repair=%d", name, prompt.version, ms, attempt
            )
            return LlmResult(
                value=value, provider=name, model=_model_name(llm), latency_ms=ms, attempts=attempts
            )
        logger.warning("llm provider=%s prompt=%s ok=false", name, prompt.version)
    raise AllProvidersFailed(attempts)
