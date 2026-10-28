# RADIX Talent Match: architecture and flow

_A map of the whole system: the base project (PlaceIntel), the five hackathon features, how data moves between them, and where we are. Sources: the hackathon brief, [00-shared-contract.md](00-shared-contract.md) (locked v1.1) and the five role plans. Status in section 10 is as of 29 Oct 2026._

**Contents:** [1 Goal](#1-what-we-have-to-achieve) · [2 Base vs new](#2-base-project-versus-what-we-add) · [3 System](#3-system-architecture) · [4 The five features](#4-the-five-features-what-each-builds) · [5 Data contract](#5-the-shared-data-contract-what-flows-between-features) · [6 User flow](#6-the-user-flow) · [7 Role internals](#7-role-internals) · [8 Database](#8-database-existing-tables-and-new-ones) · [9 Delivery](#9-delivery-and-phases) · [10 Status](#10-where-we-are) · [11 Risks](#11-what-to-watch-for)

---

## 1. What we have to achieve

The brief asks for **one small, real, end-to-end tool that tells a candidate how ready they actually are for a specific job**, built on the same 12-skillset framework and real hiring data RADIX already researched.

- **The base project (PlaceIntel)** is the _company side_. It tells students what a visiting company tests, pays and expects.
- **The hackathon flips that lens to the candidate side.** Five team members each build one piece, then the pieces are wired into one flow.
- **"Done" means:**
  - all 5 pieces run on their own against at least 2 sample JDs or resumes;
  - they are wired into one flow for at least one company, JD and candidate;
  - Talent Check and Skill Matching give **visibly different results** for different candidates (the scoring is not a constant).
- **Test data:** 6 JDs (Google, Microsoft and Oracle FSS, 2 roles each) and 4 resumes (Ananya, Karthik, Priya, Rohan). Company bars are only needed for those 3 companies: Google is `company_id` 4, Microsoft 78, Oracle FSS 24.

---

## 2. Base project versus what we add

```mermaid
flowchart TB
  subgraph BASE["BASE PROJECT: PlaceIntel, the company side"]
    direction TB
    L1["Levels 1-2<br/>163-parameter research of companies<br/>12-skillset dictionary + hiring rounds<br/>Supabase: staging_company, normalized into ~88 tables"]
    L3["Level 3<br/>Data-quality rules driven by metadata<br/>about 1,500 checks"]
    L4["Level 4 agents, BUILT<br/>research x3 LLMs, consolidate, skills, hiring, test<br/>linear pipeline.py + FastAPI jobs"]
    L5["Level 5 LangGraph, NOT BUILT<br/>gates, retries, DB gate<br/>only reference files exist"]
    PORTAL["PlaceIntel portal<br/>company picker, company intelligence, skill ladders<br/>Express API + React app"]
    L1 --> L3 --> L4 -.-> L5
    L1 --> PORTAL
  end

  subgraph NEW["HACKATHON: Talent Match, the candidate side"]
    direction TB
    R1["1 JD Analytics<br/>JD file to required skills"]
    R2["2 Resume Parsing<br/>resume file to skills + levels"]
    R3["3 Profile Builder<br/>candidate profile, 12 levels"]
    R4["4 Talent Check<br/>profile vs a company's bar"]
    R5["5 Skill Matching<br/>profile vs one JD"]
    R1 --> R5
    R2 --> R3 --> R4
    R3 --> R5
  end

  L1 ==>|"company_skill_levels = the bar"| R4
  L1 ==>|"skill_set_topics = what each level means"| R3
  L4 -.->|"reuses providers.py, parsing.py, config.py"| NEW
```

**What the new features reuse from the base**

- the 12 skillset definitions and 10-level topic ladders (`skill_set_topics`);
- each company's required level per skillset (`company_skill_levels`);
- the LLM provider wrappers (NVIDIA, Groq, Gemini);
- the markdown and JSON parsing helpers;
- the Express, FastAPI and React architecture, and the k8s setup.

---

## 3. System architecture

```mermaid
flowchart LR
  USER(("Student"))

  subgraph FE["Frontend: React 19 + TS + Vite :5173"]
    direction TB
    FB["existing features<br/>companies, intelligence, skills"]
    FN["new features<br/>jd, resume, profile, talentCheck, skillMatch"]
    FF["flow: 5-step wizard at /match<br/>keeps jd_id, document_id, resume_extraction_id, profile_id"]
    FL["4 layers per feature<br/>components, Hooks, service Axios, slice RTK"]
    FB --- FL
    FN --- FL
    FF --- FL
  end

  subgraph BE["Backend: Express 5 + TS :4000, the single writer"]
    direction TB
    BR["routes, controllers, services"]
    BV["zod validation, caching by sha256 + prompt_version"]
    BD["documents, jds, resumes, profiles, talentCheck, skillMatch"]
    BR --- BV --- BD
  end

  subgraph AG["Agent: Python 3.11, FastAPI + LangChain :8000, stateless"]
    direction TB
    AD["documents.py: PDF/DOCX to text + sections"]
    AL["llm.py: structured output + provider fallback"]
    AX["jd/ resume/ levels.py"]
    AT["talent_check/ scoring, pure function"]
    AS["skill_match/ cascade + taxonomy.py"]
    AC["contract.py: Pydantic models<br/>single source of truth, exports JSON Schema"]
    AD --> AX
    AL --> AX
    AL --> AS
    AC -.-> AX
    AC -.-> AT
    AC -.-> AS
  end

  subgraph SB["Supabase Postgres + Storage"]
    direction TB
    SE["existing: company_skill_levels, skill_set_master,<br/>skill_set_topics, company_json, companies"]
    SN["new: documents, extractions, job_postings,<br/>candidate_profiles + versions, talent_checks,<br/>skill_matches, skill_taxonomy"]
    ST[("Storage bucket talent-docs<br/>resume and jd files")]
  end

  LLM["LLM providers<br/>NVIDIA, Groq, Gemini, OpenRouter"]

  USER --> FE
  FE -->|"/api, the only door"| BE
  BE -->|"supabase-js, service-role key"| SB
  BE -->|"HTTP JSON, agent.service.ts"| AG
  AG --> LLM
  AC -. "JSON Schema, then generated TS and zod types" .-> BE
  AC -. "generated TS types" .-> FE
```

**Why it is split this way**

- The **agent is stateless compute**: extraction, level inference, scoring and matching. It never needs database credentials, so it scales horizontally.
- The **backend owns state**: uploads, Supabase reads and writes, caching and validation.
- `contract.py` generates the TypeScript and zod types, so the three services can't drift apart.
- Every LLM result is **cached by document hash**, so the same JD or resume is never paid for twice.
- **LLMs only extract or adjudicate. They never produce the final number.** Scores are pure, versioned functions, so they are explainable and testable.

---

## 4. The five features: what each builds

| # | Feature | Owner | Input | Output | Core idea |
|---|---|---|---|---|---|
| 1 | **JD Analytics** | Sahil | JD (PDF/DOCX) | `ExtractedSkillList` (jd) | LLM reads the prose, maps each requirement to one of the 12 categories plus named technologies, tags must or nice, and implies a level. Every skill must quote a sentence that is verified to exist in the JD, otherwise it is dropped. |
| 2 | **Resume Parsing** | Himanshu | Resume (PDF/DOCX) | `ResumeExtraction` | Same pattern for messy layouts. Also extracts education, experience, projects, hackathons and certifications. Infers a 1-10 level per category with a deterministic, explainable points model (`lv-1.0`); the LLM can only nudge it by ±1 and must cite evidence. Email and phone are masked before text reaches a third-party LLM. |
| 3 | **Profile Builder** | Raunak | Form, pre-filled from Role 2 | `CandidateProfile` | Plain code. The form, validation, JSON save/load and the 12 `skill_levels`, each tagged `resume_inferred`, `self` or `assessed`. Re-importing a CV merges and never overwrites. |
| 4 | **Talent Check** | Aryan | Saved profile + company | Readiness score + per-skillset gaps | Pure scoring against the company bar. |
| 5 | **Skill Matching** | Shreyansh | Profile or resume + one JD list | Match score + matched and missing skills | A 6-stage cascade (exact, alias, fuzzy, semantic, then an LLM only for the gray zone). A gap list with "points gained if closed". |

**The two scoring decisions (locked)**

- **Talent Check `tc-1.0`:** `readiness = 100 × Σ(min(c, r) − 1) / Σ(r − 1)`, where `c` is the candidate's level and `r` the company's required level.
  - A category is _blocking_ when it is 3 or more levels short.
  - **Ready** = score ≥ 80 and no blocking row. **Almost** = 60-79, or ≥ 80 with a blocking row. **Not yet** = below 60.
- **Skill Matching `sm-1.0`:** `100 × (0.60 × must_coverage + 0.20 × nice_coverage + 0.20 × level_fit)`.
  - Capped at 100 − 10 per missing must-have.
  - Capped at 49 when must coverage is below 50%.

---

## 5. The shared data contract: what flows between features

```mermaid
flowchart LR
  JDF[/"JD file"/] --> R1["Role 1<br/>JD Analytics"]
  CVF[/"Resume file"/] --> R2["Role 2<br/>Resume Parsing"]

  R1 -->|"ExtractedSkillList<br/>source_type = jd<br/>skills, company, role, category_levels"| R5
  R2 -->|"ResumeExtraction<br/>skills, candidate, education, experience,<br/>projects, hackathons, certs, category_levels"| R3

  R3["Role 3<br/>Profile Builder"] -->|"CandidateProfile<br/>brief fields + skill_levels x 12<br/>profile_id + version"| R4
  R3 -->|"CandidateProfile<br/>skills, projects, internships"| R5

  BAR[("company bar<br/>company_skill_levels")] -->|"12 required levels"| R4

  R4["Role 4<br/>Talent Check"] -->|"TalentCheckResult<br/>skillset_gap x 12, readiness_score"| OUT["Result screen"]
  R5["Role 5<br/>Skill Matching"] -->|"SkillMatchResult<br/>match_score, matched_skills, missing_skills"| OUT
```

The 12 category codes are **COD, DSA, APTI, COMM, OOD, AI, SQL, SYSD, CLOUD, SWE, NETW, OS**. Anything else is `OTHER`.

**The one hole in the brief that Role 3 fills.** Talent Check compares `candidate_level` (1-10) per category, but the brief's profile only has a skill list. Our `skill_levels` field gives it exactly 12 levels, each an integer 1-10, with no zeros and no nulls. A category with no evidence is 1, low confidence, basis "no evidence".

---

## 6. The user flow

```mermaid
sequenceDiagram
  autonumber
  actor S as Student
  participant FE as Frontend /match wizard
  participant BE as Backend :4000
  participant AG as Agent :8000
  participant DB as Supabase
  participant LLM as LLM providers

  Note over S,FE: Step 1: pick a JD
  S->>FE: choose one of the 6 JDs, or upload one
  FE->>BE: POST /api/documents, kind=jd
  BE->>DB: store file, dedupe by sha256
  FE->>BE: POST /api/jds/extract
  BE->>DB: cache hit on sha256 + prompt_version?
  BE->>AG: POST /extract/jd
  AG->>LLM: structured extraction
  AG-->>BE: ExtractedSkillList
  BE->>DB: save extractions + job_postings

  Note over S,FE: Step 2: parse the resume
  S->>FE: upload CV
  FE->>BE: POST /api/documents, kind=resume
  FE->>BE: POST /api/resumes/parse
  BE->>AG: POST /extract/resume
  AG->>LLM: per-section extraction
  AG-->>BE: ResumeExtraction + category_levels
  BE->>DB: save extractions

  Note over S,FE: Step 3: build or update the profile
  FE->>BE: POST /api/profiles/from-resume
  BE-->>FE: draft + provenance + diff
  S->>FE: review chips, set sliders, calibrate
  FE->>BE: POST or PUT /api/profiles, If-Match
  BE->>DB: candidate_profiles + version history
  BE-->>FE: profile_id + version

  Note over S,FE: Step 4: Talent Check against a company
  S->>FE: pick a company
  FE->>BE: POST /api/talent-check
  BE->>DB: load profile + company bar
  BE->>AG: POST /talent-check, pure scoring
  AG-->>BE: TalentCheckResult
  BE->>DB: save talent_checks, profile_version recorded
  BE-->>FE: readiness + gaps + study plan

  Note over S,FE: Step 5: Skill Matching against that JD
  FE->>BE: POST /api/skill-match
  BE->>AG: POST /skill-match
  AG->>LLM: only the gray-zone pairs
  AG-->>BE: SkillMatchResult
  BE->>DB: save skill_matches
  BE-->>FE: score + gap list
```

The **final screen** shows the Talent Check radar (candidate against the company bar) next to the Skill Match gap list. A **Compare candidates** toggle shows the 4 × 3 readiness heatmap and the 4 × 6 match grid. That one view proves the "visibly different results" requirement.

---

## 7. Role internals

### Roles 1 and 2: one shared extraction engine

```mermaid
flowchart LR
  F[/"PDF or DOCX"/] --> D["documents.py<br/>text + sections + positions"]
  D --> S["section detection<br/>JD: Responsibilities, What we look for<br/>Resume: education, experience, projects"]
  S --> M["mask email and phone<br/>resumes only"]
  M --> P1["Pass 1: LLM structured extraction<br/>llm.py with provider fallback<br/>one repair retry on bad JSON"]
  P1 --> G{"evidence quote found<br/>in the source text?"}
  G -- no --> X["skill dropped<br/>anti-hallucination gate"]
  G -- yes --> P2["Pass 2: deterministic post-processing<br/>canonical_id, confidence rule, must or nice"]
  P2 --> LV["level inference<br/>JD: wording to level<br/>resume: evidence points to level"]
  LV --> C[("extractions table<br/>cached by sha256 + prompt_version")]
  P1 -.->|"every provider failed"| K["keyword fallback<br/>visible degraded banner"]
```

### Role 3: Profile Builder (built)

```mermaid
flowchart TB
  EX[("ResumeExtraction")] --> MAP["profileMapping<br/>draft + provenance per field"]
  MAP --> SLB["buildSkillLevels<br/>always exactly 12 codes"]
  SLB --> DRAFT["POST /profiles/from-resume<br/>draft + provenance + diff"]
  EX2[("existing profile")] --> MERGE["profileMerge<br/>union by identity key<br/>self-set levels never changed<br/>idempotent"]
  MAP --> MERGE --> DRAFT
  DRAFT --> FORM["7-step form<br/>Start, Basics, Education, Experience,<br/>Achievements, Skills, Skill levels"]
  FORM --> SAVE["POST or PUT /profiles"]
  SAVE --> C1{"checks"}
  C1 -- "duplicate email" --> E409["409 + existing_profile_id"]
  C1 -- "stale If-Match" --> E412["412 + current profile<br/>conflict dialog"]
  C1 -- "no If-Match" --> E428["428"]
  C1 -- ok --> DB[("candidate_profiles<br/>+ candidate_profile_versions")]
  DB --> OUT["profile_id + version<br/>to Roles 4 and 5"]
```

### Role 4: Talent Check scoring

```mermaid
flowchart LR
  P[("profile.skill_levels x 12")] --> J
  B[("company bar x 12<br/>view v_company_skill_bar")] --> J["for each category:<br/>gain = min of c and r, minus 1<br/>room = r minus 1"]
  J --> SC["readiness = 100 x sum gain / sum room"]
  J --> BL["blocking = 3 or more levels short"]
  SC --> V{"verdict"}
  BL --> V
  V -->|"score 80 or more, nothing blocking"| R1["READY"]
  V -->|"60 to 79, or 80+ with a blocking row"| R2["ALMOST"]
  V -->|"below 60"| R3["NOT YET"]
  J --> T["topics for the missing levels<br/>from skill_set_topics<br/>+ study plan"]
```

### Role 5: Skill Matching cascade

```mermaid
flowchart LR
  A["JD skills"] --> C1
  B["candidate skills"] --> C1
  C1["1 exact"] --> C2["2 alias, taxonomy"] --> C3["3 fuzzy, rapidfuzz"] --> C4["4 semantic, embeddings"] --> C5["5 LLM<br/>gray-zone pairs only<br/>max one batched call"] --> C6["6 implied or category credit"]
  C6 --> SC["sm-1.0 pure score<br/>must 60% + nice 20% + level fit 20%<br/>caps for missing must-haves"]
  SC --> GAP["gap list, ranked<br/>JD line, closest skill you have,<br/>what to study, points gained if closed"]
```

---

## 8. Database: existing tables and new ones

```mermaid
erDiagram
  companies ||--o{ company_skill_levels : "the bar"
  skill_set_master ||--o{ company_skill_levels : defines
  skill_set_master ||--o{ skill_set_topics : "level ladder"

  documents ||--o{ extractions : "parsed into"
  extractions ||--o| job_postings : "jd only"
  companies ||--o{ job_postings : "resolved company_id"
  extractions ||--o{ candidate_profiles : "resume_extraction_id"
  candidate_profiles ||--o{ candidate_profile_versions : history
  candidate_profiles ||--o{ talent_checks : "profile_id + profile_version"
  companies ||--o{ talent_checks : "company_id"
  candidate_profiles ||--o{ skill_matches : "profile_id + profile_version"
  job_postings ||--o{ skill_matches : "job_posting_id"

  documents { uuid id PK
    string kind "jd or resume"
    string sha256 UK
    string storage_path }
  extractions { uuid id PK
    uuid document_id FK
    string prompt_version
    jsonb result }
  candidate_profiles { uuid id PK
    string email UK
    jsonb profile
    int version
    int completeness }
  talent_checks { uuid id PK
    int readiness_score
    string scoring_version }
  skill_matches { uuid id PK
    int match_score
    string matching_version }
```

Existing tables are never modified. Roles 4 and 5 store `profile_version`, so an old score can always be explained on the exact profile it used.

---

## 9. Delivery and phases

```mermaid
flowchart LR
  subgraph K8S["Local cluster: Docker Desktop Kubernetes, via skaffold dev"]
    ING["nginx Ingress :80"] -->|"/api"| SVB["backend-service"]
    ING -->|"/api/agent"| SVA["agent-service"]
    SVB --> PB["backend pod :4000"]
    SVA --> PA["agent pod :8000"]
    SEC[/"Secrets: ai-secret, database"/] -.-> PB
    SEC -.-> PA
  end
  FEV["Frontend, Vercel or npm run dev"] -->|"/api"| ING
  PB --> SUP[("Supabase")]
  PA --> LLMS["LLMs"]
```

| Phase | Goal |
|---|---|
| **P0** Contract, 27 Oct | `contract.py`, migrations and stub endpoints returning golden JSON, so Roles 3, 4 and 5 are unblocked at once |
| **P1** Done-by-brief | every role runs on at least 2 samples, plus one end-to-end flow (Google SWE × Ananya) |
| **P2** Stand-out | wizard, heatmaps, explanations, eval numbers, all 6 JDs × 4 resumes pre-computed |
| **P3** Scale story | jobs table with polling, pgvector taxonomy, batch endpoints (or slides only) |
| **Presentations** | 29 Oct peer round (45 min, top 9), 30 Oct expert panel (top 3), 31 Oct TGL Blitz finale. Each presentation covers the problem, the architecture, a live demo, and one challenge faced |

---

## 10. Where we are

_As of 29 Oct 2026._

- **Built and verified: Role 3**, backend and frontend, with 358 tests passing (173 backend, 185 frontend). Two things are left open: the SQL migration is not applied to Supabase, and the work is not committed.
- **Role 4:** the branch `origin/feature/aryan` has a `talent_match/talent_check/` package. Not reviewed.
- **Roles 1, 2 and 5:** on `main`, as of the last check, these exist only as plan documents.
- **Not in the repo yet:** `contract.py`, the JSON Schema export and `agent/src/talent_match/api.py`. They are listed in the contract's layout but don't exist, so the hand-written schemas stand in for them.
- **Still open from the base project:** the LangGraph pipeline (Level 5), a separate piece of work from Talent Match.

---

## 11. What to watch for

1. **Integration is the risk, not any single role.** The `flow` slice (the wizard that holds `jd_id`, `resume_extraction_id` and `profile_id`) has no owner in the five role plans. It belongs to the Scrum Master.
2. **Company bar data is messy.** Role 4's plan found that 698 of 1,380 Bloom codes disagree with their numeric level (Google Coding is stored as "8-CR", but 8 is EV). We score on the number.
3. **Oracle FSS must resolve to company 24, not Oracle India (company 3).** One pinned resolver, `resolveCompanyId()`, is shared by all roles.
4. **The demo needs the network to be reliable.** Every role has an offline fallback: an in-memory profile store, the company-bar snapshot, and cached extractions.
