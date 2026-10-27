# syntax=docker/dockerfile:1.7
FROM python:3.12-slim

# uv installs the pinned requirements in parallel, much faster than pip.
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /app

# Package index (PyPI by default; override with --build-arg PYPI_INDEX=... for a
# private index). On some lines PyPI's CDN runs at ~30-100 KB/s while other CDNs
# run at ~4 MB/s, hence the long timeout and the download cache below.
ARG PYPI_INDEX=https://pypi.org/simple

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000 \
    # The package is imported from source, not installed: config.py finds
    # prompts/ and data/ relative to src/, so the code must stay in /app.
    PYTHONPATH=/app/src \
    # Slow networks: aiohttp's PyPI index page alone is ~7.6 MB, and pip's 15 s
    # timeout gave up on it, reporting "from versions: none". Allow 15 minutes.
    UV_HTTP_TIMEOUT=900 \
    UV_CONCURRENT_DOWNLOADS=4 \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    UV_INDEX_URL=${PYPI_INDEX}

# Dependencies first, so editing source does not reinstall them. The cache mount
# keeps downloaded wheels between builds, so a rebuild downloads nothing.
COPY requirements.txt ./
RUN --mount=type=cache,target=/root/.cache/uv \
    for attempt in 1 2 3; do \
        uv pip install --system -r requirements.txt && break; \
        echo "uv install failed (attempt $attempt), retrying in 10s"; \
        if [ "$attempt" = 3 ]; then exit 1; fi; \
        sleep 10; \
    done

COPY src/ ./src/
COPY data/ ./data/
COPY prompts/ ./prompts/

# Run as a non-root user; runs write their artifacts to /app/outputs.
RUN useradd --create-home --uid 1000 agent \
    && mkdir -p outputs \
    && chown agent:agent outputs
USER agent

EXPOSE 8000

CMD ["uvicorn", "openradix_agents.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
