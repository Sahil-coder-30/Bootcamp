"""Start pipeline runs and run the offline validation step."""

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.concurrency import run_in_threadpool

from ... import config, validation_agent
from ..deps import get_jobs, require_api_key
from ..schemas import CompanyRequest, Job, RunRequest, ValidationResponse
from ..services.jobs import CompanyBusyError, JobManager

router = APIRouter(tags=["pipeline"], dependencies=[Depends(require_api_key)])


@router.post("/run", response_model=Job, status_code=status.HTTP_202_ACCEPTED)
def run(body: RunRequest, response: Response, jobs: JobManager = Depends(get_jobs)) -> Job:
    """Queue a pipeline run. Returns at once; poll `GET /jobs/{id}` for progress."""
    providers = tuple(body.providers or config.RESEARCH_PROVIDERS)
    steps = tuple(body.steps) if body.steps else None
    try:
        job = jobs.submit(body.company, providers, steps)
    except CompanyBusyError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, str(exc)) from exc
    response.headers["Location"] = f"/jobs/{job.id}"
    return job


@router.post("/validate", response_model=ValidationResponse)
async def validate(body: CompanyRequest) -> ValidationResponse:
    """Re-run the data-quality checks on a saved golden record (no LLM, ~1s)."""
    report = await run_in_threadpool(validation_agent.run, body.company)
    if report.get("missing_record"):
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"no golden record for {body.company!r} - run the pipeline first")
    failed = len(report["failures"])
    return ValidationResponse(company=body.company, checks=report["checks"],
                              passed=report["checks"] - failed, failed=failed,
                              failures=report["failures"])
