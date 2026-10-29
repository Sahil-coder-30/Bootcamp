# 🧩 Resume Service (Role 2: Resume Parsing)

> Fully offline, deterministic resume parser and 12-category Bloom skill level engine for RADIX Talent Match without external LLM or API calls.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Status](https://img.shields.io/badge/status-Production-brightgreen)
![Runtime](https://img.shields.io/badge/runtime-Python%203.12%20%2B%20FastAPI-informational)

---

## 📖 Table of Contents
- [Overview & The "Why"](#-overview--the-why)
- [Built Features & Current State](#-built-features--current-state)
- [Architecture & Design Patterns](#-architecture--design-patterns)
- [Usage & Setup](#-usage--setup)
- [Communication & Contracts](#-communication--contracts)
- [Production Readiness](#-production-readiness)
- [Changelog & Migration State](#-changelog--migration-state)
- [Ownership](#-ownership)

---

## 🎯 Overview & The "Why"

### What this service does
Parses PDF, DOCX, and TXT resumes completely offline without invoking any LLM or third-party API. It extracts structured candidate entities (contact info, work history, education, projects, certifications, CGPA, competitive ranks), maps candidate skills to a 12-category taxonomy (~100 canonical skills, ~900 aliases), and evaluates a deterministic 1–10 Bloom proficiency level (`lv-1.0`) with confidence metrics and evidence basis for each category. It yields an immutable `ResumeExtraction` contract conforming to `docs/00-shared-contract.md` §3.3.

### Why this is its own microservice (not part of a monolith)
- **Bounded context:** Exclusively owns resume layout normalization, AST block parsing, offline entity recognition, taxonomy resolution, and deterministic Bloom points scoring. No other service handles binary document layout analysis or computes resume-inferred category levels.
- **Independent scaling need:** Document parsing is CPU-intensive and memory-bursty (PyMuPDF vector rendering, spaCy NLP NER pipeline, rapidfuzz fuzzy lexicon matching across 1,000+ entries). Placing this inside the I/O-bound Express backend (`backend/`) or the GPU-dependent LLM Agent service (`agent/`) would cause memory starvation and event-loop lag during bulk resume ingest batches.
- **Independent deployability:** Parsing heuristics, section lexicons, `data/taxonomy.json`, and Bloom scoring rules iterate on rapid feedback cycles without requiring redeployments or schema migrations in the Auth service or the main API Gateway.
- **Failure isolation:** Corrupted files, malformed PDF bytecode, or parser exceptions are isolated within this container. If the parser runs out of memory or crashes on an adversarial file, the core platform, authentication flows, candidate profile views, and skill matching remain completely unaffected.
- **Data isolation strategy:** Database-per-service pattern using the dedicated `resumes` table (`migrations/001_resumes.sql`). Original uploaded binaries are stored with SHA256 content addressing in S3 (with SSE-AES256 encryption) or on a dedicated local volume (`data/files/`). No foreign key constraints tie `resumes` to other microservices; cross-service references use UUIDs (`user_id`).

### The "User" of this service
| Caller | Call type | Why it calls this service |
|---|---|---|
| Express Backend (`backend`) | Sync REST (`POST /resumes`, `GET /resumes/{id}`) | Proxies uploads from frontend candidates (`/api/resumes/*`), injects verified `X-User-Id`, and fetches parsed extractions. |
| Role 3 Profile Builder | Sync REST (`GET /resumes/{id}/profile-draft`) | Fetches candidate profile pre-fill drafts containing `skill_levels` with `source: resume_inferred` and Bloom evidence. |
| Role 5 Skill Matching | Sync REST (`GET /resumes/{id}`) | Reads structured candidate skills, experience, and evidence spans to evaluate candidate fit against job requirements. |
| Kubernetes Kubelet | Sync REST (`GET /healthz`, `GET /readyz`, `GET /ready`) | Orchestration probes for container liveness and database/storage readiness. |

---

## 🚧 Built Features & Current State

### Current state
| Field | Value |
|---|---|
| **Status** | 🟢 Production |
| **Version** | v1.0.0 |
| **Last deployed** | 2026-10-28 |
| **Owner(s)** | RADIX Talent Match Platform Team |
| **Known technical debt** | Two-column PDF heuristic reads column by column using bounding box thresholds; rare mixed-layout documents with nested sidebars can interleave layout spans. DOCX text box extraction relies on XML paragraph fallback which strips vector line shape metadata. |

### Features built (working today)
- `POST /resumes` — Multipart upload (PDF/DOCX/TXT), stores file in S3/local storage, dedupes via SHA256, parses content, and caches extraction — ✅ done
- `POST /parse` — Stateless document parse returning `ResumeExtraction` without writing to database or storage — ✅ done
- `POST /parse/text` — Stateless parse of pasted raw text string — ✅ done
- `POST /levels/infer` — Deterministic re-scoring of skills and 12-category Bloom levels from structured extraction JSON without document re-processing — ✅ done
- `GET /resumes` — List stored resumes with pagination (`limit`, `offset`), filterable by `user_id` or `email`, with optional extraction inclusion — ✅ done
- `GET /resumes/{id}` — Retrieve resume metadata record, parsing status, and full `ResumeExtraction` payload — ✅ done
- `GET /resumes/{id}/file` — Download original binary file or redirect (`307`) to S3 presigned URL — ✅ done
- `GET /resumes/{id}/profile-draft` — Synthesize candidate `ProfileDraft` for Role 3 with 12 canonical category levels (`lv-1.0`) — ✅ done
- `POST /resumes/{id}/reparse` — Reparse stored binary file using updated parser algorithms or taxonomy rules — ✅ done
- `PATCH /resumes/{id}` — Attach an anonymous or orphaned resume record to an authenticated `user_id` — ✅ done
- `DELETE /resumes/{id}` — Delete database record and purge underlying storage blob if no other record references the same SHA256 hash — ✅ done
- `GET /healthz`, `GET /readyz`, `GET /ready`, `GET /health` — Liveness, database/storage readiness, and comprehensive engine diagnostic probes — ✅ done

### How it was built
- **Language/runtime:** Python 3.12 (CPython)
- **Framework:** FastAPI 0.162.0 + Uvicorn 0.54.0 + Pydantic v2.14.1
- **Design patterns used:**
  - **Deterministic Pipeline Pattern:** Five-stage sequential processor (`documents` -> `sections` -> `patterns`/`nlp` -> `taxonomy` -> `levels`) executed synchronously in a thread pool without LLM nondeterminism.
  - **Repository Pattern:** `ResumeRepo` in `src/resume_service/db.py` cleanly separates SQLAlchemy query lifecycle, connection pools, and dialect abstractions (PostgreSQL vs SQLite) from route controllers.
  - **Strategy Pattern for Storage:** `StorageBackend` abstraction in `storage.py` allows seamless swapping between AWS S3 (via `boto3`) and local persistent volume disk storage.
  - **Bloom Taxonomy Points Model:** Mathematical scoring engine in `levels.py` assessing skill depth (1–10) using keyword frequency, experience duration, leadership signals, and quantifiable impact metrics.
- **Key libraries:** `PyMuPDF` (1.26.5) for PDF text/spans, `python-docx` (1.2.0) for Word documents, `spacy` (3.8.18) with baked `en_core_web_sm` model for Named Entity Recognition, `rapidfuzz` (3.14.6) for fuzzy section/alias matching, `sqlalchemy` (2.1.6) with `psycopg` (3.3.6) for database access, `boto3` (1.43.121) for S3 integration.

---

## 🏗️ Architecture & Design Patterns

The service follows a layered, decoupled architecture designed for deterministic, sub-second execution:

```
resume/
├── Dockerfile                  # Non-root container with baked spaCy NER model (100% offline)
├── pyproject.toml              # Build metadata, ruff, mypy, and pytest configuration
├── requirements.txt            # Locked runtime dependencies
├── requirements-dev.txt        # Development and testing suite dependencies
├── migrations/
│   └── 001_resumes.sql         # DDL migration for public.resumes table & indexes
└── src/
    └── resume_service/
        ├── main.py             # FastAPI entrypoint, lifespan events, probes, route handlers
        ├── service.py          # Business orchestration: upload, deduplication, reparse, cleanup
        ├── pipeline.py         # End-to-end extraction orchestrator (document -> extraction)
        ├── documents.py        # PDF and DOCX binary parsers, layout analysis, span extraction
        ├── sections.py         # Lexicon-based section segmenter using rapidfuzz string matching
        ├── patterns.py         # Compiled regex patterns for contact info, dates, CGPA, rank
        ├── nlp.py              # spaCy NER worker for names, organizations, and locations
        ├── taxonomy.py         # Canonical taxonomy engine with alias boundary matching
        ├── levels.py           # Deterministic Bloom level scoring (1-10) and basis generation
        ├── profile.py          # Adapter converting extraction into Role 3 CandidateProfile draft
        ├── signals.py          # Regex detectors for leadership, production use, impact metrics
        ├── storage.py          # Storage backend driver supporting AWS S3 and local filesystem
        ├── db.py               # SQLAlchemy ORM definitions and transactional ResumeRepo
        ├── contract.py         # Pydantic contract models (ResumeExtraction, Skill, ProfileDraft)
        ├── settings.py         # Type-safe environment settings with pydantic-settings
        └── data/
            └── taxonomy.json   # Seed taxonomy: 100+ skills across 12 categories, ~900 aliases
```

---

## ⚙️ Usage & Setup

### Environment variables
> Only fake, placeholder values are shown below. Real production secrets must be mounted via Kubernetes secrets.

| Key | Required | Description | Example (fake) |
|---|---|---|---|
| `PORT` / `RESUME_PORT` | ❌ | Port the FastAPI service listens on (defaults to 8100) | `8100` |
| `RESUME_HOST` / `HOST` | ❌ | Host address to bind to | `0.0.0.0` |
| `DATABASE_URL` / `RESUME_DATABASE_URL` | ❌ | PostgreSQL or SQLite connection string | `postgresql://user:placeholder_password@localhost:5432/postgres` |
| `S3_BUCKET` / `RESUME_S3_BUCKET` | ❌ | Target S3 bucket for original resume files (uses local disk if unset) | `sample-resume-bucket-placeholder` |
| `AWS_REGION` | ❌ | AWS region for S3 client | `ap-south-1` |
| `AWS_ACCESS_KEY_ID` | ❌ | AWS access key for S3 bucket operations | `EXAMPLE_AWS_ACCESS_KEY_ID` |
| `AWS_SECRET_ACCESS_KEY` | ❌ | AWS secret key for S3 bucket operations | `example_secret_key_placeholder` |
| `S3_ENDPOINT_URL` | ❌ | S3 endpoint override (for MinIO or LocalStack in dev) | `http://localhost:9000` |
| `RESUME_S3_PREFIX` | ❌ | Object key prefix in S3 bucket | `resume-files` |
| `RESUME_API_KEY` | ❌ | Shared secret; requires `X-Resume-Key` header on API calls when set | `example_api_key_placeholder` |
| `RESUME_MAX_UPLOAD_MB` | ❌ | Maximum allowed upload size in megabytes (defaults to 5.0) | `5` |
| `RESUME_CORS_ORIGINS` | ❌ | Allowed JSON-serialized CORS origins | `["http://localhost:5173", "http://localhost:4000"]` |

### Run locally
```bash
# 1. Navigate to resume directory
cd resume

# 2. Create virtual environment with Python 3.12 and activate
uv venv -p 3.12 .venv
source .venv/bin/activate

# 3. Install dependencies in editable mode
uv pip install -r requirements-dev.txt -e .

# 4. Copy environment configuration
cp .env.example .env

# 5. Start development server with reload
uvicorn resume_service.main:app --reload --port 8100

# 6. Run test suite with coverage (54+ unit/integration tests)
pytest --cov

# 7. Run static linting and type checker
ruff check src tests && mypy
```

### Run via Docker / Skaffold
```bash
# Build the offline container image
docker build -t resume-service:latest .

# Run standalone container mapping port 8100
docker run -p 8100:8100 -e PORT=8100 resume-service:latest

# Or launch as part of the full RADIX microservices mesh via Skaffold
cd ..
skaffold dev -f skaffold.yaml
```

---

## 🔌 Communication & Contracts

### Synchronous (REST/gRPC)
| Direction | Protocol | Endpoint / method | Counterpart |
|---|---|---|---|
| Inbound | HTTP/1.1 REST | `POST /resumes` | Express API Gateway (`backend/src/services/resume.service.ts`) |
| Inbound | HTTP/1.1 REST | `GET /resumes/{id}` | Express API Gateway & Role 5 Matcher |
| Inbound | HTTP/1.1 REST | `GET /resumes/{id}/profile-draft` | Role 3 Profile Builder |
| Inbound | HTTP/1.1 REST | `POST /levels/infer` | Role 3 Profile Builder (re-scoring modified skills) |
| Inbound | HTTP/1.1 REST | `GET /healthz`, `GET /readyz`, `GET /ready` | Kubernetes Kubelet health probes |
| Outbound | HTTPS REST | AWS S3 PutObject / GetObject / Presign | AWS S3 Object Storage API |
| Outbound | PostgreSQL Wire | Port 5432 SQL Queries & JSONB operations | PostgreSQL / Supabase Database |

### Asynchronous (event/queue)
The Resume Service operates strictly over synchronous HTTP REST for deterministic low-latency transactions. Parsing runs locally within 300–800 ms per document, avoiding asynchronous message broker overhead.

### Contract source of truth
- **Pydantic Schemas:** Defined in [contract.py](file:///Users/home/Desktop/Bootcamp/resume/src/resume_service/contract.py) (`ResumeExtraction`, `Skill`, `ProfileDraft`).
- **Platform Specification:** Documented in [docs/00-shared-contract.md](file:///Users/home/Desktop/Bootcamp/docs/00-shared-contract.md) §3.3.
- **Interactive OpenAPI Specification:** Auto-generated FastAPI documentation served at `http://localhost:8100/docs` (`/openapi.json`).

---

## 🛡️ Production Readiness

### Health & observability
- **Liveness:** `GET /healthz` — Returns `{"status": "ok"}` when the event loop is responsive.
- **Readiness:** `GET /readyz` and `GET /ready` — Validates database connection pool health via `repo.ping()`; responds with HTTP 503 `db_unavailable` if unreachable.
- **Diagnostics:** `GET /health` — Inspects runtime subsystem state: database connectivity, storage driver status, active parser version (`PARSER_VERSION`), levels version (`LEVELS_VERSION`), loaded taxonomy version, skill count, and verifies zero external LLM calls.
- **Graceful shutdown:** FastAPI async lifespan handler cleanly disposes SQLAlchemy connection pool engines on SIGTERM/SIGINT signals.
- **Structured logging:** Standardized HTTP access logger outputting timestamp, HTTP method, URL path, response status, and request duration in milliseconds.

### Security & compliance
- **AuthN/AuthZ:** Multi-tenant user data boundaries enforced via `X-User-Id` header passed by the authenticated backend. Inter-service endpoint authorization enforced with constant-time comparison `secrets.compare_digest` against `RESUME_API_KEY` via `X-Resume-Key` header.
- **CORS policy:** Restricted to configured client origins via FastAPI CORSMiddleware (defaults to `http://localhost:5173` and `http://localhost:4000`).
- **Upload protection:** Hard upload boundary checked via `RESUME_MAX_UPLOAD_MB` (HTTP 413 Content Too Large if violated) to protect from memory-exhaustion attacks.
- **Container hardening:** Runs under unprivileged Linux user `USER resume` (UID 1000). The spaCy NER model is baked directly into the image at build-time, requiring zero outbound runtime network calls.
- **Secrets management:** Database credentials, AWS keys, and API secrets are mounted as Kubernetes secrets (`resume-secret`, `database`), never stored in application code.

### Deployment
- **Container:** Dockerfile based on `python:3.12-slim`, utilizing multi-stage build cache mounts with Astral `uv` for sub-minute builds.
- **Orchestration:** Managed via Kubernetes Deployment (`k8s/resume-deployment.yml`) with a 1Gi `PersistentVolumeClaim` (`resume-data`), resource requests (`200m` CPU, `384Mi` RAM), resource limits (`1000m` CPU, `1Gi` RAM), and a `Recreate` rollout strategy to protect single-writer RWO volume bindings.
- **Rollback strategy:** Instantly roll back deployments using `kubectl rollout undo deployment/resume-deployment`.

---

## 📝 Changelog & Migration State

| Version | Date | Change | Migration notes |
|---|---|---|---|
| `v1.0.0` | 2026-10-28 | Initial production release: PyMuPDF/python-docx layout parser, spaCy NER, 12-category Bloom proficiency engine, S3/local storage, PostgreSQL/SQLite support | Initial release; apply `migrations/001_resumes.sql` |

---

## 🤝 Ownership
- **Maintainer(s):** RADIX Talent Match Platform Team
- **Escalation:** `#radix-resume-oncall` on Slack / Bootcamp Issue Tracker
