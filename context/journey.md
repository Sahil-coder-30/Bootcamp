# Coding journey (meeting-minutes style)

Format: `time (UTC)` · what · why/ask · plan/source · commit. Oldest first. Naye kaam end mein add karo.
"local only" = commit hua, GitHub push nahi hua.
Old-app commits (before monorepo) live in the same git history.

## Phase 0: Original PlaceIntel app (Lovable, TanStack Start)

| Time | Event | Commit |
|---|---|---|
| 2026-10-16 12:25 | Lovable template `tanstack_start_ts` | `dad00cb` |
| 2026-10-21 05:41-05:46 | Work in progress + 9 "Changes" commits, JSSATEN portal pages (company picker, intelligence, skills) | `7b40f81` … `664a561` |
| 2026-10-21 13:07 IST | Supabase integration + Vercel deploy. NOTE: this commit also pushed a hardcoded DB password in `scripts/populate-live-supabase.py` (must rotate) | `f631864` |
| 2026-10-21 13:24 IST | Rebrand as PlaceIntel | `38a244a` |
| 2026-10-21 13:30 IST | Dark mode + institutional footer | `919f372` |
| 2026-10-22 10:29 IST | Custom PlaceIntel favicon | `0b62103` |

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
| 12:13 | Bootcamp root became one git monorepo (old history kept, remote renamed `old-app-repo`), .gitignore, hardcoded password moved to `SUPABASE_DB_PASSWORD` env | user: "make gitignore, push ready" | `c21d5f5` (local only) |
| 12:30 | Split into `frontend/` (React+TS Vite, `frontend-arch-init` skill: features/{companies,intelligence,skills}, Redux Toolkit, Axios), `backend/` (Express 5 + TS, routes→controllers→services, `/api/agent/:task` proxy), `agent/` intact. Build, tests (13 backend), lint pass; browser-checked 3 pages | user: "react+ts frontend, node+ts backend, agent intact"; "use my frontend-arch-init skill" | `87a6c2c` (local only) |
| 12:53 | Removed 37 unused shadcn comps + 34 npm deps, `.tanstack`, `.vercel`, `.env.local`, Lovable leftovers, caches. Build/tests/lint pass | user: "remove .tanstack, no unnecessary files" | `be5b340` (local only) |

## Phase 3: 2026-10-27 hackathon planning and agent (in progress)

| Time | Event | Ask / plan | Commit |
|---|---|---|---|
| 12:49-13:08 | Wrote `docs/` : README index, `00-shared-contract.md` (v1.1 section 9 added accepted changes from the plans) and 5 role plans via 5 subagents. Architecture: frontend → backend (Supabase, caching) → stateless FastAPI agent. Highlights: JD evidence verification + golden-set eval; resume PDF/DOCX with Bloom-rubric 1-10 levels; profile pre-fill with provenance, 12 sliders, JSON import/export; Talent Check = 100×Σ(min(c,r)−1)/Σ(r−1), ready = 80+ and no gap ≥3, what-if, ranking across 115 companies; skill match cascade exact→alias→fuzzy→embeddings→LLM. Finding: 698 of 1,380 `company_skill_levels` rows have a Bloom code that disagrees with the level (e.g. Google Coding "8-CR"), so scoring uses the NUMBER | user: "plan.md for every role, stand out, scalable" | docs/ written at 13:07-13:08, commit `487a14c` (local only) |
| 12:59 | Thread "Build FastAPI service for agent" started: review agent, run end to end, fix, build FastAPI aligned with backend proxy | user: "thread only for my agent, fastapi, scalable, test first" | in progress |
| 13:04 | This context keeper thread created: `context/` folder | user: "keep context files and journey updated" | see next entry |
| 13:10 | Created `context/` (README, codebase-map, journey, status) from git log, project memory, project chat/threads | this thread | commit `487a14c` (local only) |

| 13:10 | Context files updated with role plans and the Bloom-code finding | coordinator relay | `ad2e3fc` (local only) |
<!-- NEXT ENTRY HERE: copy a row, add time, event, ask/plan, commit -->
