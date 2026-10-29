# RADIX Talent Match: Architecture and Engineering Manual

_Version 1.0, 29 Oct 2026. Grounded in the code on `main` (`d25be1a`) of the Bootcamp monorepo and the locked contract [`00-shared-contract.md`](00-shared-contract.md) v1.1. Every constant, threshold and formula below is copied from source, with the file named next to it. Where the original master-prompt specification differs from what is built, the difference is called out in a **Spec vs build** box and collected in [section 11](#11-spec-vs-implementation-register)._

Companion documents: [`architecture.md`](architecture.md) (product overview and status), the five role plans in `docs/role-*/plan.md`, and `docs/role-5-skill-matching/ARCHITECTURE_AND_FEATURE_GUIDE.md`.

---

## Contents

1. [Mission and value proposition](#1-mission-and-value-proposition)
2. [System architecture](#2-system-architecture)
3. [Taxonomy: the 12 Bloom CS categories and the 1-10 rubric](#3-taxonomy-the-12-bloom-cs-categories-and-the-1-10-rubric)
4. [Shared data contract](#4-shared-data-contract)
5. [Role 1: JD Analytics](#5-role-1-jd-analytics)
6. [Role 2: Resume Parsing](#6-role-2-resume-parsing)
7. [Role 3: Profile Builder](#7-role-3-profile-builder)
8. [Role 4: Talent Check (tc-1.0)](#8-role-4-talent-check-tc-10)
9. [Role 5: Skill Matching (sm-1.0)](#9-role-5-skill-matching-sm-10)
10. [Quality, evaluation and robustness](#10-quality-evaluation-and-robustness)
11. [Spec vs implementation register](#11-spec-vs-implementation-register)
12. [API reference](#12-api-reference)
13. [Persistence model](#13-persistence-model)
14. [Deployment, configuration and operations](#14-deployment-configuration-and-operations)
15. [Versioning and change control](#15-versioning-and-change-control)

---

## 1. Mission and value proposition

### 1.1 Problem

A student applying to a company today gets a yes or a no with no reason attached. The usual tooling behind that decision is a keyword matcher, and keyword matchers fail in five predictable ways:

| Failure | Example | Consequence |
|---|---|---|
| Semantic ambiguity | "Go" the language vs "go" the verb; "Spring" the framework vs the season | false positives |
| False friends | Java ≠ JavaScript, SQL ≠ NoSQL, React ≠ React Native | wrong matches look confident |
| Hallucinated matches | an LLM "finds" Kubernetes that the document never mentions | trust collapses |
| Uniform weighting | "nice to have: GraphQL" counts the same as "must have: DSA" | scores do not track hiring reality |
| Depth blindness | "exposure to AWS" and "ran AWS in production for 3 years" both tick "AWS" | familiarity looks like competence |

### 1.2 Solution

RADIX Talent Match turns the company-side research already in PlaceIntel (163 parameters per company, 12-skillset bars for 115 companies) into a candidate-side readiness tool. It combines:

1. **Structured parsing** of JDs (LLM + deterministic post-processing) and resumes (fully offline, no LLM) into skills tagged with one of 12 Bloom CS categories plus `OTHER`, and a 1-10 level per category.
2. **Evidence gates**: every extracted skill carries a quote of at most 200 characters that is located in the source text, or it is dropped.
3. **Company readiness (Talent Check, `tc-1.0`)**: the candidate's 12 levels against a company's 12 required levels, with a verdict and a topic-based study plan.
4. **Job fit (Skill Matching, `sm-1.0`)**: a 7-stage cascade from exact string match to batched LLM adjudication, with hard false-friend blocking and OR-groups.
5. **Counterfactual explainability**: for every gap, the exact number of points the match score would gain if that one skill were acquired.

### 1.3 Design principles (contract rule 3 and its corollaries)

- **LLMs extract; code scores.** Every number a user sees is a pure, versioned, deterministic function of stored inputs. LLMs are used only in Role 1 extraction and in Role 5 Stage 6 adjudication, both at temperature 0 and both with offline fallbacks.
- **Every claim has a source.** Skills cite evidence; levels cite a `basis` string; scores ship a `score_breakdown` and an explanation.
- **Demo must survive bad Wi-Fi.** Each external dependency (Supabase, LLM providers, embeddings) has a local fallback: JSON snapshots, a file store, keyword extraction.

---

## 2. System architecture

### 2.1 Runtime topology

```
                         ┌──────────────────────────── Kubernetes ingress (nginx) ───────────────────────────┐
                         │  /api/auth  → auth-service:80      /api/agent → agent-service:80   /api → backend │
                         └───────────────────────────────────────────────────────────────────────────────────┘
 ┌──────────────────────┐        HTTPS /api/*         ┌─────────────────────────────┐
 │ FRONTEND             │ ──────────────────────────► │ BACKEND (orchestration)     │
 │ React 19 + TS, Vite  │ ◄────────────────────────── │ Node 22, Express 5, TS, Zod │
 │ TanStack Router      │        JSON / multipart     │ :4000                       │
 │ Redux Toolkit, Axios │                             │ owns state, files, cache,   │
 │ Tailwind 4 + shadcn  │                             │ validation, auth checks     │
 └─────────┬────────────┘                             └──┬──────────┬──────────┬────┘
           │ /api/auth/* (Google OAuth redirect)         │          │          │
           ▼                                             │ HTTP     │ HTTP     │ supabase-js
 ┌──────────────────────┐   shared JWT_SECRET (HS256)    │ JSON     │ JSON     ▼
 │ AUTH  Express 5 + TS │ ◄──── backend verifies ───────┤          │   ┌─────────────────────────┐
 │ Passport Google      │                                │          │   │ SUPABASE                │
 │ :4100  Postgres      │                                │          │   │ Postgres (115 companies,│
 └──────────────────────┘                                ▼          │   │  company_skill_levels,  │
                                   ┌─────────────────────────────┐  │   │  skill_set_topics, ...) │
                                   │ AGENT (stateless compute)   │  │   │ Storage: talent-docs    │
                                   │ Python 3.11+, FastAPI,      │  │   └─────────────────────────┘
                                   │ Pydantic v2, LangChain 0.3, │  │
                                   │ PyMuPDF, RapidFuzz, NumPy   │  │
                                   │ :8000  package talent_match │  │
                                   │ Roles 1, 4, 5 (+2 samples)  │  │
                                   └──────────┬──────────────────┘  │
                                              │ LLM / embeddings    ▼
                                              ▼            ┌─────────────────────────────┐
                                   Gemini · Groq · NVIDIA  │ RESUME (Role 2, offline)    │
                                   gemini-embedding-001    │ Python 3.12, FastAPI, spaCy │
                                                           │ PyMuPDF, python-docx,       │
                                                           │ RapidFuzz :8100             │
                                                           │ own `resumes` table + S3    │
                                                           └─────────────────────────────┘
```

### 2.2 Tier responsibilities

| Tier | Owns | Never does |
|---|---|---|
| **Frontend** (`frontend/`) | Rendering, local UI state, the guided flow, charts (Recharts radar), "How computed" drawers | Call Supabase, the agent or the resume service directly; compute scores |
| **Backend** (`backend/`) | Request validation (Zod), persistence (Supabase or file/in-memory fallbacks), file storage and SHA-256 dedupe for JDs, extraction caching, profile versioning with ETags, assembling compute payloads (bars, topics, profiles) | Run NLP, embeddings or scoring math |
| **Agent** (`agent/`, package `talent_match`) | Stateless compute: document parsing, JD extraction, Talent Check scoring, Skill Matching cascade and scoring, sample resume extractions and level inference | Write to any database |
| **Resume** (`resume/`, package `resume_service`) | Offline resume parsing and lv-1.0 levels; its own `resumes` table and file store (S3 or local) | Call an LLM |
| **Auth** (`auth/`) | Google sign-in (Passport redirect flow), access JWT (HS256) + rotating refresh tokens, `auth_users` | Any business logic |

> **Spec vs build.** The spec describes 3 tiers. The build has **5 deployable services**: the 3 tiers plus `resume/` (Role 2 was built as its own offline microservice) and `auth/`. The agent also carries a `talent_match/resume` package used for golden sample extractions (`/extract/resume/sample/{key}`) and `/levels/infer`.

> **Spec vs build.** "Frontend never calls the agent directly" holds in the frontend code (every call goes through `services/apiClient.ts` → `/api`). The Kubernetes ingress, however, routes `/api/agent` straight to `agent-service`, so the agent is reachable from the browser's network path. The backend also has its own `/api/agent/*` proxy (`agent.routes.ts`). Recommended: drop the `/api/agent` ingress rule, or set `AGENT_API_KEY` so `require_api_key` enforces the `X-Agent-Key` header.

### 2.3 Frontend layering (`frontend-arch-init` pattern)

```
 features/<name>/
 ├── components/   UI only: props in, JSX out, no data fetching
 ├── Hooks/        logic: calls service, dispatches slice actions, derives view state
 ├── service/      Axios calls via shared apiClient (no Redux inside)
 └── slice/        Redux Toolkit slice: synchronous reducers only, no thunks
```

Routes (`frontend/src/routes/`, TanStack file routes):

| Route | Feature | Role |
|---|---|---|
| `/jd` | `features/jd` (dropzone, library, result with evidence highlighting) | 1 |
| `/resume` | `features/resume` (upload, fingerprint radar, format-invariance card) | 2 |
| `/profile`, `/profile/new`, `/profile/$profileId` | `features/profile` (12 sliders, provenance, versioned save) | 3 |
| `/talent-check` | `features/talentCheck` (radar, gap table, study plan, How computed drawer) | 4 |
| `/skill-match` | `features/skillMatch` (match links, gap list, How computed drawer) | 5 |
| `/flow` | `features/flow`: guided 4-step flow JD → resume + profile → Skill Match → Talent Check | all |
| `/dashboard`, `/companies`, `/company/*`, `/login`, `/auth/callback`, `/` | candidate dashboard, PlaceIntel company pages, auth, landing | base |

> **Spec vs build.** The spec's 5-step wizard with `/jds`, `/resumes`, `/profiles` paths: the built page routes are singular (`/jd`, `/resume`, `/profile`); the plural forms are the **API** paths. The wizard is `/flow`, with 4 steps (resume upload and profile save are one step).

### 2.4 End-to-end data flow

```
 JD file ──► POST /api/documents ──► agent /documents/parse ──► documents row (sha256, talent-docs/jd/<sha>.pdf)
                │
                └► POST /api/jds/extract ──► cache hit? (document_id, prompt_version) ──yes──► ExtractedSkillList
                                               │no
                                               ▼
                                     agent /extract/jd (LLM pass + deterministic pass 2)
                                               ▼
                                     extractions + job_postings rows ──► ExtractedSkillList
 Resume file ──► POST /api/resumes ──► resume svc /resumes (dedupe by user_id+sha256) ──► ResumeExtraction
                                               ▼
                 GET /api/resumes/:id/profile-draft ──► ProfileDraft (skill_levels source=resume_inferred)
                                               ▼
                 POST /api/profiles  |  PUT /api/profiles/:id (If-Match)  |  POST /api/flow/profile
                                               ▼
                                       CandidateProfile v(n)
                       ┌───────────────────────┴───────────────────────┐
                       ▼                                               ▼
   POST /api/talent-check {profile_id, company_id}       POST /api/skill-match {profile_id, jd_id}
   backend loads bar (v_company_skill_bar | snapshot)    backend loads JD extraction + profile + topics
   + topics (v_skill_topics) ──► agent /talent-check     ──► agent /skill-match
                       ▼                                               ▼
               TalentCheckResult (tc-1.0)                     SkillMatchResult (sm-1.0)
```

---

## 3. Taxonomy: the 12 Bloom CS categories and the 1-10 rubric

### 3.1 Category codes

The codes are exactly `skill_set_master.short_name`, in `skill_set_id` order (`agent/src/talent_match/talent_check/constants.py`, `CODES`):

| id | Code | Name | Typical skills |
|---|---|---|---|
| 1 | `COD` | Coding | Python, Java, C++, Go, TypeScript |
| 2 | `DSA` | Data Structures and Algorithms | arrays, graphs, DP, complexity analysis |
| 3 | `APTI` | Aptitude and Problem Solving | quant, logical reasoning, puzzles |
| 4 | `COMM` | Communication Skills | written/verbal, client-facing, presentations |
| 5 | `OOD` | Object-Oriented Programming and Design | SOLID, design patterns, UML |
| 6 | `AI` | AI Native Engineering | ML, LLMs, prompt engineering, MLOps |
| 7 | `SQL` | SQL and Design | SQL, PostgreSQL, schema design, indexing |
| 8 | `SYSD` | System Design and Architecture | distributed systems, caching, scalability |
| 9 | `CLOUD` | DevOps and Cloud | AWS/GCP/Azure, Docker, Kubernetes, CI/CD |
| 10 | `SWE` | Software Engineering | testing, Git, code review, agile |
| 11 | `NETW` | Computer Networking | TCP/IP, HTTP, DNS, sockets |
| 12 | `OS` | Operating System | processes, threads, memory, Linux |
| - | `OTHER` | Uncategorized / domain-specific | finance domain, Excel, SAP |

> **Spec vs build.** The spec says "12 canonical category codes" and lists 13. The build has **12 scoring categories plus `OTHER`**. `OTHER` is valid on a `Skill` (JD and resume extraction, Skill Matching), but it has no company bar, so Talent Check scores only the 12, and JD `category_levels` skip `OTHER`.

### 3.2 The 1-10 Bloom rubric

Bands are fixed (`BLOOM_BANDS` in `constants.py`, `BLOOM` in `resume_service/levels.py`):

$$
\text{bloom}(\ell)=\begin{cases}
\text{CU} & \ell\in\{1,2\}\\
\text{AP} & \ell\in\{3,4\}\\
\text{AS} & \ell\in\{5,6\}\\
\text{EV} & \ell\in\{7,8\}\\
\text{CR} & \ell\in\{9,10\}
\end{cases}
$$

| Levels | Band | Candidate evidence (resume) | JD phrasing (Role 1 `_PHRASES`) |
|---|---|---|---|
| 1-2 | **CU** Conceptual Understanding | listed only, coursework, "exposure to" | "exposure to", "familiar with", "basics of" → 2 |
| 3-4 | **AP** Application | academic or personal projects, hackathons | "working knowledge", "experience with", "knowledge of" → 3 (4 with intensifier) |
| 5-6 | **AS** Analysis & Synthesis | internships, production use, optimization, 2+ applied uses | "strong", "hands-on", "proficient", "optimize", "debugging" → 5 (6) |
| 7-8 | **EV** Evaluation | design ownership, technical lead, quantified production impact | "design", "own", "lead", "mentor", "expert" → 7 (8) |
| 9-10 | **CR** Creation | published research, novel systems | "architect", "set technical direction", "principal", "invent" → 9 (10) |

**Rule:** scoring always uses the numeric level. A Bloom code is derived from the level, never the reverse. This matters because 698 of 1,380 `company_skill_levels` rows have a stored code that disagrees with the level (for example Google Coding stored as `"8-CR"`). `v_company_skill_bar` exposes both `bloom_code` (derived) and `raw_bloom_code` (as typed), plus a `bloom_mismatch` flag.

---

## 4. Shared data contract

Source of truth: `agent/src/talent_match/contract.py` (Pydantic v2), mirrored in `backend/src/contract/profile.schema.ts` and `backend/src/lib/*.schemas.ts` (Zod). Fixtures: `docs/contract/fixtures/`.

### 4.1 `Skill`

```python
class Skill(BaseModel):
    skill_name: str
    category_code: str                       # one of the 12 codes or "OTHER"
    evidence: str = Field(max_length=200)    # quote located in the source text
    confidence: Literal["high", "medium", "low"] = "high"
    canonical_id: str | None = None          # taxonomy id, e.g. "postgresql"
    level_hint: int | None = Field(default=None, ge=1, le=10)
    requirement: Literal["must", "nice"] | None = None   # JD skills only
    section: str | None = None               # requirements | skills | responsibilities | ...
    evidence_span: dict[str, int] | None = None          # {start, end, page} offsets into document text
    alt_group: str | None = None             # OR-group id ("AWS or GCP or Azure")
```

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "radix/skill.json",
  "type": "object",
  "required": ["skill_name", "category_code", "evidence"],
  "properties": {
    "skill_name":    { "type": "string", "maxLength": 80 },
    "category_code": { "enum": ["COD","DSA","APTI","COMM","OOD","AI","SQL","SYSD","CLOUD","SWE","NETW","OS","OTHER"] },
    "evidence":      { "type": "string", "maxLength": 200 },
    "confidence":    { "enum": ["high","medium","low"], "default": "high" },
    "canonical_id":  { "type": ["string","null"] },
    "level_hint":    { "type": ["integer","null"], "minimum": 1, "maximum": 10 },
    "requirement":   { "enum": ["must","nice",null] },
    "section":       { "type": ["string","null"] },
    "evidence_span": { "type": ["object","null"], "properties": { "start": {"type":"integer"}, "end": {"type":"integer"}, "page": {"type":"integer"} } },
    "alt_group":     { "type": ["string","null"] }
  }
}
```

### 4.2 `ExtractedSkillList` (Role 1 output)

```python
class ExtractedSkillList(BaseModel):
    source_type: Literal["jd", "resume"] = "jd"
    source_file: str
    company: str | None = None
    role: str | None = None
    skills: list[Skill] = []
    document_id: str | None = None
    company_id: int | None = None            # pinned: Google 4, Microsoft 78, Oracle FSS 24
    category_levels: dict[str, int] = {}     # required level per category for this JD
    jd_id: str | None = None
    extraction_id: str | None = None
    meta: dict[str, Any] = {}                # prompt_version, model, degraded, trace, dropped, ...
```

### 4.3 `CandidateProfile`

```python
class CandidateSkillLevel(BaseModel):
    level: int = Field(ge=1, le=10)
    source: str = "resume_inferred"          # resume_inferred | self | assessed
    confidence: Literal["high", "medium", "low"] = "high"
    basis: str | None = None                 # e.g. "internship (Flipkart) + 2 projects; gate G-EV"

class CandidateProfile(BaseModel):
    id: str
    name: str
    email: str | None = None
    version: int = 1
    education: str | None = None
    skills: list[Skill] = []
    projects: list[CandidateProject] = []
    internships: list[CandidateExperience] = []
    certifications: list[CandidateCertification] = []
    preferred_roles: list[str] = []
    skill_levels: dict[str, CandidateSkillLevel | int] = {}   # bare int is normalised to {level, source:"self"}
```

The stored backend shape (Zod `skillLevelSchema`) adds `inferred_level` (1-10, nullable) so the UI can show "resume said 4, you set 6". The full profile also has `schema_version`, `education_detail`, `hackathons`, `updated_at`.

```json
{
  "id": "3a000000-0000-4000-8000-000000000001",
  "name": "Ananya Rao",
  "version": 3,
  "skill_levels": {
    "COD":  { "level": 7, "source": "resume_inferred", "confidence": "high",   "basis": "internship + 3 projects", "inferred_level": 7 },
    "AI":   { "level": 3, "source": "self",            "confidence": "medium", "basis": "set by candidate",       "inferred_level": 2 },
    "...":  "one entry per code, all 12 present"
  }
}
```

### 4.4 `TalentCheckResult`

```python
class GapRow(BaseModel):
    category_code: str
    required_level: int          # 1-10
    candidate_level: int         # 1-10
    gap: bool                    # shortfall > 0
    shortfall: int               # max(0, required - candidate)
    required_bloom: str
    candidate_bloom: str
    weight: float                # (r - 1) / Σ(r - 1)
    next_topics: list[NextTopic] # [{level, topics}] from skill_set_topics
    blocking: bool               # shortfall >= 3
    points_lost: float           # 100 * shortfall / Σ(r - 1)
    raw_bloom_code: str | None

class TalentCheckResult(BaseModel):
    company: str
    company_id: int
    profile_id: str
    readiness_score: int                     # 0-100
    verdict: Literal["ready", "almost", "not_yet"]
    top_gaps: list[str]                      # category codes, ranked
    scoring_version: str = "tc-1.0"
    skillset_gap: list[GapRow]               # always 12 rows, canonical order
    explanation: str                         # deterministic template, not LLM
    readiness_range: dict[str, int] | None   # {"low": .., "high": ..} from confidence bounds
    blocking_gaps: list[str]
    levels_covered: int | None
    levels_needed: int | None
    categories_met: int | None
    study_plan: StudyPlan | None             # steps {category_code, from_level, to_level, hours, topics}
    meta: dict[str, Any]                     # bar_source: db | cache | snapshot
```

### 4.5 `SkillMatchResult`

```python
MatchMethod = Literal["exact", "alias", "implied", "fuzzy", "semantic", "llm", "category"]

class MatchedSkill(BaseModel):
    jd_skill: str
    candidate_skill: str
    category_code: str
    method: MatchMethod
    similarity: float            # 0-1
    requirement: Literal["must", "nice"]
    evidence: str                # candidate side
    credit: float                # 0-1, what the scorer used
    jd_evidence: str | None
    relation: str | None         # instance_of | implies | general_form | sibling
    reason: str | None           # LLM reason (Stage 6) or category reason (Stage 7)

class MissingSkill(BaseModel):
    skill_name: str
    category_code: str
    requirement: Literal["must", "nice"]
    why_it_matters: str          # cites the JD quote and the point gain
    closest_candidate_skill: str | None
    learn_next: str | None       # taxonomy learn_hint + topic ladder
    gap_type: Literal["missing", "partial"]
    effort: Literal["quick_win", "big_gap"]
    impact_points: int           # counterfactual delta, section 9.7
    priority: int
    jd_evidence: str | None
    section: str | None
    candidate_level: int | None
    required_level: int | None

class ScoreBreakdown(BaseModel):
    must_coverage: float
    nice_coverage: float
    level_fit: float
    raw_score: float
    cap: int = 100
    cap_reason: str | None
    weights: dict[str, float] = {"must": 0.6, "nice": 0.2, "level": 0.2}

class SkillMatchResult(BaseModel):
    jd_source_file: str
    match_score: int                         # 0-100
    match_band: Literal["strong", "good", "weak"]
    jd_id: str | None
    profile_id: str | None
    profile_version: int | None
    matched_skills: list[MatchedSkill]
    missing_skills: list[MissingSkill]
    category_coverage: dict[str, float]
    score_breakdown: ScoreBreakdown
    matching_version: str = "sm-1.0"
    meta: SkillMatchMeta                     # stage_counts, llm_calls, llm_pairs, latency_ms, taxonomy/prompt versions
```

### 4.6 TypeScript mirror (frontend)

```ts
export type CategoryCode =
  | "COD" | "DSA" | "APTI" | "COMM" | "OOD" | "AI"
  | "SQL" | "SYSD" | "CLOUD" | "SWE" | "NETW" | "OS" | "OTHER";

export interface SkillLevel {
  level: number;                                   // 1-10
  source: "resume_inferred" | "self" | "assessed";
  confidence: "high" | "medium" | "low";
  basis?: string | null;
  inferred_level?: number | null;
}

export interface TalentCheckResult {
  company: string; company_id: number; profile_id: string;
  readiness_score: number; verdict: "ready" | "almost" | "not_yet";
  top_gaps: CategoryCode[]; scoring_version: "tc-1.0";
  skillset_gap: GapRow[]; explanation: string;
  readiness_range?: { low: number; high: number } | null;
  blocking_gaps: CategoryCode[]; study_plan?: StudyPlan | null;
}

export interface SkillMatchResult {
  match_score: number; match_band: "strong" | "good" | "weak";
  matched_skills: MatchedSkill[]; missing_skills: MissingSkill[];
  score_breakdown: ScoreBreakdown; matching_version: "sm-1.0";
  meta: { stage_counts: Record<string, number>; llm_calls: number; llm_pairs: number; latency_ms: number };
}
```

> **Spec vs build.** The spec names the TalentCheckResult gap fields `required_level`, `candidate_level`, `shortfall`, `next_topics`: all present. The build adds `gap`, `blocking`, `weight`, `points_lost`, Bloom codes and a confidence `readiness_range`. In SkillMatchResult the spec's `counterfactual_impact` is called **`impact_points`**.

---

## 5. Role 1: JD Analytics

Code: `agent/src/talent_match/jd/` (`sections.py`, `schema.py`, `postprocess.py`, `levels.py`, `company.py`, `pipeline.py`, `router.py`), `talent_match/llm.py`, `talent_match/documents.py`, `talent_match/taxonomy.py` + `data/taxonomy_jd.json`, prompt `agent/prompts/jd_extract.md` (`jd-v1`). Backend: `services/jd.service.ts`, `services/jdStore.ts`, `controllers/jd.controller.ts`.

### 5.1 Pipeline

```
 upload ─► sniff kind (PDF | DOCX | TXT) ─► sha256(bytes) ─► existing document? reuse
        ─► agent /documents/parse: PyMuPDF spans / python-docx paragraphs+tables ─► lines
        ─► sections.structure(): heading lexicon + RapidFuzz ─► Section{kind, requirement_hint, signal}
        ─► prepare(): numbered JD text ("L012: ...") for line-anchored quotes
        ─► PASS 1  LLM structured output (JdLlmOutput), temperature 0, provider fallback
        ─► PASS 2  deterministic post-process  (always runs)
              split → evidence gate → taxonomy → category check → must/nice → confidence → dedupe
        ─► keyword backfill (taxonomy hits in signal sections the LLM skipped)
        ─► levels: seniority band, per-skill level_hint, per-category required level
        ─► company resolution (pinned ids) ─► ExtractedSkillList (+ meta.trace, meta.dropped)
```

### 5.2 Section segmentation

`sections.py` maps headings ("What you'll do", "Minimum qualifications", "Preferred qualifications", "Nice to have", ...) to canonical kinds via a lexicon plus fuzzy matching, and only treats a line as a heading if it looks like one (short, bold or larger than body size). Each section carries a `requirement_hint` (`must` for minimum/required, `nice` for preferred) and a `signal` flag (requirements and skills sections are signal; company blurbs are not).

### 5.3 LLM layer (`talent_match/llm.py`)

```
for provider in EXTRACT_PROVIDERS (default "nvidia,groq,gemini"; deployed .env: gemini,groq,nvidia):
    for attempt in 0..1:                       # one repair retry
        raw = provider.invoke(prompt, temperature=0, max_retries=0, timeout)
        try: return Pydantic.validate(json(raw))
        except ValidationError as e: prompt += repair(e)
raise AllProvidersFailed(attempts)             # pipeline then runs keyword-only, meta.degraded = true
```

Measured latency per JD (2026-10-29): Gemini 4-9 s, Groq ~14 s, NVIDIA ~40 s. A cached extraction returns in ~10 ms.

### 5.4 Evidence gate (anti-hallucination)

`EvidenceIndex.locate()` in `postprocess.py`. Both the quote and the document are normalised (casefold, every run of non-`[a-z0-9+#]` becomes one space) with an index map back to original offsets.

| Step | Test | Result `verify` |
|---|---|---|
| 1 | exact substring near the LLM's line number, then anywhere | `verified_exact` |
| 2 | `rapidfuzz.fuzz.partial_ratio_alignment(quote, doc)` score ≥ 90 | `verified_fuzzy` |
|   | score 75-89 | `weak` |
| 3 | the skill name itself occurs as a whole token; evidence is rebuilt from its sentence | `rebuilt` |
| - | none of the above | **dropped**, logged in `meta.dropped` as `unverified_evidence` |

The final evidence is trimmed to 200 characters around the located span and the span is stored as `evidence_span {start, end, page}` so the UI can highlight it.

> **Spec vs build.** The spec says "drop any skill where the verbatim quote is absent". The build is slightly more lenient on purpose: a paraphrased quote is accepted when fuzzy alignment ≥ 75, and a wrong quote is repaired when the skill name is literally in the text. What it guarantees is that **every kept skill points at real text**; a skill the document does not contain is still always dropped. Confidence is stepped down for `weak` and `rebuilt`.

### 5.5 Must vs nice

Sentence cues beat section hints, which beat the LLM:

```python
NICE_CUES = r"\b(preferred|nice[- ]to[- ]have|a plus|plus point|bonus|ideally|good[- ]to[- ]have|desirable|advantageous|added advantage)\b"
MUST_CUES = r"\b(must|required|minimum|mandatory|essential)\b"

def resolve_requirement(sentence, section, llm_value):
    if NICE_CUES.search(sentence): return "nice"
    if MUST_CUES.search(sentence): return "must"
    if section and section.requirement_hint: return section.requirement_hint
    return llm_value or "must"
```

### 5.6 Confidence

| explicit | verify | in signal section | confidence |
|---|---|---|---|
| no | any | any | low |
| yes | verified_exact / verified_fuzzy | yes / no | high / medium |
| yes | weak | yes / no | medium / low |
| yes | rebuilt | any | medium |
| keyword backfill | - | yes | medium |

### 5.7 Taxonomy normalisation and splitting

- `_clean_name` strips versions and trailing parentheses ("Java 17", "Python (3.x)").
- `split_names` splits on `/ , or and` **only if every part is a distinct known taxonomy skill**, so "Java/C++" splits but "Data structures and algorithms" stays one skill.
- Canonicalisation: alias table → fuzzy → "contains exactly one known skill" (e.g. "cross-functional communication" → `communication`). The taxonomy's category overrides the LLM's (`trace: category_override`). Unknown skills get a slug id, keep the LLM category if valid (else `OTHER`) and are listed in `meta.new_skills`.

### 5.8 JD required levels (`jdlv-1.0`)

Seniority is detected from text and role (`intern`, `fresher`, `junior`, `mid`, `senior`, `staff`) and fixes a band:

| seniority | default level | clamp band |
|---|---|---|
| intern | 3 | [2, 5] |
| fresher | 4 | [3, 6] |
| junior | 5 | [3, 7] |
| mid | 6 | [4, 8] |
| senior | 7 | [5, 9] |
| staff | 8 | [6, 10] |

Per skill: `level_hint = max(phrase_level, years_level)`, else the seniority default; nice skills get −1 (floor 2). Years map as: < 1 yr → 4, 1-2 → 6, 3-4 → 7, 5+ → 8.

Per category (excluding `OTHER`):

$$
L^{JD}_k=\operatorname{clamp}_{[lo,hi]}\Big(\max_{s\in P_k}\text{level\_hint}(s)+\mathbb 1\big[\#\{\text{must in signal sections}\}\ge 3\big]\Big)
$$

where $P_k$ is the set of must skills in category $k$, or all its skills if there are no musts. The reason is recorded in `meta.level_basis[k]`.

### 5.9 Caching and storage

- Backend computes `sha256(file bytes)`; one `documents` row per hash; storage path `talent-docs/{kind}/{sha256}.{ext}` (Supabase Storage bucket `talent-docs`).
- Extraction cache key = `(document_id, prompt_version)`. A new prompt version invalidates naturally. A degraded (keyword-only) result is never served from cache.
- Store is pluggable (`jdStore.ts`): `SupabaseJdStore` (needs the service-role key and migration `20261028_02`) or the file store (`JD_STORE=file`, `.data/jd-store/`).

---

## 6. Role 2: Resume Parsing

Code: `resume/src/resume_service/` (offline, no LLM): `documents.py`, `sections.py`, `patterns.py`, `nlp.py` (spaCy `en_core_web_sm`), `taxonomy.py` + `data/taxonomy.json` (91 canonical skills), `entries.py`, `signals.py`, `levels.py` (`lv-1.0`), `profile.py`, `pipeline.py`, `service.py`, `db.py`, `storage.py`.

> **Spec vs build.** The spec places resume parsing in the agent with LangChain. It was built as a **separate offline service with zero LLM calls**: same input always gives the same output, ~0.3 s per resume, nothing leaves the server. Every level explains itself through `basis`.

### 6.1 Layout-aware text extraction

PDF: PyMuPDF spans → lines → blocks. Two-column detection (`detect_gutter`):

```
1. narrow = blocks with width < 0.62 × page_width;  need ≥ 4
2. histogram of x-occupancy in 4-pt bins, weighted by block height
3. search bins in the middle 20%-80% of the page for the longest run of empty bins
4. accept if run ≥ 8 pt wide AND there is text height on both sides
5. gutter_x = centre of that run
```

Reading order (`_reading_order`): blocks that span the gutter above the columns (name/header) → left column top-to-bottom (plus spanning blocks in the middle) → right column top-to-bottom → spanning blocks below. Running headers/footers repeated across pages are dropped; hyphenated line breaks are joined.

DOCX: paragraphs, tables, text boxes and headers are walked in order; Word bullets are numbering properties (`numPr`) rather than characters, so they are read from list styles, plus an action-verb rule ("Built…", "Designed…") for plain paragraphs. Without this, bullets looked like headings and projects swallowed each other (found by the format-invariance tests).

### 6.2 Structure extraction

- **Sections**: heading lexicon + RapidFuzz → canonical sections (education, experience, projects, skills, certifications, hackathons, achievements...).
- **Contact**: regexes for email, phone, links; spaCy for the name (heuristic fallback).
- **Entries** (`entries.py`): experience (title, org, kind internship/job/freelance, dates, highlights, skills), projects, education (degree, institution, year, CGPA/%), certifications (issuer classification foundational/professional), hackathons (result, podium detection), competitive programming ranks.
- **Skill mentions**: taxonomy matching with weak and case-sensitive aliases: "Go", "C", "R" only count in skill lists or after "in/with/using"; weak aliases like "rest" and "spring" only count in skill lists. Precision beats recall because a wrong skill misleads Talent Check more than a missing one.

### 6.3 Category-level inference (`lv-1.0`)

Each piece of evidence becomes a **unit** `(category, kind, context entry)`. One unit per category per entry, so listing ten Python libraries in one project does not pay ten times.

Base points (`BASE` in `levels.py`):

| Unit kind | Points |
|---|---|
| listed in skills section | 0.5 each, **capped at 1.0** per category |
| coursework | 0.5, capped at 0.5 |
| certification | foundational 0.75, professional 1.5 |
| project | 1.5 (+0.5 per extra distinct skill of the same category, cap 1.5) |
| hackathon | 1.5, +1.0 for a podium |
| experience | 2.5 + 0.5 per quarter, bonus capped at 1.5 |
| soft signal | 1.0 (communication 1.5, client-facing 2.5), top 3 per category |
| competitive programming | 1.5 / 2.5 / 4.0 for 200+ problems / rating 1600-1999 / 2000+ or ICPC (×0.75 when applied to APTI) |
| publication | 3.0 |

Per-unit multipliers for applied units:

$$
p_u = b_u\cdot\min\big(1.5,\;1+0.25\,\mathbb 1_{\text{quantified}}+0.25\,\mathbb 1_{\text{leadership}}\big)\cdot\begin{cases}0.8&\text{older than 36 months}\\1&\text{otherwise}\end{cases}
$$

Category total $P_k=\min(1,\Sigma\text{listed})+\min(0.5,\Sigma\text{coursework})+\sum p_u$. Points map to a raw level by upper bounds:

| $P_k\le$ | 0 | 1.0 | 2.5 | 4.0 | 6.0 | 8.5 | 11.0 | 14.0 | 18.0 | > 18 |
|---|---|---|---|---|---|---|---|---|---|---|
| level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

**Bloom gates** stop a pile of weak evidence from reaching a high band (`_gate_cap`):

| Gate | Condition not met | Cap |
|---|---|---|
| G-AP | at least one applied unit or certification | 2 |
| G-AS | 2+ applied units, or an internship/job | 4 |
| G-EV | a strong unit (leadership, top rank, or production + quantified) AND (experience or 3+ applied) | 6 |
| G-CR | a creation unit (published or novel work) | 8 |

$$
\text{level}_k=\min\big(\text{points\_to\_level}(P_k),\ \text{gate\_cap}_k\big)
$$

Confidence: `high` with 2+ applied units, `medium` with one applied unit or a certification, `low` otherwise. `basis` is a template string ("internship (Flipkart) + 2 projects; capped by G-EV: no lead/design evidence"), never free text. Up to 5 evidence quotes (≤ 160 chars) are kept per category.

### 6.4 Output

`ResumeExtraction` (contact, skills, education, experience, projects, hackathons, certifications, `category_levels`, `category_level_details` {level, bloom, confidence, points, basis, capped_by, evidence_refs}, `field_confidence`). `GET /resumes/{id}/profile-draft` turns it into a `ProfileDraft` whose `skill_levels` have `source = "resume_inferred"` for all 12 codes.

Uploads are deduplicated by `(user_id, sha256)`; files go to S3 (presigned download) or local disk; rows live in the `resumes` table (Postgres or SQLite).

---

## 7. Role 3: Profile Builder

Code: backend `routes/profiles.routes.ts`, `controllers/profiles.controller.ts`, `services/profiles.service.ts`, `services/profiles.repository.ts`, `lib/profileMapping.ts`, `lib/profileMerge.ts`, `lib/profileCompleteness.ts`, `services/calibration.service.ts`, `services/flow.service.ts`; frontend `features/profile`, `features/flow`. Migration `20261027120300_role3_candidate_profiles.sql`.

### 7.1 Flow

```
 ResumeExtraction ──► POST /api/profiles/from-resume {resume_extraction_id, profile_id?}
                         │ profileMapping: extraction → draft (nulls dropped)
                         │ profileMerge:   if profile_id, merge draft into existing; never overwrite source=self
                         ▼
                      draft + completeness score
                         ▼
          candidate reviews 12 sliders (each shows inferred_level, basis, confidence;
          GET /api/profiles/calibration/:code shows the topic ladder for that level)
                         ▼
     POST /api/profiles (create, 201 + Location + ETag "1")
     PUT  /api/profiles/:id  with  If-Match: "<version>"   ──► version+1, row in candidate_profile_versions
```

### 7.2 Provenance (audit trail)

Every `skill_levels[code]` records `source`:

| source | Set when | Effect |
|---|---|---|
| `resume_inferred` | pre-filled from lv-1.0 | `inferred_level` = level |
| `self` | candidate moved the slider | `inferred_level` kept for comparison; merge never overwrites |
| `assessed` | reserved for a future test result | highest trust |

`candidate_profile_versions` stores each saved version with a change source (`X-Change-Source` header), so `GET /api/profiles/:id/versions` shows history.

### 7.3 Optimistic concurrency

```
GET /api/profiles/:id          → 200, ETag: "3"     (If-None-Match: "3" → 304)
PUT /api/profiles/:id          If-Match: "3"
    missing header             → 428 Precondition Required
    malformed                  → 400
    stored version ≠ 3         → 412 Precondition Failed  {current version}
    ok                         → 200, ETag: "4"
POST with an email that exists → 409 {existing_profile_id}
```

`If-Match` accepts `"3"`, `W/"3"` and a bare `3`. The frontend sends it from `features/profile/service/profile.api.ts`.

The guided flow uses `POST /api/flow/profile {extraction}` instead: it maps and saves in one call (update by email if the profile exists).

> **Spec vs build.** As specified. Note that `candidate_profiles` and `candidate_profile_versions` are created in two migrations (`20261027120300_role3_...` and `20261028_01_users_profiles_resumes.sql`, both `if not exists`). Whichever runs first wins its column set; reconcile before applying to a fresh database. Without Supabase the repository uses an in-memory store (data is lost on restart) plus the 4 golden seed profiles.

---

## 8. Role 4: Talent Check (`tc-1.0`)

Code: `agent/src/talent_match/talent_check/` (`scoring.py`, `constants.py`, `bar.py`, `topics.py`, `ranges.py`, `plan.py`, `explain.py`, `batch.py`, `vectors.py`, `router.py`); backend `services/talentCheck.service.ts`, `services/companyBar.service.ts`, `services/topics.service.ts`. Company bar: view `v_company_skill_bar` → JSON snapshot `agent/data/snapshots/talent_check_company_skillsets.json` as fallback.

### 8.1 Inputs

- $r=(r_1,\dots,r_{12})$: company required levels, canonical order. A missing row counts as $r_k=1$ (nothing required).
- $c=(c_1,\dots,c_{12})$: candidate levels from `skill_levels`, clamped to [1, 10]; a missing code counts as 1 ("no evidence").

### 8.2 Score

Level 1 is the floor everyone has, so only levels above 1 count:

$$
\text{readiness}=100\cdot\frac{\sum_{k=1}^{12}\big(\min(c_k,r_k)-1\big)}{\sum_{k=1}^{12}(r_k-1)}\qquad(\text{100 if the denominator is 0})
$$

$$
\text{readiness\_score}=\operatorname{clip}_{[0,100]}\big\lfloor \text{readiness}+0.5\big\rfloor\quad\text{(half-up, never banker's rounding)}
$$

Per category:

$$
\text{shortfall}_k=\max(0,\,r_k-c_k),\qquad w_k=\frac{r_k-1}{\sum_j(r_j-1)},\qquad \text{points\_lost}_k=\frac{100\cdot\text{shortfall}_k}{\sum_j(r_j-1)}
$$

So a category's weight is how much the company asks for above the floor, and over-qualification in one category never compensates for a gap in another (the `min`).

### 8.3 Verdict

$$
\text{blocking}_k=\big[\text{shortfall}_k\ge 3\big]\quad(\text{a full Bloom band short})
$$

$$
\text{verdict}=\begin{cases}
\texttt{ready} & \text{score}\ge 80\ \wedge\ \neg\exists k:\text{blocking}_k\\
\texttt{almost} & \text{score}\ge 60\ \ (\text{includes}\ge 80\text{ held back by a blocking row})\\
\texttt{not\_yet} & \text{otherwise}
\end{cases}
$$

> **Spec vs build.** The spec asks for a "weighted dot product with non-linear penalties for core category shortfalls". `tc-1.0` is **linear** in the covered levels; the non-linearity is in the verdict, where any single category 3+ levels short blocks `ready` regardless of the total. There is no separate "core category" list: every category's weight is $r_k-1$, so the categories a company cares most about already dominate. This keeps the score explainable as "levels covered / levels needed" (shown as `levels_covered` / `levels_needed`).

### 8.4 Gap ranking

`top_gaps` = codes with shortfall > 0 sorted by (shortfall desc, required_level desc, skill_set_id asc).

### 8.5 Confidence range

`ranges.compute_bounds` widens each candidate level by its confidence: `CONFIDENCE_DELTA = {high: 0, medium: 1, low: 2}`. Pessimistic levels $c_k-\delta_k$ and optimistic $c_k+\delta_k$ (clamped) are scored with the same formula:

$$
\text{readiness\_range}=\big[\min(S(c^-),S(c)),\ \max(S(c^+),S(c))\big]
$$

### 8.6 Topic recommender and study plan

- `next_topics`: for each gap, the `skill_set_topics` entries for levels $c_k+1..r_k$ (via `v_skill_topics`, passed in by the backend as `topics[code][level]`). The view has a fallback for SQL and Design, whose topics sit in staging because of a name-spelling mismatch.
- `study_plan`: one step per gap level band with effort hours by target band `EFFORT_HOURS = {CU: 4, AP: 8, AS: 12, EV: 20, CR: 30}`; totals in `total_steps`, `total_hours`.
- `explanation`: a deterministic template (`explain.py`) naming the score, levels covered, top gaps and blocking count.

### 8.7 Batch and ranking

- `POST /talent-check/batch`: profiles × bars matrix (`MatrixCell`), used by `/api/talent-check/matrix`.
- `POST /talent-check/rank`: one profile vs a `BarMatrix` (N companies × 12 levels, vectorised in `vectors.py`), top N companies, used by `/api/talent-check/rank` across all 115 companies.

### 8.8 Worked example

Google LLC (id 4) bar: COD 8, DSA 9, APTI 9, COMM 7, OOD 8, AI 7, SQL 8, SYSD 4, CLOUD 9, SWE 9, NETW 9, OS 9. $\sum(r-1)=84$.

Ananya (SWE profile): COD 7, DSA 7, APTI 6, COMM 5, OOD 6, AI 3, SQL 4, SYSD 6, CLOUD 5, SWE 6, NETW 5, OS 6.

$\sum(\min(c,r)-1)=6+6+5+4+5+2+3+3+4+5+4+5=52$, so readiness $=100\cdot 52/84=61.9\to 62$. Shortfalls ≥ 3 in APTI, AI, SQL, CLOUD, SWE, NETW, OS (7 blocking), so the verdict is `almost` (score ≥ 60, blocked from `ready`).

---

## 9. Role 5: Skill Matching (`sm-1.0`)

Code: `agent/src/talent_match/skill_match/` (`terms.py`, `normalize.py`, `sm_taxonomy.py` (48 entries, `tx-1.0`), `cascade.py`, `embeddings.py`, `adjudicate.py`, `scoring.py`, `gaps.py`, `service.py`, `params.py`); backend `services/skillMatch.service.ts`.

### 9.1 Term preparation (`terms.py`)

JD side, per skill $j$:

$$
w_j=\underbrace{\{\text{must}:3,\ \text{nice}:1\}}_{\texttt{BASE\_WEIGHTS}}\times\underbrace{\{\text{requirements}:1,\ \text{skills}:1,\ \text{responsibilities}:0.8,\ \text{education}:0.6,\ \text{other}:0.6\}}_{\texttt{SECTION\_FACTOR}}
$$

Duplicates (same normalised name) keep the higher weight. Candidate side: skills from the profile (or resume), plus project, internship and certification skills, each with an evidence factor `EVIDENCE_FACTORS = {high: 1.00, medium: 0.90, low: 0.75}`.

**Normalisation** (`normalize.py`): casefold, strip punctuation except `+ # .` inside tokens, singularise the last token ("databases" → "database", but not "js", "ss", "us", "is"). Terms shorter than 4 characters ("c", "go", "sql", "aws") are **only** eligible for exact and alias matching.

**Alternative groups**: if two or more JD skills share an evidence sentence containing `or`, `one of`, `any of`, `one or more of`, or the extractor set `alt_group`, they form one group (see 9.5).

### 9.2 The 7-stage cascade

Each JD term stops at the first stage that accepts it. Stages 1-3 run per term; Stages 4-5 run on the unresolved remainder; Stage 6 runs once for all gray pairs; Stage 7 handles what is left.

```
 JD term j
   │
   ├─ S1 exact     norm(j) == norm(c)                                   credit 1.00 × e_c
   ├─ S2 alias     canonical_id(j) == canonical_id(c)                   credit 1.00 × e_c
   ├─ S3 implied   taxonomy relation(c → j), skip if distinct_from      instance_of 0.90 | implies 0.80
   │               accepted only if credit ≥ 0.80                       (general_form 0.60, sibling 0.50 fall through)
   │
   ├─ S4 fuzzy     RapidFuzz token_set_ratio, both terms ≥ 4 chars,
   │               strict token subset capped at 85                     ≥ 92 accept, credit 0.95 × e_c
   │                                                                    78-91 → gray pair
   ├─ S5 semantic  cosine(emb(j), emb(c)), Gemini gemini-embedding-001 (768-d, L2-normalised)
   │               thresholds +0.04 if categories differ (neither OTHER) ≥ 0.88 accept, credit 0.90 × e_c
   │                                                                    0.76-0.879 → gray pair
   │               S4/S5 best candidate accepted only if credit ≥ 0.85
   │
   ├─ S6 LLM       one batched structured-output call for all gray pairs,
   │               must-haves first, highest similarity first, max 40 pairs
   │               equivalent → 0.90 × e_c   partial → 0.50 × e_c   unrelated → 0
   │
   └─ S7 category  only for concept/soft/domain terms ("problem solving", "communication",
                   "strong CS fundamentals"):  credit = 0.8 · min(1, c_k / r_k) · conf_factor
                   conf_factor: high 1.0, medium 0.9, low 0.75
                   anything else → unmatched, credit 0
```

### 9.3 Hard false-friend blocking

`TaxonomyEntry.distinct_from` holds negative edges, checked symmetrically by `is_distinct(a, b)` before Stage 3, Stage 4 and Stage 5:

| Skill | Never matches |
|---|---|
| java | javascript |
| javascript | java |
| c | c++, c# |
| c++ | c, c# |
| c# | c++, c |
| python | cython |
| react | react-native (and the reverse) |
| sql-lang, postgresql, mysql, relational-databases | nosql (mongodb for some) |
| nosql | postgresql, mysql, relational-databases, sql-lang |
| (ML entry) | mlops |

The Stage 6 system prompt repeats the rule for anything that reaches the LLM: "Different languages are unrelated (Java vs JavaScript). SQL vs NoSQL is partial at most."

### 9.4 Stage 6 adjudication contract

```python
class GrayPair(BaseModel):
    id: str                  # "p_<jd_id>_<cand_id>"
    jd_skill: str; jd_context: str
    candidate_skill: str; candidate_context: str
    category_code: str

class Verdict(BaseModel):
    id: str
    verdict: Literal["equivalent", "partial", "unrelated"]
    reason: str = Field(max_length=150)

class AdjudicationResponse(BaseModel):
    verdicts: list[Verdict]
```

Cache key `"{jd_skill}:::{cand_skill}:::sm-adj-v1"` (lower-cased). Lookup order: in-memory cache → snapshot `agent/data/snapshots/skill_pair_verdicts.json` → one LLM call at temperature 0. Pairs beyond the budget, or when the LLM is disabled (`SKILL_MATCH_USE_LLM=false`, or `fast_mode`) or fails, get `unrelated`. So the offline result is conservative: it can only lose credit, never invent it.

> **Spec vs build.** The spec's gray zone is $0.65\le\cos\theta\le0.82$. The build uses **semantic 0.76 ≤ cos < 0.88** (accept ≥ 0.88) and **fuzzy 78-91** (accept ≥ 92), both raised by 0.04 across categories. The spec's "snapshot verdict caching" exists in code, but the snapshot files `skill_pair_verdicts.json` and `skill_embeddings.json` are **not committed**, so offline runs rely on the in-process cache only.

> **Determinism note.** When Gemini embeddings are unavailable, `SnapshotEmbedder` builds a pseudo-vector seeded from Python's `hash()`, which is salted per process (`PYTHONHASHSEED`). Random 768-d vectors have cosine ≈ 0, so they almost never pass 0.76 and the effect is small, but results are not bit-reproducible across restarts. Fix: seed from `hashlib.sha256(key)` or commit the embeddings snapshot.

### 9.5 Scoring model `sm-1.0` (`scoring.py`)

Let $\kappa_j\in[0,1]$ be the credit from the cascade. Coverage:

$$
\text{MustCov}=\frac{\sum_{j\in\text{must}}w_j\kappa_j}{\sum_{j\in\text{must}}w_j},\qquad
\text{NiceCov}=\frac{\sum_{j\in\text{nice}}w_j\kappa_j}{\sum_{j\in\text{nice}}w_j}
$$

An alternative group $G$ contributes **once**: weight $\max_{j\in G}w_j$ and credit-weight $\max_{j\in G}w_j\kappa_j$. Meeting any one member fully satisfies the group; unmet alternatives are not penalised. No must-haves → MustCov = 1.

Level fit over the JD's `category_levels` $L^{JD}$:

$$
\text{LevelFit}=\frac{\sum_k\min(c_k,L^{JD}_k)}{\sum_k L^{JD}_k}\qquad(1\text{ if the JD has no levels})
$$

Raw score with weights $(\alpha,\beta,\gamma)=(0.60,0.20,0.20)$; if the JD has no nice-to-haves, $\alpha\leftarrow0.80,\ \beta\leftarrow0$:

$$
\text{RawScore}=100\,\big(\alpha\cdot\text{MustCov}+\beta\cdot\text{NiceCov}+\gamma\cdot\text{LevelFit}\big)
$$

Cap from missing must-haves ($n$ = must terms or must groups with credit < 0.30):

$$
\text{Cap}=\begin{cases}\min(100-10n,\ 49)&\text{MustCov}<0.5\\100-10n&\text{otherwise}\end{cases}
\qquad
\text{Score}=\operatorname{round}\big(\operatorname{clip}_{[0,\text{Cap}]}\text{RawScore}\big)
$$

Band: `strong` ≥ 75, `good` ≥ 50, `weak` < 50. `cap_reason` names up to two missing must-haves.

> **Spec vs build.** The spec's weights are **60 / 25 / 15**. The locked `sm-1.0` weights are **60 / 20 / 20** (`params.WEIGHTS`, `ScoreBreakdown.weights`), with nice weight folded into must when a JD has no nice-to-haves. The cap is −10 per missing must-have plus a hard ceiling of 49 when must coverage is below 50%.

### 9.6 Gap list (`gaps.py`)

Every JD term with credit < 0.85 is a gap: `missing` if credit < 0.30, else `partial`. For each gap:

- `closest_candidate_skill`: taxonomy related → parent → sibling/instance/general → same category.
- `effort`: `quick_win` if (partial and level shortfall ≤ 1) or (a closest skill exists and shortfall ≤ 1); otherwise `big_gap`.
- `learn_next`: taxonomy `learn_hint` + the topic ladder for the next one or two levels.
- Sorted by must first, then `impact_points` desc, then section order; `priority` is the rank.

### 9.7 Counterfactual delta engine

For gap $j^*$, re-run the same pure `score()` with that one decision replaced by an exact match at credit 1.0, everything else unchanged:

$$
\Delta_{j^*}=\max\Big(1,\ \text{Score}\big(\kappa_{j^*}\leftarrow1\big)-\text{Score}(\kappa)\Big)
$$

Because the cap is part of `score()`, closing a missing must-have can show a large jump (it lifts the cap by 10 and may lift the 49 ceiling). The UI shows `+Δ pts if learned` and `why_it_matters` repeats it with the JD quote.

> **Spec vs build.** The `max(1, ·)` floor means a gap whose real effect is 0 points (for example a nice-to-have while the score sits at a cap) is shown as +1. Consider returning the true delta and hiding zeros.

### 9.8 Known implementation issues in Role 5

| # | Issue | Where | Effect |
|---|---|---|---|
| 1 | `implied` matches are reported as `method: "alias"` in `matched_skills` (the service only passes through exact/alias/fuzzy/semantic/llm) | `service.py` | UI shows the wrong stage for Stage 3 matches; scoring is correct |
| 2 | Stage 7 `category` decisions have no candidate term, so they never appear in `matched_skills`, but they do earn credit | `service.py`, `cascade.py` | score includes credit the Match Links view cannot show |
| 3 | Stage 3 relations `general_form` (0.60) and `sibling` (0.50) can never be accepted (threshold 0.80) and are not sent to Stage 6 | `cascade.py` | "SQL" on a resume vs "PostgreSQL" in a JD only matches if fuzzy/semantic/LLM catch it |
| 4 | Snapshot embeddings / verdicts not committed; hash-seeded fallback vectors | `embeddings.py`, `adjudicate.py` | see 9.4 |

---

## 10. Quality, evaluation and robustness

### 10.1 Current automated test baseline (clean install, 2026-10-29)

| Suite | Tests | Notes |
|---|---|---|
| agent (`pytest`) | 316 | JD pipeline + fixtures, Talent Check vectors (`docs/contract/fixtures/talent_check_vectors.json`), Skill Match cascade/scoring, API |
| resume (`pytest`) | 54 (+1 Postgres, skipped without `TEST_DATABASE_URL`) | 4 sample candidates rendered to TXT/PDF/DOCX, invariants, moto S3 |
| backend (`vitest`) | 233 (+6 live Supabase, skipped offline) | routes, Zod schemas, profile ETags, stores |
| auth (`vitest` + supertest) | 26 (+1 live PG) | token rotation, reuse detection |
| frontend (`vitest`) | 445 | features, routing, How computed drawers |

CI was removed from the repository on 2026-10-29 by decision; these suites must be run by hand before a push.

### 10.2 Ground-truth evaluation methodology

> **Status:** the methodology below is specified in the role plans but **has not been run**: the organiser's labelled pack (6 JDs, 4 resumes, milestone sheet) is not in the repository. No precision/recall numbers exist yet. Do not quote any.

**Labelling.** Two people independently label each document with `(canonical_id, category_code, requirement)` for JDs and `(canonical_id, category_code)` plus a 1-10 level per category for resumes. Disagreements are resolved by discussion; Cohen's κ on the skill set is recorded.

**Skill extraction metrics** per document $d$, with predicted set $\hat S_d$ and gold set $S_d$ compared by `canonical_id`:

$$
P=\frac{\sum_d|\hat S_d\cap S_d|}{\sum_d|\hat S_d|},\qquad R=\frac{\sum_d|\hat S_d\cap S_d|}{\sum_d|S_d|},\qquad F_1=\frac{2PR}{P+R}
$$

Report also: category accuracy on matched skills, must/nice accuracy, evidence-verified rate (`meta.evidence_verified / |skills|`), and drop rate (`|meta.dropped|`).

**Level metrics** (resume and JD category levels): mean absolute error $\text{MAE}=\frac1{12}\sum_k|\hat\ell_k-\ell_k|$, share within ±1 level, and Bloom-band agreement.

**Targets proposed by the plans:** skill $F_1\ge0.85$ on JDs, level within ±1 on ≥ 80% of categories.

### 10.3 Robustness test matrix

| Scenario | Test | Expected | Status |
|---|---|---|---|
| Format parity | same resume as TXT, PDF, DOCX | same skills; every category level within ±1 | **automated** (resume suite) |
| Two-column layout | two-column PDF fixture | correct reading order, sections not interleaved | **automated** |
| Running headers / page breaks | multi-page PDF | header lines removed, hyphenation joined | automated |
| Deterministic stability (resume) | parse the same file twice | byte-identical extraction | automated (no LLM) |
| Deterministic stability (JD) | extract twice | second call is a cache hit; same `(document_id, prompt_version)` | verified e2e |
| LLM outage | all providers fail | keyword extraction, `meta.degraded = true`, never cached | automated |
| False friends | Java vs JavaScript, SQL vs NoSQL, React vs React Native | credit 0 at every stage | automated (cascade tests) |
| OR-groups | "AWS or GCP or Azure", candidate has GCP | group fully credited once; no missing-must for AWS/Azure | automated |
| Short tokens | "C", "Go", "R" | exact/alias only; English "go" ignored | automated |
| Unrepresented domain | finance/SAP JD skills | `OTHER`, still matched by S1-S6, not scored in Talent Check | partial |
| Company blurb noise | "a leader in financial services" | not extracted as a must skill | automated (regression) |
| Supabase down | no `SUPABASE_URL` | company bar from JSON snapshot (`bar_source: snapshot`), JDs in file store | verified e2e |
| Stale profile write | PUT with old version | 412 | automated |

### 10.4 Sample candidate differentiation

**Talent Check** (`tc-1.0`, computed from the seed profiles `backend/src/data/seedProfiles/*.json` and the snapshot bars; reproducible with the formula in 8.2):

| Candidate (profile type) | Google LLC (4) | Microsoft (78) | Oracle FSS (24) |
|---|---|---|---|
| Ananya Rao (SWE) | 62 almost (7 blocking) | 65 almost (5) | 89 **almost** (1 blocking: SQL 4 vs 7) |
| Karthik Subramaniam (data) | 48 not_yet | 48 not_yet | 68 almost |
| Priya Menon (support / Oracle) | 39 not_yet | 40 not_yet | 57 not_yet |
| Rohan Verma (all-rounder) | 76 almost | 80 **ready** | 98 ready |

What this shows: the score is not constant across people or companies; a high score can still be held back by one blocking category (Ananya at Oracle FSS); and Karthik's strengths (SQL 7, AI 6, APTI 7) matter more where the company asks for them.

**Skill Matching** (`sm-1.0`, measured end to end on 2026-10-29 with live Gemini, no Supabase, against the extracted Google SWE JD with 19 skills): Ananya 40, Priya 30, Karthik 30, Rohan 20. These depend on LLM extraction and adjudication, so they will move between runs that miss the cache; re-measure before quoting in a demo. Rohan scoring lowest on the JD while scoring highest on the company bar is a useful talking point: company readiness is about category depth, JD fit is about the specific listed skills.

---

## 11. Spec vs implementation register

| # | Area | Master-prompt spec | Built (source of truth) | Action |
|---|---|---|---|---|
| 1 | Tiers | 3 tiers | 5 services: frontend, backend, agent, resume, auth | document as is |
| 2 | Agent isolation | frontend never reaches the agent | true in code; ingress exposes `/api/agent` directly | remove the rule or set `AGENT_API_KEY` |
| 3 | Categories | "12 codes" listing 13 | 12 scored + `OTHER` | as is |
| 4 | Resume parsing | in agent, LangChain | offline `resume/` service, no LLM, lv-1.0 | as is (deliberate) |
| 5 | Evidence gate | verbatim only | exact → fuzzy ≥ 75 → rebuilt from skill name; else drop | as is; confidence stepped down |
| 6 | Talent Check formula | weighted dot product, non-linear penalties | linear levels-covered ratio + blocking gate (shortfall ≥ 3) | as is (`tc-1.0` locked) |
| 7 | SM weights | 60 / 25 / 15 | 60 / 20 / 20, nice folds into must if none | as is (`sm-1.0` locked) |
| 8 | SM cap | "must-have missing limits" | −10 per missing must; ≤ 49 if must coverage < 0.5 | as is |
| 9 | Gray zone | cos 0.65-0.82 | cos 0.76-0.879; fuzzy 78-91; +0.04 cross-category | as is |
| 10 | Verdict snapshot cache | present | code present, snapshot files missing | commit snapshots |
| 11 | Counterfactual field | `counterfactual_impact` | `impact_points`, floored at 1 | consider true delta |
| 12 | Stage reporting | method per match | implied shown as alias; category matches hidden | fix in `service.py` |
| 13 | Wizard routes | `/jds`, `/resumes`, `/profiles`, 5 steps | pages `/jd`, `/resume`, `/profile`; wizard `/flow`, 4 steps | as is |
| 14 | Storage | Supabase `talent-docs` | JDs: `talent-docs`; resumes: S3/local in resume service | as is |
| 15 | Ground-truth eval | P/R measured | methodology only, pack missing | run when pack arrives |
| 16 | Migrations | - | `candidate_profiles` created in two migrations | reconcile |

---

## 12. API reference

All public endpoints are under the backend (`/api`). Agent and resume endpoints are internal.

### 12.1 Backend (`:4000`, `/api`)

| Method | Path | Role | Body / query | Returns |
|---|---|---|---|---|
| GET | `/health`, `/whoami` (JWT) | - | - | status / user |
| POST | `/documents` | 1 | multipart `file` | document row (dedupe by sha256) |
| GET | `/documents/:id` | 1 | - | document |
| POST | `/jds/extract` | 1 | `{document_id, company_hint?, role?}` | `ExtractedSkillList` (cached) |
| GET | `/jds`, `/jds/:id` | 1 | - | list / one |
| POST | `/resumes` | 2 | multipart | resume record + extraction |
| POST | `/resumes/parse`, `/resumes/parse-text`, `/resumes/levels[/infer]` | 2 | file / text / extraction | extraction / levels |
| GET | `/resumes` (JWT), `/resumes/:id`, `/:id/file`, `/:id/profile-draft`, `/resumes/sample/:key` | 2 | - | record / file / draft / golden sample |
| POST | `/resumes/:id/reparse`; PATCH `/:id/claim` (JWT); DELETE `/:id` (JWT) | 2 | - | - |
| GET/POST | `/profiles` | 3 | `CandidateProfileInput` | list / 201 + ETag |
| POST | `/profiles/from-resume` | 3 | `{resume_extraction_id, profile_id?}` | draft |
| GET | `/profiles/calibration/:code` | 3 | - | topic ladder |
| GET/PUT/DELETE | `/profiles/:id` | 3 | PUT needs `If-Match` | profile + ETag |
| GET | `/profiles/:id/versions`, `/profiles/:id/cv-url` | 3 | - | history / URL |
| POST | `/flow/profile` | 3 | `{extraction}` | saved profile |
| POST | `/talent-check` | 4 | `{profile_id, company_id, skill_levels_override?}` | `TalentCheckResult` |
| GET | `/talent-check`, `/talent-check/matrix`, `/talent-check/rank` | 4 | query | history / matrix / ranking |
| GET | `/companies`, `/companies/:id`, `/:id/skills`, `/:id/skill-bar` | base, 4 | - | company data / bar |
| POST | `/skill-match` | 5 | `{profile_id, jd_id, options?}` | `SkillMatchResult` |
| GET | `/skill-match/matrix` | 5 | query | batch matrix |
| GET/POST | `/agent/health`, `/agent/jobs/:id`, `/agent/companies/:c/:artifact`, `/agent/:task` | base | - | research pipeline proxy |

`/talent-check` requires a JWT only when `AUTH_REQUIRED=true` (off by default for the demo).

### 12.2 Agent (`:8000`, internal)

| Method | Path | Purpose |
|---|---|---|
| POST | `/documents/parse` | bytes → structured document (lines, sections, pages) |
| POST | `/extract/jd`; GET `/extract/jd/version` | Role 1 extraction; prompt version for cache keys |
| POST | `/extract/resume`, `/extract/resume/json`; GET `/extract/resume/sample/{key}`; POST `/levels/infer` | Role 2 helpers (golden samples, level inference) |
| POST | `/talent-check`, `/talent-check/batch`, `/talent-check/rank` | Role 4 |
| POST | `/skill-match`, `/skill-match/batch` | Role 5 |
| GET | `/healthz`, `/readyz`, `/health`; POST `/doctor`, `/run`, `/validate`; GET `/jobs[/id]`, `/companies/{c}/artifacts...` | probes and the PlaceIntel research pipeline |

### 12.3 Resume service (`:8100`, internal)

`POST /parse`, `/parse/text`, `/levels/infer`; `POST|GET /resumes`; `GET /resumes/{id}`, `/file`, `/profile-draft`; `POST /resumes/{id}/reparse`; `PATCH|DELETE /resumes/{id}`; probes. The backend forwards `X-User-Id` from the verified JWT.

### 12.4 Auth service (`:4100`, `/api/auth`)

`GET /config`, `GET /google` → Google → `GET /google/callback` (tokens returned in the URL fragment to `/auth/callback`), `POST /refresh` (rotation with reuse detection), `/logout`, `/logout-all`, `GET /verify`, `GET|PATCH /me`.

---

## 13. Persistence model

```
 Existing (PlaceIntel)                                   New (Talent Match migrations, backend/supabase/migrations)
 ───────────────────────                                 ─────────────────────────────────────────────────────────
 companies ──┬── company_skill_levels (115 × 12)         documents (sha256 unique, storage_path)  ─┐
             │      └─ required_level 1-10                 extractions (document_id, prompt_version) ├─ 20261028_02
             ├── company_json (short/full JSON)            job_postings (company_id, role, skills)  ─┘
             └── company_logo                              candidate_profiles (profile jsonb, version) ─┐ 20261027120300
 skill_set_master (12, short_name = code)                  candidate_profile_versions                ─┘ + 20261028_01
 proficiency_levels (1-10 → CU..CR)                        resumes (user_id, sha256, extraction)       20261028_01
 skill_set_topics (skill × level → topics)                 auth_users, auth_refresh_tokens             20261028_01
 staging_* (raw research)                                  talent_checks (result jsonb)                20261027_04
                                                           skill_taxonomy, skill_matches               20261027_05
 Views: v_company_skill_bar (derived bloom, raw bloom, mismatch flag) · v_skill_topics (with SQL&Design fallback)
```

Fallbacks when Supabase is not configured: company bar from `agent/data/snapshots/talent_check_company_skillsets.json`; JDs in `backend/.data/jd-store/`; profiles in memory plus 4 golden seeds; topics from `backend/src/data/skillTopics.ts`.

---

## 14. Deployment, configuration and operations

### 14.1 Kubernetes

`k8s/`: one Deployment + Service per backend, agent, auth and resume (resume has a PVC `resume-data`); `ingress.yml` with 300 s timeouts for LLM calls; `secrets.example.yml` (real `secrets.yml` is git-ignored) defining `database`, `ai-secret`, `auth-secret`, `resume-secret`. `skaffold.yaml` builds all four images and applies the manifests. Images: backend `node:22-alpine` multi-stage, non-root; agent and resume `python:3.12-slim` with `uv` (15-min timeout, retries, BuildKit cache), non-root; the spaCy model is baked into the resume image. Probes `/healthz` and `/readyz` on every service.

### 14.2 Configuration

| Service | Variables (names only) |
|---|---|
| backend | `PORT`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`, `AGENT_URL`, `RESUME_URL`, `RESUME_API_KEY`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `AUTH_REQUIRED`, `JD_STORE` |
| agent | `GOOGLE_API_KEY`, `GROQ_API_KEY`, `NVIDIA_API_KEY`, `NVIDIA_MODEL[_2]`, `EXTRACT_PROVIDERS`, `RESEARCH_PROVIDERS`, `EMBED_MODEL`, `SKILL_MATCH_USE_LLM`, `SKILL_MATCH_USE_EMBEDDINGS`, `AGENT_API_KEY` |
| resume | `DATABASE_URL`, `S3_BUCKET`, `AWS_*`, `RESUME_API_KEY` |
| auth | `JWT_SECRET` (≥ 32 chars, same as backend), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `DATABASE_URL`, `ALLOWED_EMAIL_DOMAINS`, `ADMIN_EMAILS`, `AUTO_MIGRATE` |
| frontend | `VITE_API_URL`, `VITE_AUTH_REQUIRED`, `VITE_LOGO_DEV_PUBLISHABLE_KEY` |

### 14.3 Failure modes

| Dependency down | Behaviour |
|---|---|
| Agent | backend returns 502 `Agent service unreachable` (5-minute timeout per call) |
| All LLM providers | JD extraction degrades to keywords; Stage 6 marks gray pairs `unrelated` |
| Gemini embeddings | snapshot / pseudo-vectors; Stage 5 effectively off |
| Supabase | snapshot bar, file JD store, in-memory profiles |
| Resume service | `/api/resumes/*` 502; golden samples still served by the agent |

---

## 15. Versioning and change control

| Version string | Owner | Bump when |
|---|---|---|
| `tc-1.0` (`SCORING_VERSION`) | Role 4 | any change to the readiness formula, thresholds or blocking rule |
| `sm-1.0` (`MATCHING_VERSION`) | Role 5 | weights, cap, credits, thresholds |
| `tx-1.0` (`TAXONOMY_VERSION`) | Role 5 | taxonomy entries or edges (including `distinct_from`) |
| `sm-adj-v1` (`PROMPT_VERSION`) | Role 5 | Stage 6 prompt; invalidates the verdict cache |
| `jd-v1` (prompt), `jdlv-1.0` (levels) | Role 1 | JD prompt (invalidates extraction cache) / level rules |
| `lv-1.0` | Role 2 | any constant in `resume_service/levels.py` |
| contract v1.1 | all | change `docs/00-shared-contract.md` first, then the Pydantic and Zod models together |

Every stored result carries its version, so old results can be recognised and recomputed. Constants are tuned globally, never per candidate or per company.
