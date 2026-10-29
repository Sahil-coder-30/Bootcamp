"""
providers.py
============
Factories for the three LLM providers, all returning a LangChain chat model with
the same interface (``.invoke(prompt) -> AIMessage``).

* NVIDIA NIM — via ChatOpenAI pointed at the NVIDIA OpenAI-compatible endpoint
* Groq       — via ChatGroq (very fast Llama/Mixtral)
* Gemini     — via ChatGoogleGenerativeAI

Heavy imports are done lazily inside each factory so the module (and the CLI
``--help``) loads even before the LangChain packages are installed.
"""

from . import config


def _nvidia(model: str):
    """One NVIDIA chat model. The key is shared; only the model id changes."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        base_url="https://integrate.api.nvidia.com/v1",
        api_key=config.get_env("NVIDIA_API_KEY"),
        model=model,
        temperature=config.LLM_TEMPERATURE,
        timeout=config.LLM_TIMEOUT,
        max_retries=config.LLM_MAX_RETRIES,
    )


def nvidia_llm():
    return _nvidia(config.NVIDIA_MODEL)


def nvidia_alt_llm():
    """Second NVIDIA model (config.NVIDIA_MODEL_2) — same key, different
    model. Use it as a drop-in third voice when another provider is down."""
    return _nvidia(config.NVIDIA_MODEL_2)


def groq_llm():
    from langchain_groq import ChatGroq
    return ChatGroq(
        api_key=config.get_env("GROQ_API_KEY"),
        model=config.GROQ_MODEL,
        temperature=config.LLM_TEMPERATURE,
        timeout=config.LLM_TIMEOUT,
        max_retries=config.LLM_MAX_RETRIES,
    )


def gemini_llm():
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        google_api_key=config.get_env("GOOGLE_API_KEY"),
        model=config.GEMINI_MODEL,
        temperature=config.LLM_TEMPERATURE,
        timeout=config.LLM_TIMEOUT,
        max_retries=config.LLM_MAX_RETRIES,
    )


PROVIDERS = {
    "nvidia": nvidia_llm,
    "nvidia-alt": nvidia_alt_llm,
    "groq": groq_llm,
    "gemini": gemini_llm,
}


def _text(result) -> str:
    """Flatten a chat result to plain text.

    Most providers return ``content`` as a string, but Gemini (and reasoning
    models) can return a list of content parts like ``[{"type": "text",
    "text": "..."}]``. ``str()`` on that list would hand the parsers a Python
    repr instead of the table, so join the text parts explicitly.
    """
    content = getattr(result, "content", result)
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and part.get("type", "text") == "text":
                parts.append(str(part.get("text", "")))
        return "".join(parts)
    return str(content)


def invoke(provider: str, prompt: str) -> str:
    """Run one prompt through one provider and return the text content."""
    if provider not in PROVIDERS:
        raise ValueError(f"unknown provider {provider!r} - valid: {', '.join(PROVIDERS)}")
    llm = PROVIDERS[provider]()
    return _text(llm.invoke(prompt))


def fallback_order(provider_names=()) -> list[str]:
    """PRIMARY_PROVIDER first, then the given providers, without duplicates."""
    order = [config.PRIMARY_PROVIDER, *provider_names, *config.RESEARCH_PROVIDERS]
    return [p for i, p in enumerate(order) if p in PROVIDERS and p not in order[:i]]


def invoke_first(prompt: str, provider_names=(), tag: str = "llm") -> tuple[str, str]:
    """Try providers in fallback order; return ``(provider, text)`` of the first
    one that answers with non-empty text. Raises if every provider fails."""
    errors = []
    for name in fallback_order(provider_names):
        print(f"[{tag}] querying {name} ...")
        try:
            text = invoke(name, prompt)
        except Exception as exc:  # try the next provider
            errors.append(f"{name}: {type(exc).__name__}: {str(exc)[:200]}")
            print(f"[{tag}] {name} FAILED - trying next provider")
            continue
        if text.strip():
            return name, text
        errors.append(f"{name}: empty reply")
    raise RuntimeError("all providers failed: " + " | ".join(errors))
