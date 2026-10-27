"""
main.py
=======
FastAPI app for the research agents.

    python -m openradix_agents serve          # or:
    uvicorn openradix_agents.api.main:app --port 8000

The Express backend proxies ``/api/agent/*`` here (see backend/src/services/agent.service.ts):

    GET  /health                 liveness, no LLM calls
    POST /doctor                 live-ping each provider
    POST /run                    queue a pipeline run  -> 202 + job
    GET  /jobs/{id}              poll a run
    POST /validate               re-run data-quality checks on a saved record
    GET  /companies/{c}/...      read the artifacts a run wrote
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .routers import artifacts, health, jobs, pipeline
from .services.jobs import JobManager
from .settings import Settings, get_settings


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.jobs = JobManager(settings.max_concurrent_jobs, settings.job_ttl_seconds)
        yield
        app.state.jobs.shutdown()

    app = FastAPI(title="OpenRADIX Agents", version="0.5.0", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware, allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST"], allow_headers=["*"])

    @app.exception_handler(ValueError)
    async def value_error(_: Request, exc: ValueError) -> JSONResponse:
        # e.g. io_utils rejecting an unsafe company name
        return JSONResponse(status_code=status.HTTP_400_BAD_REQUEST, content={"detail": str(exc)})

    for module in (health, pipeline, jobs, artifacts):
        app.include_router(module.router)
    return app


app = create_app()


def serve(host: str | None = None, port: int | None = None, reload: bool = False) -> None:
    import uvicorn
    settings = get_settings()
    uvicorn.run("openradix_agents.api.main:app", host=host or settings.host,
                port=port or settings.port, reload=reload)
