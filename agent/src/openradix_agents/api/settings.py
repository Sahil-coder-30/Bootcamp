"""
settings.py
===========
HTTP-layer settings, read from the environment / agent/.env (prefix ``AGENT_``).
LLM keys and model ids stay in ``openradix_agents.config``.
"""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from .. import config


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="AGENT_", env_file=config.ROOT / ".env", extra="ignore")

    host: str = "0.0.0.0"
    port: int = 8000
    # Origins allowed to call the API straight from a browser. The Express
    # backend calls server-to-server, so this is only for local tooling.
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:4000"]
    # How many pipeline runs may execute at once. Each run makes several long
    # LLM calls, so keep this small to stay inside provider rate limits.
    max_concurrent_jobs: int = 2
    # Finished jobs are kept in memory for this many seconds, then dropped.
    job_ttl_seconds: int = 6 * 60 * 60
    # Optional shared secret. When set, every request (except /health) must send
    # it in the X-Agent-Key header.
    api_key: str | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
