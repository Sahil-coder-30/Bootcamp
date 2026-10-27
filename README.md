# RADIX Talent Match — PlaceIntel

Monorepo with three services:

| Folder | Service | Stack | Port |
|---|---|---|---|
| [`frontend/`](frontend/) | Web UI | React 19 + TypeScript, Vite, TanStack Router, Redux Toolkit, Axios, Tailwind 4 + shadcn/ui, SCSS tokens | 5173 |
| [`backend/`](backend/) | API server | Node + TypeScript, Express 5, Supabase JS | 4000 |
| [`agent/`](agent/) | Agent service | Python 3.11+, LangChain → FastAPI (to be built) | 8000 |

```
browser ──► frontend ──/api──► backend ──► Supabase
                                  └──────► agent (FastAPI, LLM work)
```

The frontend never talks to Supabase or the agent directly; everything goes through the backend.

## Run locally

```bash
# 1. backend
cd backend && cp .env.example .env   # add SUPABASE_URL + key (without them it serves seed data)
npm install && npm run dev           # http://localhost:4000/api/health

# 2. frontend (new terminal)
cd frontend && cp .env.example .env
npm install && npm run dev           # http://localhost:5173  (proxies /api to :4000)

# 3. agent (new terminal)
cd agent && python -m venv .venv && source .venv/bin/activate
pip install -e . && cp .env.example .env
```

## Folder conventions

**frontend/** follows the feature-based 4-layer architecture:

```
src/
├── features/<feature>/      companies | intelligence | skills
│   ├── components/          UI only, reads data through hooks
│   ├── Hooks/               business logic, calls service, dispatches slice actions
│   ├── service/             Axios calls (src/services/apiClient.ts), no Redux
│   └── slice/               Redux Toolkit, synchronous reducers only (no thunks)
├── components/              shared UI (Layout, CompanyLogo, shadcn ui/)
├── routes/                  TanStack Router file routes (thin: route → feature page)
├── services/apiClient.ts    shared Axios instance
├── styles/                  tokens.scss + index.scss (design tokens, themes)
└── store.ts                 Redux store
```

**backend/** follows routes → controllers → services:

```
src/
├── routes/        URL → controller mapping
├── controllers/   request parsing + response shape
├── services/      business logic, Supabase + agent clients
├── middlewares/   error handling
├── config/env.ts  environment variables
├── lib/           shared normalizers
└── data/          seed fallback data
scripts/           DB seeding scripts · supabase/ SQL schema + seed
```

## API

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Status + whether Supabase is configured |
| GET | `/api/companies` | Company list |
| GET | `/api/companies/:id` | Full company profile |
| GET | `/api/companies/:id/skills` | Required skill levels + topic ladders |
| GET | `/api/agent/health` | Agent service health (proxied) |
| POST | `/api/agent/:task` | Forwards JSON to the agent's `/:task` endpoint |

## Notes

- Never commit `.env` files; only `.env.example`.
- `agent/reference/level5/` holds reusable bootcamp code (`db.py`, `schemas.py`, `gate.py`), not wired in yet.
- `_archive/` (local only, git-ignored) holds old bootcamp material.

## For agents and new teammates

Start with [`context/README.md`](context/README.md): codebase map, coding journey (timestamps + commits) and current status, so you do not have to re-read the code.
