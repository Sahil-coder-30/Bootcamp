# Status, decisions and open items

_Updated 2026-10-27 13:10 UTC. Sab kuch GitHub par push nahi hua hai._

## Current state

- **Repo:** `/Users/home/Desktop/Bootcamp`, monorepo, branch `main`, HEAD `be5b340`, local only. No new GitHub repo yet (waiting on user to create an empty one and give URL). Old repo `Sahil-coder-30/jss-academy-of-technical-education` still feeds the live Vercel site (placeintel-jssaten.vercel.app) with the old TanStack app.
- **frontend/**: PlaceIntel works (company picker, intelligence, skills, logos), builds, tests, lint pass.
- **backend/**: Express API works, 13 tests pass, seed fallback if no Supabase env. Real keys are in local `backend/.env` (ignored).
- **agent/**: LangChain CLI pipeline (research → consolidate → skills → hiring → validate) works as CLI only. FastAPI service is being built by another thread. Level 5 DB code is reference only.
- **Hackathon:** deadline **2026-10-28**. Contract + role plans 1, 2, 3, 5 written in `docs/`, role 4 pending. No hackathon feature code written yet (no `talent_match/` package, no new frontend features). Sample JDs/resumes pack not in repo.
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

1. **Rotate Supabase DB password.** Old one is in git history (`f631864`) and on GitHub in the old repo. Do it before any push or sharing. (Owner: Sahil)
2. **Push:** need a new empty GitHub repo URL, then push `main`. Vercel for the new repo: frontend only; backend needs its own host (Render/Railway) or run locally for demo.
3. **Role 4 plan** not yet in `docs/` (check `docs/role-4-talent-check/`).
4. **Hackathon test pack** (6 JDs, 4 resumes, milestone xlsx) missing; golden labels depend on it.
5. **FastAPI agent**: in progress in another thread. Backend proxy expects agent at `AGENT_URL` (default http://localhost:8000), `GET /health`, `POST /:task`.
6. Supabase leftovers: SQL & Design skill has 0 topics ("SQL & Design" name mismatch), Blinkit run fails on `office_locations` needing "City, Country", ZS Associates duplicate, `search_path` warnings on 11 functions, RLS without policies on staging tables (backend uses service role, so fine). Missing logos: MintAir, Optum, Hexagon, INDmoney, Simplilearn.
7. `companies.logo_url` is not written by the normalize trigger for new companies (manual fill needed).
8. Vendored rule files drifted between old levels; `agent/data/` copies are the ones to use now.
9. Supabase connector's destructive-SQL confirmation times out in this setup: give the user SQL to run in the SQL Editor.
10. Install notes: use npm 11 (npm 10 crashes with edgesOut); Python 3.11/3.12 for agent.

## Where to find things

- Hackathon contract and plans: `docs/`.
- Earlier write-ups (project files): bootcamp-overview, hackathon-talent-match, supabase-audit, fix_ids_and_skills SQL, cleanup-plan.
- Memory keys: bootcamp-folder-overview, hackathon-talent-match, supabase-db-state, user-language-preference.
