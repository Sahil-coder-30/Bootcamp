# Coding journey (meeting-minutes style)

Format: `time (UTC)` · what · why/ask · plan/source · commit. Oldest first. Naye kaam end mein add karo.
"local only" = commit hua, GitHub push nahi hua.
Old-app commits (before monorepo) live in the same git history.

## Phase 0: Original PlaceIntel app (Lovable, TanStack Start)

| Time | Event | Commit |
|---|---|---|
| 2026-10-16 12:25 | Lovable template `tanstack_start_ts` | `68a38fe` |
| 2026-10-21 05:41-05:46 | Work in progress + 9 "Changes" commits, JSSATEN portal pages (company picker, intelligence, skills) | `ccfcbca` … `69173a0` |
| 2026-10-21 13:07 IST | Supabase integration + Vercel deploy. NOTE: this commit also pushed a hardcoded DB password in `scripts/populate-live-supabase.py` (must rotate) | `3e5bac1` |
| 2026-10-21 13:24 IST | Rebrand as PlaceIntel | `48bb86b` |
| 2026-10-21 13:30 IST | Dark mode + institutional footer | `cb4ab86` |
| 2026-10-22 10:29 IST | Custom PlaceIntel favicon | `a2a4323` |

## Phase 1: 2026-10-27 analysis and database work (project thread "Analyze Bootcamp folder and build context")

| Time | Event | Ask / plan | Commit |
|---|---|---|---|
| 05:46-05:48 | Full analysis of Bootcamp folder (Level 3/4/5 + PlaceIntel). Wrote `bootcamp-overview.md`, memory. Found leaked DB password | user: "analyze the folder end to end" | n/a |
| 06:09 | Read hackathon brief + organizer update (Role 4 uses `staging_company_skill_levels`); wrote `hackathon-talent-match.md` | user pasted brief | n/a |
| 06:19 | Bug: Level 5 hiring step failed, table `job_role_details_json` never created. Fixed `db.py` (CREATE IF NOT EXISTS), `graph.py` (hiring wired after skills), new `sql/create_job_role_details_json.sql`. 15/15 offline tests | user: pipeline can't find job_role table | local, Level 5 (now in `_archive`; copy at `agent/reference/level5`) |
| 06:23 | Created table `job_role_details_json` in live Supabase via connector (public read) | user connected Supabase | DB only |
| 07:03 | Read-only Supabase audit: id 1-6 seed collision, 117 skill rows failed (company_id null), SQL topics missing, Blinkit city format. `supabase-audit-2026-10-27.md` | user: "audit the database" | n/a |
| 07:30 | Added `companies.logo_url`, filled 113/118 from `companies_master(Master Data).csv` (+ `company_logo`, `company_json`) | user: logo column missing | DB only |
| 07:43 | PlaceIntel reads `companies(logo_url, website_url)` so logos show on Vercel site; pushed to old repo main | user: logos not showing on deployed app | `2e0b55f` (pushed to old-app-repo) |
| ~11:00-11:11 | User ran `fix_ids_and_skills_2026-10-27.sql`: deleted demo ids 1-6, loaded real Accenture/Fractal/Oracle India/Google/Apple/MUFG, fixed `get_or_create_company`, trigger on INSERT OR UPDATE, reprocessed skills (116/117; Zepto dup skipped). Result: `company_skill_levels` 1380 rows / 115 companies. Backup `backup_20261027` | user approved fixes | DB only; SQL in project file `fix_ids_and_skills_2026-10-27.sql` |

## Phase 2: 2026-10-27 monorepo restructure (thread "Clean up Bootcamp folder for hackathon")

| Time | Event | Ask / plan | Commit |
|---|---|---|---|
| 11:40-12:10 | Cleanup plan: deleted ~1.3 GB (venvs, node_modules, caches); moved Level 3/5, Session Materials, CSV to `_archive/`; renamed AgenticResearch → `agent/`, jss-academy → `app/`; copied Level 5 code to `agent/reference/level5`, SQL schemas to `app/supabase/schema` | user: clean folder for team; plan `cleanup-plan.md` | n/a (pre-commit) |
| 12:13 | Bootcamp root became one git monorepo (old history kept, remote renamed `old-app-repo`), .gitignore, hardcoded password moved to `SUPABASE_DB_PASSWORD` env | user: "make gitignore, push ready" | `7f978eb` (local only) |
| 12:30 | Split into `frontend/` (React+TS Vite, `frontend-arch-init` skill: features/{companies,intelligence,skills}, Redux Toolkit, Axios), `backend/` (Express 5 + TS, routes→controllers→services, `/api/agent/:task` proxy), `agent/` intact. Build, tests (13 backend), lint pass; browser-checked 3 pages | user: "react+ts frontend, node+ts backend, agent intact"; "use my frontend-arch-init skill" | `128a9ef` (local only) |
| 12:53 | Removed 37 unused shadcn comps + 34 npm deps, `.tanstack`, `.vercel`, `.env.local`, Lovable leftovers, caches. Build/tests/lint pass | user: "remove .tanstack, no unnecessary files" | `584a585` (local only) |

## Phase 3: 2026-10-27 hackathon planning, agent and infra (in progress)

| Time | Event | Ask / plan | Commit |
|---|---|---|---|
| 12:49-13:08 | Wrote `docs/` : README index, `00-shared-contract.md` (v1.1 section 9 added accepted changes from the plans) and 5 role plans via 5 subagents. Architecture: frontend → backend (Supabase, caching) → stateless FastAPI agent. Highlights: JD evidence verification + golden-set eval; resume PDF/DOCX with Bloom-rubric 1-10 levels; profile pre-fill with provenance, 12 sliders, JSON import/export; Talent Check = 100×Σ(min(c,r)−1)/Σ(r−1), ready = 80+ and no gap ≥3, what-if, ranking across 115 companies; skill match cascade exact→alias→fuzzy→embeddings→LLM. Finding: 698 of 1,380 `company_skill_levels` rows have a Bloom code that disagrees with the level (e.g. Google Coding "8-CR"), so scoring uses the NUMBER | user: "plan.md for every role, stand out, scalable" | docs/ written at 13:07-13:08, commit `7670fb0` (local only) |
| 12:59 | Thread "Build FastAPI service for agent" started | user: "thread only for my agent, fastapi, scalable, test first" | see 13:16 |
| 13:10 | Created `context/` (README, codebase-map, journey, status) from git log, project memory, project chat/threads | this thread | commit `7670fb0` (local only) |
| 13:10 | Context files updated with role plans and the Bloom-code finding | coordinator relay | `a1b983b` (local only) |
| 13:21 | Upgraded root README.md using readme-forge (10-pillar showcase standard + 100% validator pass) | user: "use the /readme-forge skill and make the readme of this project" | `5b63cfc` (local only) |
| 13:24 | Updated Mermaid diagram: removed subgraph boxes for transparent background | user: "dont use these light backgroudn behind the architecutre diagram" | `3ac02b8` (local only) |
| 13:28 | Converted LaTeX math blocks to structured Markdown tables and code snippets for clean cross-renderer compatibility | user: "some issue in rendering fix these" | `43aead8` (local only) |
> **NOTE (history rewritten 2026-10-27 ~13:09 UTC):** the "Clean up" thread rewrote local commit messages to drop Claude trailers, so EVERY hash changed (same code, new ids). Hashes in this file were remapped to the new ids on 2026-10-27 16:xx UTC. Mapping: c21d5f5→7f978eb, 87a6c2c→128a9ef, be5b340→584a585, context commit→7670fb0, docs commit→a1b983b. The old-repo logo fix `2e0b55f` is on `old-app-repo/main`, not in local history.

### Phase 4: 2026-10-27 agent API, README, infra (times converted from IST to UTC)

| Time (UTC) | Event | Ask / plan | Commit |
|---|---|---|---|
| 13:16 | **FastAPI agent service** `openradix_agents.api`: routers health (`/health`,`/healthz`,`/readyz`,`/doctor`), pipeline (`POST /run` → 202 job, `POST /validate`), jobs (`GET /jobs`, `/jobs/{id}`), artifacts (`/companies/{c}/artifacts`, `golden-record`, `skill-matrix`, `hiring`); in-memory job service, API-key dependency, provider fallback, `pipeline.py` shared by CLI and API, pipeline fixes (parsing, io_utils, consolidation). Tests: `agent/tests/{test_api,test_core}.py` | user: "agent thread: fastapi, review/fix, e2e test" | `55068ca` |
| 13:19 | Role owners and emails assigned in `docs/README.md` | Sahil (manual) | `f9326f1` |
| 13:20-13:27 | Root `README.md` rewritten (v1.1.0 showcase: financial/operational benchmarks, 10-pillar standard, transparent Mermaid diagram, formula tables) | user: readme-forge skill, render fixes | `3b021f1`, `5b63cfc`, `3ac02b8`, `43aead8` (+ journey notes `63cf6a3`, `334f8f9`, `d786b93`) |
| 13:34 | MIT `LICENSE` added | Sahil (manual) | `f80d30d` |
| 13:52-14:02 | **Kubernetes + Skaffold:** `k8s/` (backend/agent deployments + services, `ingress.yml` with `/api/agent` → agent-service, `/api` → backend-service, 300s timeouts for LLM/SSE, `secrets.example.yml`: `database`, `ai-secret`), `skaffold.yaml` (images `backend`, `agent-service`), `Dockerfile` + `.dockerignore` for backend and agent; unused rbac removed | Sahil (manual) | `35b6c54`, `047368f`, `d415167`, `e8f9413` |
| 14:13 | Backend Docker base `node:22-alpine` (native WebSocket for supabase-js) | Sahil | `bd7f0a1` |
| 14:19-14:21 | Container healthchecks, then replaced by k8s probes; **morgan** request logging in backend, HTTP access logger in agent, backend `GET /healthz` and `/readyz` | Sahil | `ae9a1bb`, `e087300` |
| 14:42 | Frontend dev proxy `/api` → `http://localhost` (port 80, i.e. the k8s ingress). **Plain `npm run dev` against backend :4000 no longer works** unless `vite.config.ts` is changed back | Sahil | `7722087` |
| 16:10 | Context re-synced after Sahil's manual changes (this entry) | user: "maine bahut kuch change kiya, context update rakhna" | `d836b7f` |

<!-- NEXT ENTRY HERE: copy a row, add time, event, ask/plan, commit -->
