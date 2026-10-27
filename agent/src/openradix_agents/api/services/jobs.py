"""
jobs.py
=======
Background job runner for long pipeline runs.

A full run makes several LLM calls and takes minutes, far longer than an HTTP
request should stay open. So ``POST /run`` only enqueues a job and returns its
id; a small thread pool executes it and the client polls ``GET /jobs/{id}``.

State lives in memory, which is enough for one agent process. To scale out to
several workers, swap ``JobManager`` for one backed by Redis or Postgres; the
routers only use ``submit``, ``get``, ``list`` and ``counts``.
"""

import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone

from ...pipeline import STEPS, run_pipeline
from ..schemas import Job, JobStatus, StepState

_ACTIVE = (JobStatus.queued, JobStatus.running)


class CompanyBusyError(RuntimeError):
    """A job for this company is already queued or running."""

    def __init__(self, job: Job):
        super().__init__(f"a job for {job.company!r} is already {job.status.value} ({job.id})")
        self.job = job


def _now() -> datetime:
    return datetime.now(timezone.utc)


class JobManager:
    def __init__(self, max_workers: int = 2, ttl_seconds: int = 6 * 60 * 60):
        self._pool = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="pipeline")
        self._jobs: dict[str, Job] = {}
        self._lock = threading.Lock()
        self._ttl = ttl_seconds

    # ------------------------------------------------------------------ public
    def submit(self, company: str, providers: tuple[str, ...],
               steps: tuple[str, ...] | None) -> Job:
        selected = [s for s in STEPS if steps is None or s in steps]
        with self._lock:
            self._evict_expired()
            # Two runs for one company would write the same output files.
            for job in self._jobs.values():
                if job.status in _ACTIVE and job.company.lower() == company.lower():
                    raise CompanyBusyError(job)
            job = Job(id=uuid.uuid4().hex, company=company, providers=list(providers),
                      steps={s: StepState() for s in selected}, created_at=_now())
            self._jobs[job.id] = job
        self._pool.submit(self._execute, job.id, company, providers, tuple(selected))
        return self.get(job.id)

    def get(self, job_id: str) -> Job | None:
        with self._lock:
            job = self._jobs.get(job_id)
            return job.model_copy(deep=True) if job else None

    def list(self, company: str | None = None, limit: int = 50) -> list[Job]:
        with self._lock:
            self._evict_expired()
            jobs = [j for j in self._jobs.values()
                    if company is None or j.company.lower() == company.lower()]
            jobs.sort(key=lambda j: j.created_at, reverse=True)
            return [j.model_copy(deep=True) for j in jobs[:limit]]

    def counts(self) -> dict[str, int]:
        with self._lock:
            out = {s.value: 0 for s in JobStatus}
            for j in self._jobs.values():
                out[j.status.value] += 1
            return out

    def shutdown(self) -> None:
        self._pool.shutdown(wait=False, cancel_futures=True)

    # ----------------------------------------------------------------- private
    def _update(self, job_id: str, **changes) -> None:
        with self._lock:
            job = self._jobs[job_id]
            for k, v in changes.items():
                setattr(job, k, v)

    def _on_step(self, job_id: str, step: str, status: str, detail: dict) -> None:
        with self._lock:
            job = self._jobs[job_id]
            job.steps[step] = StepState(
                status=status, seconds=detail.get("seconds"),
                result=detail.get("result"), error=detail.get("error"))
            job.current_step = step if status == "running" else None

    def _execute(self, job_id: str, company: str, providers: tuple[str, ...],
                 steps: tuple[str, ...]) -> None:
        self._update(job_id, status=JobStatus.running, started_at=_now())
        try:
            summary = run_pipeline(
                company, providers, steps,
                on_step=lambda step, status, detail: self._on_step(job_id, step, status, detail))
        except Exception as exc:  # noqa: BLE001 - surface anything to the client
            self._update(job_id, status=JobStatus.failed, current_step=None,
                         error=f"{type(exc).__name__}: {exc}", finished_at=_now())
            return
        status = JobStatus.succeeded if summary["ok"] else JobStatus.partial
        if not any(s["status"] == "ok" for s in summary["steps"].values()):
            status = JobStatus.failed
        self._update(job_id, status=status, current_step=None, finished_at=_now())

    def _evict_expired(self) -> None:
        cutoff = _now().timestamp() - self._ttl
        for job_id in [j.id for j in self._jobs.values()
                       if j.finished_at and j.finished_at.timestamp() < cutoff]:
            del self._jobs[job_id]
