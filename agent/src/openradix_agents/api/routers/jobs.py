"""Poll background jobs."""

from fastapi import APIRouter, Depends, HTTPException, Query, status

from ..deps import get_jobs, require_api_key
from ..schemas import Job, JobList
from ..services.jobs import JobManager

router = APIRouter(prefix="/jobs", tags=["jobs"], dependencies=[Depends(require_api_key)])


@router.get("", response_model=JobList)
def list_jobs(
    company: str | None = None, limit: int = Query(50, ge=1, le=200), jobs: JobManager = Depends(get_jobs)
) -> JobList:
    return JobList(jobs=jobs.list(company=company, limit=limit))


@router.get("/{job_id}", response_model=Job)
def get_job(job_id: str, jobs: JobManager = Depends(get_jobs)) -> Job:
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"job {job_id} not found")
    return job
