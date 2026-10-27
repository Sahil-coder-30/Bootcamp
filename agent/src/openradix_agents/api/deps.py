"""Shared FastAPI dependencies."""

import secrets

from fastapi import Header, HTTPException, Request, status

from .services.jobs import JobManager
from .settings import get_settings


def get_jobs(request: Request) -> JobManager:
    return request.app.state.jobs


def require_api_key(x_agent_key: str | None = Header(default=None)) -> None:
    """Enforced only when AGENT_API_KEY is set."""
    expected = get_settings().api_key
    if expected and not (x_agent_key and secrets.compare_digest(x_agent_key, expected)):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid or missing X-Agent-Key")
