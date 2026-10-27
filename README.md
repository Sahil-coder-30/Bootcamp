# RADIX Talent Match — Hackathon Workspace

Two services live here:

| Folder | Service | Stack | Role |
|---|---|---|---|
| [`app/`](app/) | **Complete app** (server + frontend) | TanStack Start (Vite + React 19), Tailwind 4, shadcn/ui, Supabase JS | All UI, business logic and the Supabase connection. Calls the agent service. |
| [`agent/`](agent/) | **Agent service** | Python 3.11+, LangChain → FastAPI (to be built) | All agentic / LLM work (research, JD + resume parsing, skill matching). |

## Run locally

```bash
# app
cd app && cp .env.example .env   # fill in Supabase keys
npm install && npm run dev

# agent
cd agent && python -m venv .venv && source .venv/bin/activate
pip install -e . && cp .env.example .env   # fill in LLM keys
```

## Layout notes

- `app/supabase/schema/` — Supabase SQL scripts (staging, normalised tables, skills & proficiency) for reference.
- `agent/reference/level5/` — reusable code from the bootcamp Level 5 pipeline (`db.py` Supabase writes, `schemas.py` Pydantic + level validation, `gate.py` quality gates). Not wired in yet.
- `_archive/` — old bootcamp material, not part of the project. Do not share; delete when no longer needed.
- Never commit or share `.env` / `.env.local` files. Only `.env.example`.
