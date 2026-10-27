# syntax=docker/dockerfile:1
FROM python:3.12-slim

WORKDIR /app

# Prevent Python from writing .pyc and buffer output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Install dependencies
COPY requirements.txt pyproject.toml ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source and data files
COPY src/ ./src/
COPY data/ ./data/
COPY prompts/ ./prompts/

# Install local package in editable mode
RUN pip install --no-cache-dir -e .

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/healthz')" || exit 1

CMD ["uvicorn", "openradix_agents.api.main:app", "--host", "0.0.0.0", "--port", "8000"]
