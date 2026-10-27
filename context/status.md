# Status, decisions and open items

_Updated 2026-10-27 (after Sahil's manual k8s/README/agent changes). Sab kuch local hai, GitHub par push nahi hua._

## Current state

- **Repo:** `/Users/home/Desktop/Bootcamp`, monorepo, branch `main`, local only (HEAD `7722087` at last sync). History was rewritten once to drop Claude trailers, so older hashes in notes may be stale: use `git log`. No new GitHub repo yet. Old repo `Sahil-coder-30/jss-academy-of-technical-education` still feeds the live Vercel site.
- **frontend/**: PlaceIntel works (company picker, intelligence, skills, logos), builds, tests, lint pass.
- **backend/**: Express API works, 13 tests pass, seed fallback if no Supabase env. Real keys are in local `backend/.env` (ignored).
- **agent/**: LangChain pipeline now also a **FastAPI service** (`openradix_agents.api`, port 8000, jobs/artifacts/health, tests in `agent/tests/`). CLI still works. `talent_match/` (Role 1-5 logic) is NOT built yet.
- **infra:** `k8s/` + `skaffold.yaml` + Dockerfiles for backend and agent. Ingress: `/api/agent` → agent, `/api` → backend. `k8s/secrets.yml` is git-ignored (use `secrets.example.yml`).
- **README/License:** root README is a v1.1.0 showcase README; MIT `LICENSE` added.
- **Hackathon:** deadline **2026-10-28**. Contract (v1.1) + all 5 role plans are written in `docs/` (done 13:08 UTC). Key rules: Talent Check = 100×Σ(min(c,r)−1)/Σ(r−1), ready = 80+ and no gap ≥3; skill match cascade exact→alias→fuzzy→embeddings→LLM; scoring uses numeric `required_level`, never the Bloom code. No hackathon feature code written yet (no `talent_match/` package, no new frontend features). Sample JDs/resumes pack not in repo.
- **Supabase:** healthy for our needs. Google (id 4), Microsoft (78), Oracle FSS (24) have all 12 skill levels in `company_skill_levels`. Details in codebase-map section 7.

## Decisions (do not re-litigate)

| Date | Decision | Why |
|---|---|---|
| 10-27 | Architecture: React+TS frontend / Express+TS backend / Python agent, frontend only talks to backend | User ask; app was TanStack Start (not Next.js), user wanted plain React+TS |
| 10-27 | One monorepo at Bootcamp root, old history kept | User chose option on decision card |
| 10-27 | Frontend follows `frontend-arch-init` but keeps Tailwind/shadcn for existing pages, TanStack Router kept, no Dexie/IDE layout | Deadline risk; SCSS tokens ready for new components |
| 10-27 | Company bar read from `company_skill_levels` via view, JSON snapshot as offline fallback | Organizer allowed table or JSON; demo must survive bad Wi-Fi |
| 10-27 | Final scores are pure deterministic functions; LLMs only extract | Contract rule 3 in `docs/00-shared-contract.md` |
| 10-27 | Replies to Sahil in Hinglish, Roman script only | User preference |

## Known issues / open items

0. **Commit trailers: clean.** Checked all local commits: none has a Claude/Anthropic trailer after the rewrite (the one grep hit, the context-rules commit, only mentions the rule in its subject). Keep it that way. Old authors in history are `gpt-engineer-app[bot]`/`Lovable`, not Claude. Re-check before push.

1. **Rotate Supabase DB password.** Old one is in git history (`f631864`) and on GitHub in the old repo. Do it before any push or sharing. (Owner: Sahil)
2. **Push:** need a new empty GitHub repo URL, then push `main`. Vercel for the new repo: frontend only; backend needs its own host (Render/Railway) or run locally for demo.
3. **Data quality:** 698 of 1,380 `company_skill_levels` rows have a Bloom code that does not match the level (e.g. Google Coding "8-CR"). Use `required_level` only; the plan's `v_company_skill_bar` view derives the code from the level. Decide whether to fix the DB rows later.
4. **Hackathon test pack** (6 JDs, 4 resumes, milestone xlsx) missing; golden labels depend on it.
5. **Agent contract mismatch to check:** backend proxy `POST /api/agent/:task` forwards to agent `/:task`. The FastAPI agent exposes `POST /run`, `POST /validate`, `GET /jobs/{id}`, `GET /companies/{c}/...`, `GET /health`. So `/api/agent/run` works; `/api/agent/health` is GET. `docs/` plans assume new agent endpoints (`/extract/jd` etc.) not built yet. Optional API key via `require_api_key`.
6. Supabase leftovers: SQL & Design skill has 0 topics ("SQL & Design" name mismatch), Blinkit run fails on `office_locations` needing "City, Country", ZS Associates duplicate, `search_path` warnings on 11 functions, RLS without policies on staging tables (backend uses service role, so fine). Missing logos: MintAir, Optum, Hexagon, INDmoney, Simplilearn.
7. `companies.logo_url` is not written by the normalize trigger for new companies (manual fill needed).
8. Vendored rule files drifted between old levels; `agent/data/` copies are the ones to use now.
9. Supabase connector's destructive-SQL confirmation times out in this setup: give the user SQL to run in the SQL Editor.
10a. **`.gitignore` now lists `context`** (added by Sahil). The 4 context files are still TRACKED, so they will be pushed unless untracked (`git rm -r --cached context`). New files in `context/` need `git add -f`. Decide: share with team or keep local.
10. **Dev proxy gotcha:** `frontend/vite.config.ts` proxies `/api` to `http://localhost` (port 80, k8s ingress) since 7722087. For plain local dev use backend on :4000 and change it back (or run via Skaffold).
11. Install notes: use npm 11 (npm 10 crashes with edgesOut); Python 3.11/3.12 for agent.

## Where to find things

- Hackathon contract and plans: `docs/`.
- Earlier write-ups (project files): bootcamp-overview, hackathon-talent-match, supabase-audit, fix_ids_and_skills SQL, cleanup-plan.
- Memory keys: bootcamp-folder-overview, hackathon-talent-match, supabase-db-state, user-language-preference.
