# RADIX Talent Match: team docs

Start with the shared contract. Each role plan builds on it and uses its names, routes and tables.

| Doc | What it covers |
|---|---|
| [00-shared-contract.md](00-shared-contract.md) | Architecture, the 12 categories, the evidence-to-level rubric, every JSON object, API routes, Supabase tables, cross-cutting rules, demo flow, phases |
| [role-1-jd-analytics/plan.md](role-1-jd-analytics/plan.md) | JD (PDF/DOCX) to structured skill list. Also owns document ingestion and the shared LLM layer |
| [role-2-resume-parsing/plan.md](role-2-resume-parsing/plan.md) | Resume to skill list, structured fields and inferred 1-10 level per category |
| [role-3-profile-builder/plan.md](role-3-profile-builder/plan.md) | Candidate profile form pre-filled from the resume, skill-level editor, JSON save/load |
| [role-4-talent-check/plan.md](role-4-talent-check/plan.md) | Profile vs company bar across the 12 skillsets: readiness score, gaps, study plan |
| [role-5-skill-matching/plan.md](role-5-skill-matching/plan.md) | Profile vs one JD: match score, matched skills, prioritised gap list |

## The flow in one line

Pick a JD (1) → parse a resume (2) → build or update the profile (3) → run Talent Check against the company (4) → run Skill Matching against that JD (5).

## Service map

| Service | Folder | Port | Owns |
|---|---|---|---|
| Web UI | `frontend/` | 5173 | features `jd`, `resume`, `profile`, `talentCheck`, `skillMatch`, `flow` |
| API | `backend/` | 4000 | uploads, Supabase reads and writes, caching, orchestration |
| Agent | `agent/` | 8000 | text extraction, LLM extraction, level inference, scoring, matching (stateless) |
