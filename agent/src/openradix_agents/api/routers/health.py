"""Liveness and provider checks."""

from fastapi import APIRouter, Depends
from fastapi.concurrency import run_in_threadpool

from ... import config
from ...providers import fallback_order
from ..deps import get_jobs, require_api_key
from ..schemas import DoctorRequest, DoctorResponse, HealthResponse
from ..services import providers as provider_service
from ..services.jobs import JobManager

router = APIRouter(tags=["health"])


@router.get("/healthz")
@router.get("/readyz")
def k8s_probes() -> dict[str, str]:
    """Kubernetes liveness and readiness probe endpoint."""
    return {"status": "ok"}


@router.get("/health", response_model=HealthResponse)
def health(jobs: JobManager = Depends(get_jobs)) -> HealthResponse:
    """Cheap liveness check. Makes no LLM calls."""
    from importlib.metadata import PackageNotFoundError, version

    try:
        ver = version("openradix-agents")
    except PackageNotFoundError:
        ver = "dev"
    return HealthResponse(
        version=ver,
        providers=list(config.RESEARCH_PROVIDERS),
        primary_provider=fallback_order()[0] if fallback_order() else config.PRIMARY_PROVIDER,
        keys_present=provider_service.keys_present(config.RESEARCH_PROVIDERS),
        jobs=jobs.counts(),
    )


@router.post("/doctor", response_model=DoctorResponse, dependencies=[Depends(require_api_key)])
async def doctor(body: DoctorRequest | None = None) -> DoctorResponse:
    """Live-ping each provider (a few seconds). Same as `python -m openradix_agents doctor`."""
    results = await run_in_threadpool(provider_service.check_all, (body.providers if body else None))
    return DoctorResponse(ok=all(r["status"] == "OK" for r in results), results=results)
