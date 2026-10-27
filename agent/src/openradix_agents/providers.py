"""
providers.py
============
Factories for the three LLM providers, all returning a LangChain chat model with
the same interface (``.invoke(prompt) -> AIMessage``).

* OpenRouter — via ChatOpenAI pointed at the OpenRouter base URL (one key, many models)
* Groq       — via ChatGroq (very fast Llama/Mixtral)
* Gemini     — via ChatGoogleGenerativeAI

Heavy imports are done lazily inside each factory so the module (and the CLI
``--help``) loads even before the LangChain packages are installed.
"""

from . import config


def _openrouter(model: str):
    """One OpenRouter chat model. The key is shared; only the model id changes."""
    from langchain_openai import ChatOpenAI
    return ChatOpenAI(
        base_url="https://openrouter.ai/api/v1",
        api_key=config.get_env("OPENROUTER_API_KEY"),
        model=model,
        temperature=config.LLM_TEMPERATURE,
    )


def openrouter_llm():
    return _openrouter(config.OPENROUTER_MODEL)


def openrouter_alt_llm():
    """Second OpenRouter model (config.OPENROUTER_MODEL_2) — same key, different
    model. Use it as a drop-in third voice when another provider is down."""
    return _openrouter(config.OPENROUTER_MODEL_2)


def groq_llm():
    from langchain_groq import ChatGroq
    return ChatGroq(
        api_key=config.get_env("GROQ_API_KEY"),
        model=config.GROQ_MODEL,
        temperature=config.LLM_TEMPERATURE,
    )


def gemini_llm():
    from langchain_google_genai import ChatGoogleGenerativeAI
    return ChatGoogleGenerativeAI(
        google_api_key=config.get_env("GOOGLE_API_KEY"),
        model=config.GEMINI_MODEL,
        temperature=config.LLM_TEMPERATURE,
    )


PROVIDERS = {
    "openrouter": openrouter_llm,
    "openrouter-alt": openrouter_alt_llm,
    "groq": groq_llm,
    "gemini": gemini_llm,
}


def invoke(provider: str, prompt: str) -> str:
    """Run one prompt through one provider and return the text content."""
    llm = PROVIDERS[provider]()
    result = llm.invoke(prompt)
    return getattr(result, "content", str(result))
