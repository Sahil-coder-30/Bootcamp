# syntax=docker/dockerfile:1.7
# Resume parsing service: fully offline at runtime. The spaCy NER model is baked
# into the image at build time, so the container never downloads anything later.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app

# Package index (PyPI by default; override with --build-arg PYPI_INDEX=...).
ARG PYPI_INDEX=https://pypi.org/simple

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8100 \
    PYTHONPATH=/app/src \
    # Slow networks: allow 15 minutes per download (same settings as agent/Dockerfile).
    UV_HTTP_TIMEOUT=900 \
    UV_CONCURRENT_DOWNLOADS=4 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_INDEX_URL=${PYPI_INDEX} \
    # SQLite + local files by default; set DATABASE_URL / S3_BUCKET in k8s.
    RESUME_DATABASE_URL=sqlite:////app/data/resumes.db \
    RESUME_STORAGE_DIR=/app/data/files

# Dependencies first so editing source does not reinstall them; the cache mount
# keeps wheels between builds.
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    for attempt in 1 2 3; do \
        uv pip install --system -r requirements.txt && break; \
        echo "uv install failed (attempt $attempt), retrying in 10s"; \
        if [ "$attempt" = 3 ]; then exit 1; fi; \
        sleep 10; \
    done \
    && python -c "import spacy; spacy.load('en_core_web_sm')"

COPY src/ ./src/
COPY migrations/ ./migrations/

RUN useradd --create-home --uid 1000 resume \
    && mkdir -p data/files \
    && chown -R resume:resume data
USER resume

EXPOSE 8100

CMD ["sh", "-c", "uvicorn resume_service.main:app --host 0.0.0.0 --port ${PORT} --workers ${WEB_CONCURRENCY:-1}"]
