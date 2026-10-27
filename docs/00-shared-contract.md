# RADIX Talent Match: shared contract and architecture

_Locked 2026-10-27, v1.1 (section 9 lists what the role plans added). Every role plan in this folder builds against this page. If a plan needs to change something here, change it here first and tell the other four owners._

The brief's contract (pages 9–10) is kept **field for field**. Everything we add is **additive** (new optional fields), so a judge reading our JSON next to the brief sees the same shape, plus more.

---

## 1. Architecture

```
                 ┌──────────────────────────── frontend (React 19 + TS, Vite) ────────────────────────────┐
                 │ features/: jd · resume · profile · talentCheck · skillMatch · flow (5-step wizard)     │
                 │ 4 layers: components → Hooks → service (Axios apiClient) + slice (sync RTK)            │
                 └──────────────────────────────────────────┬─────────────────────────────────────────────┘
                                                            │ /api  (the only door)
                 ┌──────────────────────────────────────────▼─────────────────────────────────────────────┐
                 │ backend (Express 5 + TS): routes → controllers → services                              │
                 │ owns STATE: uploads, Supabase reads/writes, caching, orchestration, validation (zod)   │
                 └───────────────┬───────────────────────────────────────────────┬─────────────────────────┘
                                 │ supabase-js                                   │ HTTP JSON (agent.service.ts)
                 ┌───────────────▼──────────────┐              ┌─────────────────▼──────────────────────────┐
                 │ Supabase Postgres + Storage  │              │ agent (Python 3.11, FastAPI + LangChain)   │
                 │ company_skill_levels (bar)   │              │ owns COMPUTE, stateless:                   │
                 │ skill_set_topics, documents, │              │ text extraction, LLM extraction, level     │
                 │ extractions, profiles, ...   │              │ inference, Talent Check scoring, matching  │
                 └──────────────────────────────┘              └────────────────────────────────────────────┘
```

**Why this split scales:** the agent is stateless, so it scales horizontally (more uvicorn workers or containers) and never needs DB credentials for scoring. The backend is the single writer to Supabase. Every LLM result is cached by document hash, so the same JD or resume is never paid for twice.

**"Python throughout" (brief p.13):** all extraction, inference, scoring and matching logic is Python in `agent/`. The TypeScript backend only moves data and stores it, which keeps the existing PlaceIntel portal intact.

### Repo layout (new pieces marked `+`)

```
agent/
  src/openradix_agents/        existing: providers.py, parsing.py, config.py (REUSED, not rewritten)
+ src/talent_match/
+   contract.py                Pydantic v2 models of everything on this page (single source of truth)
+   api.py                     FastAPI app: /health /extract/jd /extract/resume /talent-check /skill-match
+   documents.py               PDF/DOCX → clean text + sections            (owner: Role 1, used by 2)
+   llm.py                     structured-output chain + provider fallback  (owner: Role 1, used by 2, 5)
+   taxonomy.py                canonical skills, aliases, category mapping  (owner: Role 5, seeded by 1)
+   jd/  resume/  levels.py  talent_check/  skill_match/                    (one package per role)
+ data/samples/{jds,resumes}/  the hackathon pack (PDF + DOCX), not committed if the organizers say so
+ data/snapshots/talent_check_company_skillsets.json   offline company bar (Role 4 export)
+ tests/golden/                hand-labelled expected output per sample, used by every role's eval
backend/src/
+ routes|controllers|services/ documents, jd, resumes, profiles, talentCheck, skillMatch
+ supabase/migrations/         SQL for the tables in section 5
frontend/src/features/
+ jd/ resume/ profile/ talentCheck/ skillMatch/ flow/
docs/                          this folder
```

`contract.py` exports JSON Schema (`python -m talent_match.contract --export docs/contract/`), and the backend/frontend TS types are generated from those schemas (`json-schema-to-typescript`), so the three services can't drift apart.

---

## 2. The 12 categories

`category_code` is exactly `skill_set_master.short_name`, so no mapping layer is needed. `skill_set_id` is the FK used by `company_skill_levels` and `skill_set_topics`.

| code | skill_set_id | skill_set_master name | staging column |
|---|---|---|---|
| COD | 1 | Coding | coding |
| DSA | 2 | Data Structures and Algorithms | data_structures_and_algorithms |
| APTI | 3 | Aptitude and Problem Solving | aptitude_and_problem_solving |
| COMM | 4 | Communication Skills | communication_skills |
| OOD | 5 | Object-Oriented Programming and Design | object_oriented_programming_and_design |
| AI | 6 | AI Native Engineering | ai_native_engineering |
| SQL | 7 | SQL and Design | sql_and_design |
| SYSD | 8 | System Design and Architecture | system_design_and_architecture |
| CLOUD | 9 | DevOps and Cloud | devops_and_cloud |
| SWE | 10 | Software Engineering | software_engineering |
| NETW | 11 | Computer Networking | computer_networking |
| OS | 12 | Operating System | operating_system |
| OTHER | none | anything outside the 12 (domain skills like "Banking domain", tools that fit nowhere) | none |

**Bloom bands** (`proficiency_levels`): 1–2 **CU** Conceptual Understanding · 3–4 **AP** Application · 5–6 **AS** Analysis & Synthesis · 7–8 **EV** Evaluation · 9–10 **CR** Creation.

### Shared evidence → level rubric

Used by Role 1 (what level a JD implies), Role 2 (what level a resume shows) and Role 3 (slider hints). Same scale as the company bar, so Talent Check compares like with like.

| Level | Bloom | Candidate evidence looks like | JD wording looks like |
|---|---|---|---|
| 1–2 | CU | listed in skills, coursework, "familiar with" | "exposure to", "awareness of", "nice to have" |
| 3–4 | AP | used in 1 academic/personal project or lab | "working knowledge", "able to write", fresher roles |
| 5–6 | AS | several projects or an internship using it, debugging/optimising, measurable results | "strong", "hands-on", "solid understanding", 1–3 yrs |
| 7–8 | EV | led or designed it, production use, top competitive ranking, reviews others' work | "design", "own", "lead", "deep expertise", 3–5+ yrs |
| 9–10 | CR | built something new: published research, maintained OSS, novel system | "architect", "define standards", principal/staff |

---

## 3. Contract objects

Brief fields are **bold**. Everything else is our optional addition. All JSON keys are snake_case.

### 3.1 `Skill` (the building block)

```jsonc
{
  "skill_name": "Python",                        // brief
  "category_code": "COD",                        // brief: one of the 12 codes or OTHER
  "evidence": "Built a Flask REST API serving 2k users",  // brief: short quote or reason (≤ 200 chars)
  "confidence": "high",                          // brief: high | medium | low
  "canonical_id": "python",                      // + slug from taxonomy.py, used for matching
  "level_hint": 5,                               // + 1-10 from the rubric above, or null
  "requirement": "must",                         // + JD only: must | nice
  "section": "projects"                          // + where it was found (responsibilities, requirements, skills, projects, experience, education, certifications, other)
}
```

**Confidence rule (all extractors):** `high` = stated explicitly with evidence of use; `medium` = stated explicitly but no usage evidence; `low` = inferred from context. Every skill **must** carry an evidence string copied or paraphrased from the document; a skill with no evidence is dropped (this is our anti-hallucination gate).

### 3.2 `ExtractedSkillList` (Role 1 JD output, Role 2 skill output)

```jsonc
{
  "source_type": "jd",                           // brief: jd | resume
  "source_file": "google_swe.pdf",               // brief
  "company": "Google LLC",                       // brief (null for resumes)
  "role": "Software Engineer",                   // brief (for resumes: the role the candidate targets, or null)
  "skills": [ /* Skill */ ],                     // brief
  "document_id": "uuid",                         // + documents.id
  "company_id": 4,                               // + resolved companies.company_id (JD only)
  "category_levels": { "DSA": 6, "COD": 6, "SYSD": 5 },   // + JD: implied required level per category; resume: implied candidate level
  "meta": {                                      // + provenance, shown in the UI "how we got this" drawer
    "schema_version": "1.0",
    "prompt_version": "jd-v3",
    "model": "openrouter:nvidia/nemotron-3.5-lightning:free",
    "doc_sha256": "…",
    "latency_ms": 8200,
    "cached": false,
    "warnings": []
  }
}
```

### 3.3 `ResumeExtraction` (Role 2 output = the list above + structured fields)

```jsonc
{
  "...ExtractedSkillList fields with source_type = resume...": "",
  "candidate": { "name": "Ananya Rao", "email": "…", "phone": "…", "links": ["github.com/…"] },
  "education":  [ { "degree": "B.Tech CSE", "institution": "…", "year": "2026", "score": "8.7 CGPA" } ],
  "experience": [ { "title": "SDE Intern", "org": "…", "start": "2025-05", "end": "2025-07", "highlights": ["…"], "skills": ["Go","Kafka"] } ],
  "projects":   [ { "name": "…", "description": "…", "skills": ["…"], "link": "…" } ],
  "hackathons": [ { "name": "…", "result": "Winner", "year": "2025" } ],
  "certifications": [ { "name": "AWS Cloud Practitioner", "issuer": "AWS", "year": "2025" } ],
  "field_confidence": { "education": "high", "experience": "medium" }
}
```

### 3.4 `CandidateProfile` (Role 3 output)

```jsonc
{
  "name": "Ananya Rao",                          // brief
  "email": "ananya@example.com",                 // brief (unique key)
  "education": "B.Tech CSE, XYZ Institute, 2026, 8.7 CGPA",  // brief: string (display form)
  "skills": [ /* Skill */ ],                     // brief
  "hackathons": [ { "name": "…", "result": "…", "year": "…" } ],     // brief
  "internships": [ { "title": "…", "org": "…", "start": "…", "end": "…", "highlights": [] } ],  // brief
  "certifications": [ { "name": "…", "issuer": "…", "year": "…" } ], // brief
  "preferred_roles": ["Software Engineer"],      // brief
  "cv_file": "resume/<sha256>.pdf",              // brief: path inside the talent-docs bucket
  "id": "uuid",                                  // + candidate_profiles.id
  "education_details": [ /* ResumeExtraction.education */ ],  // + structured form
  "projects": [ /* ResumeExtraction.projects */ ],            // +
  "skill_levels": {                              // + THE CONTRACT GAP FIX: Talent Check needs a 1-10 per category
    "COD":  { "level": 6, "source": "resume_inferred", "confidence": "high",   "basis": "3 projects + internship in Go/Python" },
    "SYSD": { "level": 4, "source": "self",            "confidence": "medium", "basis": "Adjusted by candidate" }
    // all 12 codes always present; source = resume_inferred | self | assessed
  },
  "resume_extraction_id": "uuid",                // + link back to Role 2 output
  "schema_version": "1.0",
  "updated_at": "2026-10-27T10:00:00Z"
}
```

`skill_levels` ownership: Role 2 produces `category_levels` (inferred). Role 3 copies them into `skill_levels` with `source: resume_inferred`, lets the candidate move a slider (then `source: self`), and saves. Role 4 only reads `skill_levels`. When a resume shows nothing for a category, the level is **`1` with `confidence: low` and basis `"no evidence"`** (the scale is 1–10, so there is no 0).

### 3.5 `TalentCheckResult` (Role 4 output)

```jsonc
{
  "company": "Google LLC",                       // brief
  "skillset_gap": [                              // brief: always 12 rows, in skill_set_id order
    {
      "category_code": "DSA",                    // brief
      "required_level": 7,                       // brief
      "candidate_level": 5,                      // brief
      "gap": true,                               // brief: candidate_level < required_level
      "shortfall": 2,                            // + max(0, required - candidate)
      "required_bloom": "EV", "candidate_bloom": "AS",   // +
      "weight": 0.11,                            // + share of the score this row carries
      "next_topics": [ { "level": 6, "topics": "…" }, { "level": 7, "topics": "…" } ]  // + from skill_set_topics
    }
  ],
  "readiness_score": 72,                         // brief: 0-100
  "company_id": 4,                               // +
  "profile_id": "uuid",                          // +
  "verdict": "almost",                           // + ready | almost | not_yet  (thresholds owned by Role 4)
  "top_gaps": ["DSA", "SYSD"],                   // + the 3 biggest weighted gaps, for the headline
  "scoring_version": "tc-1.0",                   // + so old results stay explainable
  "explanation": "…one paragraph, template-generated, no LLM…"
}
```

### 3.6 `SkillMatchResult` (Role 5 output)

```jsonc
{
  "jd_source_file": "google_swe.pdf",            // brief
  "match_score": 68,                             // brief: 0-100
  "matched_skills": [                            // brief: objects, not bare strings
    { "jd_skill": "Distributed systems", "candidate_skill": "Kafka event pipeline", "category_code": "SYSD",
      "method": "semantic", "similarity": 0.82, "requirement": "must", "evidence": "…" }
    // method = exact | alias | fuzzy | semantic | llm
  ],
  "missing_skills": [                            // brief: the part that matters most
    { "skill_name": "Kubernetes", "category_code": "CLOUD", "requirement": "must",
      "why_it_matters": "Listed under What We're Looking For", "closest_candidate_skill": "Docker",
      "learn_next": "…from skill_set_topics…" }
  ],
  "jd_id": "uuid", "profile_id": "uuid",         // +
  "category_coverage": { "COD": 1.0, "CLOUD": 0.33 },   // +
  "score_breakdown": { "must_coverage": 0.7, "nice_coverage": 0.5, "level_fit": 0.8 },  // +
  "matching_version": "sm-1.0"                   // +
}
```

---

## 4. API surface

Frontend calls only these backend routes (through `services/apiClient.ts`). The backend calls the agent with `callAgent()` in `services/agent.service.ts`. Errors are always `{ "error": "message" }` with a proper status (existing `errorHandler`).

| Backend route | Owner | Agent call | Notes |
|---|---|---|---|
| `POST /api/documents` (multipart `file`, `kind=jd\|resume`) | Role 1 (shared) | none | stores the file in Supabase Storage bucket `talent-docs` at `<kind>/<sha256>.<ext>`, dedupes by sha256, returns `{document_id, sha256, cached}` |
| `POST /api/jds/extract` `{document_id, company_id?, role?}` | Role 1 | `POST /extract/jd` | returns `ExtractedSkillList`; cache hit when `(sha256, prompt_version)` already extracted |
| `GET /api/jds`, `GET /api/jds/:id` | Role 1 | none | list of saved JD extractions (the 6 samples pre-loaded) |
| `POST /api/resumes/parse` `{document_id}` | Role 2 | `POST /extract/resume` | returns `ResumeExtraction` |
| `POST /api/profiles`, `GET /api/profiles`, `GET /api/profiles/:id`, `PUT /api/profiles/:id` | Role 3 | none | zod-validated; `PUT` with `If-Match: <version>` to avoid lost updates |
| `POST /api/profiles/from-resume` `{resume_extraction_id}` | Role 3 | none | draft profile pre-filled from Role 2 (not saved until the user submits) |
| `GET /api/companies/:id/skill-bar` | Role 4 | none | 12 rows from `v_company_skill_bar`; falls back to the JSON snapshot |
| `POST /api/talent-check` `{profile_id, company_id}` | Role 4 | `POST /talent-check` (backend sends profile levels + bar + topics; the agent is pure) | stores into `talent_checks` |
| `GET /api/talent-check/matrix?company_ids=4,78,24` | Role 4 | `POST /talent-check/batch` | every saved profile × companies, for the demo heatmap |
| `POST /api/skill-match` `{profile_id, jd_id}` | Role 5 | `POST /skill-match` | stores into `skill_matches` |
| `GET /api/skill-match/matrix` | Role 5 | `POST /skill-match/batch` | 4 candidates × 6 JDs grid |

Agent endpoints take and return the contract models directly (FastAPI + Pydantic, so `/docs` gives live OpenAPI for the demo). The existing generic `POST /api/agent/:task` proxy stays for debugging only.

**Long calls:** LLM extraction can take 10–60 s. Phase 1 is synchronous (the existing 5-minute timeout in `agent.service.ts`) plus the sha256 cache, so the demo path after the first run is instant. The scale path (Phase 3) is a `jobs` table: the route returns `202 {job_id}`, the frontend polls `GET /api/jobs/:id`. Route shapes stay the same, so nothing in the UI has to be rewritten.

---

## 5. Supabase tables (new)

One migration file per role in `backend/supabase/migrations/`, all `create table if not exists`, RLS on, no anon policies (the backend uses the service-role key). **Existing tables are not modified.**

| Table | Owner | Key columns |
|---|---|---|
| `documents` | Role 1 | `id uuid pk`, `kind jd\|resume`, `file_name`, `sha256 unique`, `storage_path`, `mime`, `text`, `sections jsonb`, `page_count`, `created_at` |
| `extractions` | Role 1 (Role 2 writes resume rows) | `id uuid pk`, `document_id fk`, `source_type`, `prompt_version`, `model`, `result jsonb` (contract object), `latency_ms`, `created_at`, `unique(document_id, prompt_version)` |
| `job_postings` | Role 1 | `id uuid pk`, `extraction_id fk`, `company_id int fk companies`, `company_name`, `role`, `location` |
| `candidate_profiles` | Role 3 | `id uuid pk`, `email unique`, `profile jsonb` (contract object), `version int`, `resume_extraction_id fk null`, `created_at`, `updated_at` |
| `talent_checks` | Role 4 | `id uuid pk`, `profile_id fk`, `profile_version`, `company_id`, `result jsonb`, `readiness_score int`, `scoring_version`, `created_at` |
| `skill_matches` | Role 5 | `id uuid pk`, `profile_id fk`, `profile_version`, `job_posting_id fk`, `result jsonb`, `match_score int`, `matching_version`, `created_at` |
| `skill_taxonomy` | Role 5 (seeded by Role 1) | `canonical_id text pk`, `display_name`, `category_code`, `aliases text[]`, `embedding vector(768) null` (pgvector, Phase 3) |
| view `v_company_skill_bar` | Role 4 | `company_id, company_name, skill_set_id, category_code, required_level, bloom_code` over `company_skill_levels ⋈ skill_set_master ⋈ proficiency_levels` |

Indexes: every FK, `documents(sha256)`, `talent_checks(profile_id, company_id, created_at desc)`, `skill_matches(profile_id, job_posting_id, created_at desc)`, GIN on `skill_taxonomy(aliases)`.

**Company bar source.** The organizers allow `staging_company_skill_levels` directly or a local JSON. Since the 2026-10-27 DB fix, the trigger has normalized those same rows into `company_skill_levels` (1,380 rows, 115 companies, all 12 skills for each of our 3 companies), so we read the normalized table through the view. `agent/data/snapshots/talent_check_company_skillsets.json` is exported from the same view and used when the DB is unreachable (college Wi-Fi). Both paths go through one loader, so a demo never depends on the network.

| Brief company | `company_id` |
|---|---|
| Google LLC | 4 |
| Microsoft Corporation | 78 |
| Oracle Financial Services Software | 24 |

---

## 6. Cross-cutting rules

1. **Contract first.** `contract.py` lands before any role logic. Every endpoint validates input and output against it. An LLM answer that fails validation gets one repair retry with the validation error in the prompt, then falls back to the next provider.
2. **Providers.** Reuse `openradix_agents.providers` (OpenRouter, OpenRouter-alt, Groq, Gemini). `talent_match.llm` wraps them as `primary.with_fallbacks([...])` with `temperature=0` for extraction. The order is set in `.env` (`EXTRACT_PROVIDERS=openrouter,groq,gemini`).
3. **Determinism where it matters.** Talent Check scoring and the final Skill Match score are pure functions, unit-tested, and versioned (`scoring_version`, `matching_version`). LLMs only extract or adjudicate; they never produce the final number.
4. **Caching.** Key = `(document_id, prompt_version)`, and `document_id` is unique per `sha256`. The model is recorded in `meta` but is not part of the key, so a provider fallback doesn't cause a re-extract. A prompt change bumps `prompt_version` and naturally invalidates the cache.
5. **Golden-set evaluation.** `agent/tests/golden/<sample>.json` holds a hand-labelled expected answer for every sample. `pytest -m eval` prints precision/recall per role. This is the RADIX Level-3 "metadata-driven tests" idea applied to our own output, and it goes on the architecture slide.
6. **No secrets in code** (the old leaked DB password is a reminder). `.env` only; `.env.example` lists the names.
7. **Frontend architecture.** Follow `frontend-arch-init`: one feature folder per role, service has no Redux, slice has no thunks, components only use hooks, design tokens from `styles/tokens.scss`, shadcn/ui components already in `components/ui/`.
8. **Observability.** Every agent response carries `meta.latency_ms` and the model used; the backend logs one line per call. The UI shows a small "how this was computed" drawer on every result. Judges love being able to see why.

---

## 7. Integrated flow (the demo)

```
① Pick a JD ──► ② Parse a resume ──► ③ Build / update profile ──► ④ Talent Check ──► ⑤ Skill Matching
  (Role 1)        (Role 2)              (Role 3, pre-filled)         (Role 4, company)   (Role 5, this JD)
```

The `flow` feature is a 5-step wizard route `/match` with a stepper. It keeps `{jd_id, document_id, resume_extraction_id, profile_id}` in a `flow` slice, so any step can be reopened. The final screen puts the Talent Check radar (company bar vs candidate) next to the Skill Match gap list, with a **"Compare candidates"** toggle that shows the 4 × 3 readiness heatmap and the 4 × 6 match grid. That screen proves the brief's "visibly different results" requirement in a single view.

## 8. Phases (deadline Wed 28 Oct)

| Phase | When | Goal |
|---|---|---|
| **P0 Contract** | 27 Oct, first 2 h | `contract.py`, JSON schemas, TS types, migrations, FastAPI skeleton with stub endpoints that return golden JSON. Roles 3–5 unblocked at once. |
| **P1 Done-by-brief** | 27 Oct | each role runs on ≥ 2 samples; one end-to-end flow (Google SWE × Ananya) works |
| **P2 Stand-out** | 28 Oct morning | wizard, heatmaps, explanations, golden-set eval numbers, all 6 JDs × 4 resumes pre-computed |
| **P3 Scale story** | 28 Oct afternoon (or slide only) | jobs table + polling, pgvector taxonomy, batch endpoints, load test numbers |
| **Freeze** | 28 Oct evening | rehearse the 45-minute walkthrough end to end |

---

## 9. v1.1: additions accepted from the role plans

All of these are **optional, additive** fields or new routes. No brief field changed. Each plan's last section has the full reasoning.

### Objects

| Object | Added | From |
|---|---|---|
| `Skill` | `evidence_span {start, end}` (char offsets into `documents.text`, for highlighting); `alt_group` (JD "one of Java/C++/Go" lists); more `section` values: `hackathons, achievements, coursework, positions, publications, summary` | Roles 1, 2, 5 |
| `ExtractedSkillList` | `jd_id` (= `job_postings.id`, the id every later step uses); `extraction_id` (= `extractions.id`) | Roles 1, 2, 5 |
| `ResumeExtraction` | `category_level_details: {CODE: {level, confidence, basis, evidence[]}}` for all 12 codes (feeds Role 3's `skill_levels`); `existing_profile_id` when the email already has a profile; `experience[].kind` (internship, job, research, volunteer); `candidate.phone`, `candidate.links` | Role 2 |
| `CandidateProfile` | `version` (read-only, for `If-Match`); `skill_levels[code].inferred_level` (the resume's value, kept when the candidate overrides it); `phone`, `links`; `internships[].end` may be null (ongoing) | Role 3 |
| `TalentCheckResult` | `readiness_range {low, high}` (from level confidence), `blocking_gaps`, `levels_covered`, `levels_needed`, `categories_met`, `study_plan`, `meta`; per row `confidence`, `blocking`, `points_lost` | Role 4 |
| `SkillMatchResult` | `method` also allows `implied` and `category`; matched items add `credit`, `relation`, `jd_evidence`, `reason` (`evidence` = the candidate's evidence); missing items add `gap_type` (quick_win, big_gap), `effort`, `impact_points`, `priority`; result adds `meta`, `match_band`, `profile_version`; `score_breakdown` keys fixed as `must_coverage, nice_coverage, level_fit, cap_applied` | Role 5 |

### Scoring decisions (now locked)

- **Talent Check `tc-1.0`:** readiness = 100 × Σ(min(c, r) − 1) / Σ(r − 1). A row is *blocking* when it is 3 or more levels short. **ready** = score ≥ 80 and no blocking row; **almost** = 60–79, or ≥ 80 with a blocking row; **not_yet** < 60. Details in [role 4, section 3](role-4-talent-check/plan.md).
- **Skill Matching `sm-1.0`:** raw = 100 × (0.60 must_coverage + 0.20 nice_coverage + 0.20 level_fit), capped at 100 − 10 per missing must-have and at 49 when must_coverage < 0.5. Details in [role 5, section 3](role-5-skill-matching/plan.md).
- **Level inference `lv-1.0`:** a deterministic points model mapped onto the Bloom rubric, with an optional LLM nudge of ±1 that must cite evidence. Details in [role 2, section 3](role-2-resume-parsing/plan.md).

### Routes

| Route | Owner |
|---|---|
| agent `POST /documents/parse` (called on upload; fills `documents.text`, `sections`, text blocks with positions) | Role 1 |
| `GET /api/documents/:id`; `POST /api/documents` also returns `storage_path` | Role 1 |
| `force: true` on `POST /api/jds/extract` and `POST /api/resumes/parse` to bypass the cache; `consensus: true` on JD extract | Roles 1, 2 |
| agent `POST /levels/infer` (no LLM, re-scores levels from a stored extraction) | Role 2 |
| `POST /api/profiles/from-resume {resume_extraction_id, profile_id?}` returns `{draft, provenance, diff, existing_profile_id, warnings}`; `GET /api/profiles` returns `{items, next_cursor}` | Role 3 |
| `GET /api/skill-topics` (shared by Roles 3, 4, 5; reads `v_skill_topics`) | Role 3 |
| `GET /api/talent-check?profile_id=`, `GET /api/talent-check/rank?profile_id=` (all 115 companies), `skill_levels_override` + `persist` on `POST /api/talent-check` (what-if) | Role 4 |
| `POST /api/skill-match` accepts `resume_extraction_id` instead of `profile_id` | Role 5 |

### Database

- `job_postings.document_id` is unique, so `jd_id` stays stable across prompt versions.
- `candidate_profiles` gains `name`, `completeness`, `change_source`; new table `candidate_profile_versions` (history). FKs from `talent_checks` and `skill_matches` to profiles use `on delete cascade`.
- `v_company_skill_bar` derives `bloom_code` **from the level** and also exposes `skill_set_name`, `raw_bloom_code`, `bloom_mismatch`. Reason: 698 of the 1,380 live bar rows store a Bloom code that disagrees with their number (Google Coding is "8-CR", but 8 is EV). We score on the number.
- New view `v_skill_topics` fills the empty SQL and Design topics from the source rows (the trigger had looked for "SQL and Design" while the rows say "SQL & Design"), then falls back to the snapshot and `skillTopics.ts`.
- `talent_checks` gains `verdict`, `bar_source` and a unique index on `(profile_id, profile_version, company_id, scoring_version)`. `skill_matches.profile_id` becomes nullable (resume-only matches) and gains `resume_extraction_id`, `input_sha256`, `taxonomy_version`.
- `skill_taxonomy` gains `parents`, `implies`, `related`, `distinct_from` (false friends such as Java vs JavaScript). P3 table `skill_pair_verdicts` caches LLM match verdicts, so scores are deterministic.

### Shared code and config

- `contract.py` codegen emits JSON Schema, TS types **and zod schemas**, so backend and frontend validation can't drift.
- Shared test vectors live at `docs/contract/fixtures/` and run under both pytest and vitest (Talent Check parity, profile round trip).
- One name-to-id resolver, `resolveCompanyId()`, with pinned aliases so Oracle FSS (24) is never confused with Oracle India (3).
- One `frontend/src/lib/categories.ts` holds the 12 names, Bloom labels and chart colours.
- New env vars: `EXTRACT_PROVIDERS`, `MATCH_PROVIDERS`, `EMBED_MODEL`, `SKILL_MATCH_USE_LLM`, `SKILL_MATCH_USE_EMBEDDINGS`.
