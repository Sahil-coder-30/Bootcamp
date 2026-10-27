# Role 5: Skill Matching, implementation plan

_Owner: Role 5. Written 2026-10-27 against [00-shared-contract.md](../00-shared-contract.md) (locked). Deadline Wed 28 Oct 2026. Anything that would change the contract is listed in section 12 and nowhere else is assumed._

---

## 1. Mission and what "stand out" means for this role

The job: given one candidate (saved profile, or a resume extraction) and **one** JD skill list from Role 1, say how well they match, **what is missing and what to do about it**.

- **Gap list first, score second.** The first thing on screen is a ranked list of what is missing, each item with the JD line that asks for it, the closest skill the candidate already has, what to study next, and **how many points closing that gap would add** (a computed counterfactual, not a guess).
- **Every match explains itself.** Each matched pair carries the method that matched it (`exact`, `alias`, `fuzzy`, `semantic`, `llm`, plus `implied` and `category`, see section 12), a similarity and a credit. The UI draws the links between the two skill lists, colored by method.
- **Cheap first, LLM last.** A 6-stage cascade resolves most pairs with dictionaries and string math in microseconds; the LLM only sees the gray-zone pairs, batched into at most one call per match. The final number is a deterministic, versioned pure function (`matching_version = "sm-1.0"`), as contract rule 6.3 requires.
- **We measured it.** A labelled set of about 150 skill pairs from the real samples gives precision/recall per cascade stage and an ablation table for the slides. Ordering tests prove the brief's stated fits (Karthik over Ananya on data roles, Priya best on Oracle FSS).
- **It scales.** One batch endpoint computes the 4 x 6 grid with a single embedding call and one or two LLM calls in total. P3 adds pgvector so the same design works for 10k postings (retrieve then rerank).

---

## 2. Inputs, outputs and hand-offs

| Direction | Object | Contract section | From / to |
|---|---|---|---|
| In | `ExtractedSkillList` (`source_type = "jd"`, with `category_levels`, each `Skill` with `requirement`, `section`, `level_hint`, `canonical_id`) | 3.1, 3.2 | Role 1, read by the backend from `extractions` via `job_postings` |
| In | `CandidateProfile` (`skills`, `projects`, `internships`, `certifications`, `skill_levels` for all 12 codes) | 3.4 | Role 3, `candidate_profiles.profile` |
| In (alt) | `ResumeExtraction` (when there is no profile yet; brief says "a profile or resume") | 3.3 | Role 2, `extractions` |
| In | `skill_set_topics` (level 1-10 topics per category) for `learn_next` | 5 (existing table) | backend loads, same loader Role 4 uses, with the `src/data/skillTopics.ts` fallback for SQL (id 7 is empty in the DB) |
| Out | `SkillMatchResult` | 3.6 | stored in `skill_matches`, shown in `features/skillMatch` and step 5 of the `flow` wizard |
| Out | taxonomy (`taxonomy.py`) | 1 (repo layout) | used by Role 1 and Role 2 to fill `Skill.canonical_id` via `taxonomy.resolve()` |

Routes owned (section 4 of the contract): `POST /api/skill-match {profile_id, jd_id}` -> agent `POST /skill-match`; `GET /api/skill-match/matrix` -> agent `POST /skill-match/batch`. Tables owned (section 5): `skill_matches`, `skill_taxonomy`.

`jd_id` means `job_postings.id` (the id that `GET /api/jds/:id` returns); `skill_matches.job_posting_id` stores it.

**Agent purity.** As with Talent Check, the backend sends everything the agent needs (JD extraction, profile, topics); the agent never touches the DB. The taxonomy ships inside the agent as code.

---

## 3. Approach and design

### 3.1 Term preparation

- **JD terms.** One `JdTerm` per JD `Skill`, after merging duplicates by `canonical_id` (keep the highest weight, keep all evidence strings). Skills that are alternatives ("one or more of Java, C++, Python or Go") become one **alternative group** that is satisfied by its best member. Role 1 should tag these with `alt_group` (section 12); until then a heuristic groups skills that share the same evidence string when it contains ` or `, `one of`, `any of`, `one or more`.
- **Candidate terms.** From `profile.skills`, plus every name in `projects[].skills`, `internships` / `experience[].skills` and `certifications[].name`, deduplicated by `canonical_id`. Each term keeps its best evidence and confidence (project or internship usage counts as `high`, per the contract's confidence rule).
- **Normalization** (`normalize.py`): lowercase, NFKC, strip version numbers (`Python 3.11` -> `python`), drop filler (`experience with`, `knowledge of`, `proficiency in`, `hands-on`, `strong`), `&` -> `and`, singularize the last token, split compounds on `/` and `,` (`HTML/CSS` -> two terms). It keeps `+`, `#` and `.` so `C++`, `C#`, `.NET`, `Node.js` survive.

### 3.2 The cascade

Each JD term is compared with every candidate term. Stages run cheapest first; a JD term stops at the first stage that gives full credit (1.0). The best credit over all candidate terms and stages wins. Every decision records `method`, `similarity` and `credit`.

```
JD term j  x  candidate terms C
  │
  ├─(1) exact      normalized surface form equal ............................. credit 1.00
  ├─(2) alias      different surface form, same canonical_id via taxonomy ...... credit 1.00
  │                (JS=JavaScript, k8s=Kubernetes, Postgres=PostgreSQL, ML=Machine Learning)
  ├─(3) implied    taxonomy graph relation (transitive):
  │                  cand is an instance of j   (PostgreSQL -> relational databases) 0.90
  │                  cand implies j             (Spring Boot -> Java, PyTorch -> Python) 0.80
  │                  cand is the general form   (SQL for "PostgreSQL")                0.60
  │                  sibling                    (MySQL for "PostgreSQL", AWS for GCP) 0.50
  │                  distinct_from pair         (Java / JavaScript, SQL / NoSQL) -> BLOCK, skip 4-6
  ├─(4) fuzzy      rapidfuzz token_set_ratio, skipped when either side < 4 chars
  │                  >= 92 accept 0.95 | 78-91 gray | < 78 reject
  │                  subset rule: if one token set strictly contains the other
  │                  ("python" vs "python django") the score is capped at 85 -> gray
  ├─(5) semantic   cosine of 768-d embeddings (cached), top-3 candidates per j
  │                  >= 0.88 accept 0.90 | 0.76-0.879 gray | < 0.76 reject
  │                  (+0.04 on both bounds when categories differ and neither is OTHER)
  ├─(6) llm        ONE batched call over all gray pairs (max 2 per j, max 40 per request,
  │                  must-haves first); verdict equivalent 0.90 | partial 0.50 | unrelated 0
  └─(7) category   fallback for concept terms ("strong CS fundamentals", "problem solving",
                     "communication"): compares candidate skill_levels with the JD level
                     credit = 0.8 x min(1, cand_level / req_level) x conf_factor
final credit c_j = max over stages and candidates, x evidence factor of the winning candidate term
evidence factor: high 1.00, medium 0.90, low 0.75 (contract confidence rule 3.1)
```

`method` values per stage: `exact`, `alias`, `implied`, `fuzzy`, `semantic`, `llm`, `category`. The contract enum has the first five plus `fuzzy`; `implied` and `category` are proposed in section 12. Until they land, the agent emits `alias` for `implied` and `semantic` for `category`, with the real value in `relation`, so nothing breaks validation.

### 3.3 Taxonomy design (`taxonomy.py`)

```python
class TaxonomyEntry(BaseModel):
    canonical_id: str                  # "postgresql"
    display_name: str                  # "PostgreSQL"
    category_code: CategoryCode        # "SQL"
    kind: Literal["language", "framework", "tool", "platform", "concept", "domain", "soft"]
    aliases: list[str] = []            # ["postgres", "psql", "postgre sql"]
    parents: list[str] = []            # ["relational-databases"]   (is-a, a DAG)
    implies: list[str] = []            # spring-boot -> ["java"], pytorch -> ["python", "machine-learning"]
    related: list[str] = []            # kubernetes -> ["docker"]   (no credit, only for closest_candidate_skill)
    distinct_from: list[str] = []      # java -> ["javascript"]     (false friends: block fuzzy/semantic)
    maps_to_categories: list[CategoryCode] = []   # concept only: "cs-fundamentals" -> ["DSA", "OS", "NETW"]
    learn_hint: str | None = None      # "Pods, Deployments, Services; deploy your Docker app on minikube"

TAXONOMY_VERSION = "tx-1.0"
SEED: list[TaxonomyEntry] = [...]     # about 250 entries in P1, Role 1 appends while extracting
```

- **Seeding.** Role 1 and Role 2 run extraction over all 10 sample documents. `python -m talent_match.taxonomy suggest --from agent/tests/golden/` prints every skill name that `resolve()` cannot place, grouped by category, with the nearest existing entry. Role 5 curates them into `SEED` (alias or new entry). Target: 100 % of sample skill names resolve.
- **Graph.** On import, the module builds `ancestors(cid)` and `implies_closure(cid)` once (transitive, cycle-checked by a unit test) and an alias index `normalized alias -> canonical_id`.
- **Unknown skills** keep a slug `canonical_id` (`slugify(normalized)`) and the extractor's `category_code`, so they still go through stages 4 to 6.
- **Mirror table.** `skill_taxonomy` is a read model of `SEED` (exported with `python -m talent_match.taxonomy export > agent/data/snapshots/skill_taxonomy.json`, upserted by a backend script). Code is the source of truth; the table exists for the pgvector index in P3 and for SQL analytics.

### 3.4 Thresholds and how they are tuned

| Stage | Auto-accept | Gray (to LLM) | Reject | Notes |
|---|---|---|---|---|
| fuzzy `token_set_ratio` | >= 92 | 78-91 | < 78 | skipped if a side has < 4 chars ("Go", "C", "R", "SQL" only match via exact/alias) |
| semantic cosine | >= 0.88 | 0.76-0.879 | < 0.76 | +0.04 on both bounds across categories |
| category fallback | n/a | n/a | n/a | only for `kind = concept` JD terms |

These are starting values. On the labelled pair set (section 8) we grid-search fuzzy accept in {86..96} and semantic accept in {0.82..0.94}, with the objective **maximize recall subject to precision >= 0.95 on auto-accepts** (auto-accepts must be safe; anything doubtful goes to the LLM). We tune on 70 % of the pairs and report on the held-out 30 %. The chosen values are frozen in `params.py` and printed in every result's `meta`.

**Embeddings.** Primary: Gemini embeddings through `langchain_google_genai.GoogleGenerativeAIEmbeddings` with the existing `GOOGLE_API_KEY`, `EMBED_MODEL` in `.env` (default `models/gemini-embedding-001`), 768 output dimensions to match `vector(768)`, task type semantic similarity, vectors L2-normalized. Input text is `"{display_name} ({category name})"` so "Spark" is embedded as a data tool, not a spark plug. Vectors are cached by `sha256(model + text)` in a local cache file and exported to `agent/data/snapshots/skill_embeddings.json` for every sample skill, so the demo runs offline. A local `sentence-transformers/all-MiniLM-L6-v2` is an optional extra (`pip install .[local-embed]`, 384-d, its own cache namespace, never written to pgvector). If no embedder is reachable, stage 5 is skipped and `meta.warnings` says so; the score is still produced.

### 3.5 LLM adjudication prompt (skeleton)

Uses `talent_match.llm` (Role 1's structured-output chain with provider fallback), `temperature=0`, provider order `MATCH_PROVIDERS=groq,openrouter,gemini` (Groq first for latency). Output validated with Pydantic; one repair retry with the validation error, per contract rule 6.1.

```text
SYSTEM: You are a strict technical recruiter. For each pair decide whether the candidate's
skill satisfies the job requirement. Answer only with JSON matching the schema.
Definitions:
- equivalent: a recruiter would tick this requirement as met (same skill, synonym, or the
  candidate skill is a specific instance of the required general skill).
- partial: adjacent or transferable; the candidate would need weeks, not months, to meet it.
  A general skill offered for a specific tool is at most partial.
- unrelated: anything else. Different programming languages are unrelated even when the
  names look alike (Java vs JavaScript). SQL vs NoSQL is partial at most.
Use the context lines; do not invent experience the context does not show.

USER: {"pairs": [
  {"id": "p1", "jd_skill": "Distributed systems", "jd_context": "design and build large-scale distributed systems",
   "candidate_skill": "Kafka event pipeline", "candidate_context": "Built a Kafka pipeline processing 50k events/min"},
  ...]}

SCHEMA: {"verdicts": [{"id": "p1", "verdict": "equivalent|partial|unrelated", "reason": "<= 20 words"}]}
```

Ids missing from the answer count as `unrelated` with a warning. Verdicts are cached by `(normalize(jd), normalize(cand), prompt_version)`, so a repeated pair never costs a second call and the same input always gives the same score. `prompt_version = "sm-adj-v1"`.

### 3.6 Scoring formula (`sm-1.0`, pure function)

**Weight of a JD term:** `w_j = base(requirement) x section_factor x jd_conf`

| base | must 3.0, nice 1.0 |
|---|---|
| section_factor | requirements 1.0, skills 1.0, responsibilities 0.8, education 0.6, other 0.6 |
| jd_conf | high/medium 1.0, low 0.7 |

An alternative group counts once, with the largest member weight and the best member credit.

```
must_coverage = Σ_must w_j c_j / Σ_must w_j
nice_coverage = Σ_nice w_j c_j / Σ_nice w_j        (if the JD has no nice skills, its 0.20 moves to must)
level_fit     = Σ_k min(cand_k, req_k) / Σ_k req_k  over categories k in jd.category_levels
                (cand_k = profile.skill_levels[k].level, or resume category_levels; weighted by the
                 required level, the same idea Talent Check uses, so the two screens agree)
raw   = 100 x (0.60 must_coverage + 0.20 nice_coverage + 0.20 level_fit)
cap   = 100 - 10 x n_missing_must          (n_missing_must = must terms with c_j < 0.30)
        and cap = min(cap, 49) when must_coverage < 0.50
match_score = round(clamp(min(raw, cap), 0, 100))
band  = strong >= 75, good 50-74, weak < 50
```

Rationale: the cap means a candidate can never look like a decent match by ticking nice-to-haves while missing the core of the posting. We considered a per-skill level penalty as well and rejected it: it double counts with `level_fit`.

**Classification of each JD term:** `full` if `c_j >= 0.85` (matched only), `partial` if `0.30 <= c_j < 0.85` (in `matched_skills` with its credit **and** in `missing_skills` with `gap_type: "partial"`, labelled "strengthen"), `missing` if `c_j < 0.30`.

### 3.7 Worked example (illustrative numbers: Ananya x Google SWE)

The real numbers come from the extractions; this is the shape the unit test `test_scoring.py::test_worked_example` pins exactly.

| # | JD term (req, section) | w | Best candidate term | Method | c |
|---|---|---|---|---|---|
| 1 | Data structures and algorithms (must, req) | 3.0 | Data Structures and Algorithms | exact | 1.00 |
| 2 | Java / C++ / Python / Go, any one (must, req) | 3.0 | Golang | alias | 1.00 |
| 3 | Distributed systems (must, resp) | 2.4 | Kafka event pipeline (semantic 0.82, gray) | llm equivalent | 0.90 |
| 4 | System design (must, req) | 3.0 | skill_levels SYSD 4 vs 5, medium | category 0.8 x 0.8 x 0.9 | 0.576 |
| 5 | Strong CS fundamentals (must, req) | 3.0 | OS 5/5, NETW 4/5, high | category 0.8 x 0.9 x 1.0 | 0.72 |
| 6 | Software testing (must, resp) | 2.4 | Unit testing with pytest (fuzzy 81, gray) | llm partial | 0.50 |
| 7 | Kubernetes (must, req) | 3.0 | none (Docker is `related`) | | 0.00 |
| 8 | Git (must, req) | 3.0 | Git | exact | 1.00 |
| 9 | Machine learning (nice) | 1.0 | PyTorch (medium) | implied 0.8 x 0.9 | 0.72 |
| 10 | GCP (nice) | 1.0 | AWS | implied (sibling) | 0.50 |
| 11 | Open-source contributions (nice) | 1.0 | none | | 0.00 |
| 12 | Communication (nice) | 1.0 | COMM 6 vs 4, medium | category 0.8 x 1 x 0.9 | 0.72 |

- must_coverage = 16.248 / 22.8 = **0.713**; nice_coverage = 1.94 / 4 = **0.485**
- level_fit with JD `{DSA:6, COD:6, SYSD:5, OS:5, NETW:4, CLOUD:4, SWE:5}` and Ananya `{6, 6, 4, 5, 4, 3, 5}` = 33 / 35 = **0.943**
- raw = 100 x (0.6 x 0.713 + 0.2 x 0.485 + 0.2 x 0.943) = **71.3**; n_missing_must = 1 so cap = 90; **match_score = 71, band good**
- Counterfactual for the gap list: Kubernetes at c = 1 gives must 0.844, raw 79.2, so `impact_points = +8`; System design to full gives +4; Software testing +3; Open source (nice) +5; GCP +3.
- Cap in action (Karthik x Google SWE, illustrative): must 0.46, nice 0.80, level_fit 0.81 gives raw 59.8, but must < 0.5 caps it at **49**, with `cap_reason: "4 must-have skills missing"`.

```jsonc
"score_breakdown": { "must_coverage": 0.713, "nice_coverage": 0.485, "level_fit": 0.943,
  "raw_score": 71.3, "cap": 90, "cap_reason": "1 must-have skill missing (Kubernetes)",
  "weights": { "must": 0.6, "nice": 0.2, "level": 0.2 } }
```

### 3.8 Gap list (`missing_skills`)

- **Order:** `requirement` (must first), then `impact_points` desc, then section order (requirements, skills, responsibilities, other), then JD order. `priority` is the 1-based rank.
- **why_it_matters** (template, no LLM): `"Must-have under 'What We're Looking For': \"hands-on experience with Kubernetes\". Closing it adds about 8 points."`
- **closest_candidate_skill:** first by taxonomy relation (`related`, sibling, parent), else the highest-cosine candidate term in the same category with cosine >= 0.60, else null. Shown as "You have Docker; Kubernetes is the next step."
- **learn_next:** the entry's `learn_hint` if present, then `skill_set_topics` for the category at levels `candidate_level+1 .. required_level` (at most 2 levels), joined into one string.
- **effort:** `quick_win` when `gap_type = partial` with category shortfall <= 1, or when a closest skill exists via a taxonomy relation and the category shortfall <= 1; otherwise `big_gap`. The UI groups the list into "Quick wins" and "Big gaps"; partial items with `impact_points < 2` fold into a "minor" row.

---

## 4. Features by phase

| Phase | Feature | Acceptance criteria |
|---|---|---|
| **P0** (27 Oct, first 2 h) | `SkillMatchResult`, `MatchedSkill`, `MissingSkill`, `SkillMatchRequest`, `SkillMatchBatchRequest` in `contract.py` | `python -m talent_match.contract --export` emits them; TS types generate |
| | Stub `POST /skill-match` and `/skill-match/batch` returning `tests/golden/skill_match/ananya__google_swe.json` | `curl` returns a body that validates against the schema |
| | Migration for `skill_taxonomy` + `skill_matches`; backend route + controller + service skeleton | `POST /api/skill-match` returns the stub through the backend and writes a row |
| | `features/skillMatch` skeleton rendering the stub | page shows score, gap list, matched list from the stub |
| **P1** (27 Oct) | Normalizer, taxonomy (~250 entries), stages 1-4 + 7, scoring `sm-1.0`, gap list with `why_it_matters`, `closest_candidate_skill`, `learn_next`, `impact_points` | runs on >= 2 JDs x >= 2 candidates from real extractions; Ananya x Google SWE end to end in the wizard step 5; scores differ by >= 15 points between Ananya and Priya on Google SWE |
| | Backend caching by `(profile_id, profile_version, job_posting_id, matching_version)` | second call returns in < 100 ms with no agent call |
| | UI: gap list above the fold, score card with breakdown and cap reason, matched list with method badges | a judge can read why each skill is missing without opening a drawer |
| **P2** (28 Oct morning) | Stage 5 semantic (Gemini, cached, snapshot) and stage 6 LLM adjudication (batched, cached verdicts) | <= 1 LLM call per match; ablation shows F1 gain over P1; demo works with Wi-Fi off from snapshots |
| | `/skill-match/batch` + `GET /api/skill-match/matrix`, all 24 cells pre-computed by a script | grid loads in < 300 ms from `skill_matches`; brief's stated fits visible |
| | Two-column link view (colored by method, hover shows similarity, credit, both evidences, LLM reason) | every line has a tooltip; unmatched JD skills are visibly red |
| | "Best JD for this candidate" ranking and "best candidate for this JD" | sorted by score, tie-break must_coverage |
| | Labelled pair set, threshold tuning, ablation table, ordering tests, property tests | `pytest -m eval` prints the table; all ordering tests pass |
| | "How this was computed" drawer (`meta`: versions, stage counts, LLM calls, latency, warnings) | visible on every result |
| **P3** (28 Oct afternoon or slide) | pgvector HNSW on `skill_taxonomy.embedding`; `resolve()` falls back to ANN over the taxonomy for unknown skills | unknown skill "Postgres DB admin" resolves to `postgresql` |
| | Retrieve-then-rerank story: candidate vector = weighted mean of skill vectors, ANN top-50 postings, full cascade on those | benchmark script prints p50/p95 for 1k synthetic postings |
| | Matrix as a job (`202 {job_id}` + polling) using the contract's jobs pattern | same response shape after the job finishes |
| | `skill_pair_verdicts` table so the verdict cache is shared across agent replicas | second agent replica gets cache hits |

---

## 5. Files to create or change, per service

### agent (`agent/src/talent_match/`)

| File | Signatures | Purpose |
|---|---|---|
| `contract.py` (shared, add models) | `class MatchedSkill`, `class MissingSkill`, `class SkillMatchResult`, `class SkillMatchRequest(jd: ExtractedSkillList, profile: CandidateProfile \| None, resume: ResumeExtraction \| None, topics: dict[CategoryCode, dict[int, str]], options: MatchOptions)`, `class SkillMatchBatchRequest(jds: list[ExtractedSkillList], candidates: list[CandidateInput], topics, options)` | contract models; validator requires exactly one of `profile` / `resume` |
| `api.py` (shared, add 2 handlers) | `@app.post("/skill-match") def skill_match(req: SkillMatchRequest) -> SkillMatchResult`; `@app.post("/skill-match/batch") def skill_match_batch(req: SkillMatchBatchRequest) -> SkillMatchBatchResult` | thin handlers calling `skill_match.service` |
| `taxonomy.py` | `resolve(name: str, category_hint: str \| None = None) -> str \| None`; `get(cid) -> TaxonomyEntry \| None`; `ancestors(cid) -> frozenset[str]`; `implies_closure(cid) -> frozenset[str]`; `relation(cand_cid, jd_cid) -> Relation \| None`; `is_distinct(a, b) -> bool`; CLI `suggest`, `export` | canonical skills, aliases, graph |
| `skill_match/__init__.py` | `from .service import match, match_batch` | public API |
| `skill_match/params.py` | `MATCHING_VERSION = "sm-1.0"`, `THRESHOLDS`, `CREDITS`, `WEIGHTS`, `SECTION_FACTOR`, `MAX_LLM_PAIRS = 40` | every tunable in one frozen place |
| `skill_match/normalize.py` | `normalize(text: str) -> str`; `split_compound(text: str) -> list[str]`; `is_short(norm: str) -> bool` | surface-form cleanup |
| `skill_match/terms.py` | `build_jd_terms(jd: ExtractedSkillList) -> list[JdTerm]`; `build_candidate_terms(profile=None, resume=None) -> list[CandTerm]`; `detect_alt_groups(skills) -> dict[str, str]` | dedupe, alt groups, evidence factors |
| `skill_match/cascade.py` | `run_cascade(jd_terms, cand_terms, levels, embedder, adjudicator) -> list[Decision]`; `stage_exact`, `stage_alias`, `stage_implied`, `stage_fuzzy`, `stage_semantic`, `stage_category` | the 7-stage matcher, records method/similarity/credit |
| `skill_match/embeddings.py` | `class Embedder(Protocol): def embed(self, texts: list[str]) -> np.ndarray`; `GeminiEmbedder`, `SnapshotEmbedder`, `CachedEmbedder(inner, cache_path)`; `cosine_matrix(a, b) -> np.ndarray` | vectors with cache and offline snapshot |
| `skill_match/adjudicate.py` | `adjudicate(pairs: list[GrayPair], budget: int) -> dict[str, Verdict]`; `PROMPT_VERSION = "sm-adj-v1"` | one batched LLM call, verdict cache |
| `skill_match/scoring.py` | `score(decisions, jd_terms, jd_levels, cand_levels) -> ScoreParts`; `counterfactual(decisions, jd_terms, j_id, ...) -> int` | pure formula of 3.6, impact points |
| `skill_match/gaps.py` | `build_missing(decisions, jd_terms, cand_terms, levels, topics, parts) -> list[MissingSkill]` | ranked gap list, quick wins vs big gaps |
| `skill_match/service.py` | `match(req: SkillMatchRequest) -> SkillMatchResult`; `match_batch(req: SkillMatchBatchRequest) -> SkillMatchBatchResult` | orchestration; batch embeds all unique strings once and adjudicates deduped gray pairs |
| `skill_match/eval.py` | `python -m talent_match.skill_match.eval [--ablation] [--tune]` | metrics, ablation table (markdown + CSV for the slide) |
| `agent/tests/skill_match/` | `test_normalize.py`, `test_taxonomy.py`, `test_cascade.py`, `test_scoring.py`, `test_properties.py`, `test_ordering.py` (`@pytest.mark.eval`) | see section 8 |
| `agent/tests/golden/` | `skill_pairs.csv`, `skill_match_expectations.json`, `skill_match/ananya__google_swe.json` | labelled data and stubs |
| `agent/data/snapshots/` | `skill_embeddings.json`, `skill_pair_verdicts.json`, `skill_taxonomy.json` | offline demo |
| `agent/pyproject.toml` | add `rapidfuzz>=3.9`, `numpy`; extra `local-embed = ["sentence-transformers"]`; dev `hypothesis` | dependencies |

### backend (`backend/src/`)

| File | Signatures | Purpose |
|---|---|---|
| `routes/skillMatch.routes.ts` | `router.post('/', runSkillMatch)`; `router.get('/matrix', getSkillMatchMatrix)` | mounted in `routes/index.ts` as `/skill-match` |
| `controllers/skillMatch.controller.ts` | `runSkillMatch(req, res)`, `getSkillMatchMatrix(req, res)` | zod-parse body/query, throw `HttpError(400/404)`, `res.json(...)` |
| `services/skillMatch.service.ts` | `runSkillMatch(i: {profileId: string; jdId: string; refresh?: boolean}): Promise<SkillMatchResult>`; `getSkillMatchMatrix(q: {profileIds?: string[]; jdIds?: string[]; refresh?: boolean}): Promise<SkillMatchMatrix>`; `loadMatchInputs(profileId, jdId)`; `findCachedMatch(key)`; `saveMatch(row)` | loads profile + JD extraction + topics, calls `callAgent('skill-match', body)`, stores the row |
| `services/topics.service.ts` (reuse Role 4's if it exists) | `getTopicsByCategory(): Promise<Record<CategoryCode, Record<number, string>>>` | `skill_set_topics` with the `skillTopics.ts` fallback for SQL |
| `supabase/migrations/20261027_05_skill_match.sql` | DDL in section 6 | sorts after the Role 1 and Role 3 migrations (FKs) |
| `scripts/sync-taxonomy.ts` | `npx tsx scripts/sync-taxonomy.ts` | upserts `agent/data/snapshots/skill_taxonomy.json` into `skill_taxonomy` |
| `scripts/precompute-skill-matrix.ts` | `npx tsx scripts/precompute-skill-matrix.ts` | warms all 24 cells before the demo |
| `src/services/__tests__/skillMatch.service.test.ts` | vitest | cache hit, 404s, agent 502 mapping |

### frontend (`frontend/src/features/skillMatch/`, 4 layers per `frontend-arch-init`)

| File | Signatures | Purpose |
|---|---|---|
| `service/skillMatch.api.ts` | `runSkillMatchAPI(body: {profile_id: string; jd_id: string; refresh?: boolean}): Promise<SkillMatchResult>`; `getSkillMatchMatrixAPI(params?: {profile_ids?: string; jd_ids?: string}): Promise<SkillMatchMatrix>` | pure Axios via `apiClient`, returns `.data` |
| `slice/skillMatch.slice.ts` | `setMatchResult`, `setMatchLoading`, `setMatchError`, `setMatrix`, `setMatrixLoading`, `setHoveredJdSkill`, `setMethodFilter` | sync reducers only |
| `Hooks/skillMatch.hooks.ts` | `useSkillMatch(profileId?: string, jdId?: string)`; `useSkillMatchMatrix()`; `useGapGroups(result)`; `useMatchLinks(result, containerRef)` | fetch + dispatch, grouping, line geometry (ResizeObserver) |
| `components/SkillMatchPage.tsx` | | profile + JD pickers, composes the rest; also used as wizard step 5 |
| `components/GapList.tsx` | | Quick wins / Big gaps / Minor, impact chip "+8", closest skill, learn next |
| `components/MatchScoreCard.tsx` | | score, band, three breakdown bars, cap reason |
| `components/MatchLinksView.tsx` | | two columns with SVG links by method, tooltips; stacked list under 640 px |
| `components/MethodLegend.tsx`, `components/HowComputedDrawer.tsx` | | legend and `meta` drawer (shadcn `Sheet`) |
| `components/MatchMatrix.tsx`, `components/BestJdRanking.tsx` | | 4 x 6 heatmap (click a cell to open it), per-candidate ranking |
| `src/routes/skill-match.tsx`, `src/routes/skill-match.matrix.tsx` | thin TanStack file routes | standalone pages; `flow` step 5 imports `SkillMatchPage` |
| `src/store.ts` (shared) | add `skillMatch: skillMatchReducer` | |

```ts
interface SkillMatchState {
  byKey: Record<string, SkillMatchResult>;         // key `${profileId}:${jdId}`
  loadingKey: string | null;
  error: string | null;
  matrix: SkillMatchMatrix | null;
  matrixLoading: boolean;
  ui: { hoveredJdSkill: string | null; methodFilter: MatchMethod[] };
}
```

Link colors (tokens in `styles/tokens.scss`, both themes): exact/alias solid success, implied dotted amber, fuzzy solid teal, semantic dashed blue, llm dashed violet, category dotted neutral; unmatched JD rows get a danger badge.

---

## 6. API and database details

### `POST /api/skill-match`

```jsonc
// request
{ "profile_id": "7c1e...", "jd_id": "b2f4...", "refresh": false }
// 200 response: SkillMatchResult (abridged)
{
  "jd_source_file": "google_swe.pdf", "match_score": 71, "jd_id": "b2f4...", "profile_id": "7c1e...",
  "matched_skills": [
    { "jd_skill": "Distributed systems", "candidate_skill": "Kafka event pipeline", "category_code": "SYSD",
      "method": "llm", "similarity": 0.82, "requirement": "must",
      "evidence": "Built a Kafka pipeline processing 50k events/min",
      "credit": 0.9, "jd_evidence": "design and build large-scale distributed systems",
      "reason": "Event streaming at scale is a core distributed-systems skill" }
  ],
  "missing_skills": [
    { "skill_name": "Kubernetes", "category_code": "CLOUD", "requirement": "must",
      "why_it_matters": "Must-have under 'What We're Looking For': \"hands-on experience with Kubernetes\". Closing it adds about 8 points.",
      "closest_candidate_skill": "Docker",
      "learn_next": "Pods, Deployments, Services; deploy your Docker app on minikube. Next: Helm charts, CI/CD to a cluster",
      "gap_type": "missing", "effort": "quick_win", "impact_points": 8, "priority": 1 }
  ],
  "category_coverage": { "COD": 1.0, "SYSD": 0.72, "CLOUD": 0.13, "SWE": 0.78 },
  "score_breakdown": { "must_coverage": 0.713, "nice_coverage": 0.485, "level_fit": 0.943, "raw_score": 71.3,
                       "cap": 90, "cap_reason": "1 must-have skill missing (Kubernetes)" },
  "matching_version": "sm-1.0",
  "meta": { "taxonomy_version": "tx-1.0", "stage_counts": { "exact": 3, "alias": 1, "llm": 2, "category": 3 },
            "llm_calls": 1, "llm_pairs": 5, "latency_ms": 2140, "cached": false, "warnings": [] }
}
```

`category_coverage[k]` = weighted mean credit of the JD terms in category k. Errors: `400 {error}` on a bad body, `404` when the profile or posting is missing, `502` when the agent fails (existing `callAgent` mapping).

Backend flow: load `candidate_profiles` (profile + version), `job_postings` -> `extractions.result`, topics; look up the newest `skill_matches` row with the same `(profile_id, profile_version, job_posting_id, matching_version)` unless `refresh`; otherwise call the agent, insert, return.

### `GET /api/skill-match/matrix?profile_ids=a,b&jd_ids=x,y&refresh=false`

Defaults to all saved profiles x all job postings. Cells that are cached come from `skill_matches`; missing cells go to the agent in one `POST /skill-match/batch` call and are inserted.

```jsonc
{ "matching_version": "sm-1.0",
  "profiles": [ { "id": "7c1e...", "name": "Ananya Rao" } ],
  "jds": [ { "id": "b2f4...", "company": "Google LLC", "role": "Software Engineer", "source_file": "google_swe.pdf" } ],
  "cells": [ { "profile_id": "7c1e...", "jd_id": "b2f4...", "match_score": 71, "band": "good",
               "must_coverage": 0.713, "top_missing": ["Kubernetes", "System design"], "skill_match_id": "..." } ],
  "best_jd_by_profile": { "7c1e...": "b2f4..." } }
```

```sql
-- latest cell per (profile, posting) for the current version
select distinct on (profile_id, job_posting_id) id, profile_id, job_posting_id, match_score, result
from public.skill_matches
where matching_version = $1
order by profile_id, job_posting_id, created_at desc;
```

### DDL: `backend/supabase/migrations/20261027_05_skill_match.sql` (contract columns only)

```sql
create extension if not exists vector with schema extensions;

create table if not exists public.skill_taxonomy (
  canonical_id  text primary key,
  display_name  text not null,
  category_code text not null check (category_code in
    ('COD','DSA','APTI','COMM','OOD','AI','SQL','SYSD','CLOUD','SWE','NETW','OS','OTHER')),
  aliases       text[] not null default '{}',
  embedding     extensions.vector(768)            -- filled in P3
);
create index if not exists skill_taxonomy_aliases_gin on public.skill_taxonomy using gin (aliases);
alter table public.skill_taxonomy enable row level security;

create table if not exists public.skill_matches (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.candidate_profiles(id) on delete cascade,
  profile_version  int  not null,
  job_posting_id   uuid not null references public.job_postings(id) on delete cascade,
  result           jsonb not null,
  match_score      int  not null check (match_score between 0 and 100),
  matching_version text not null,
  created_at       timestamptz not null default now()
);
create index if not exists skill_matches_profile_posting_idx
  on public.skill_matches (profile_id, job_posting_id, created_at desc);
create index if not exists skill_matches_posting_idx on public.skill_matches (job_posting_id);
alter table public.skill_matches enable row level security;   -- no anon policies, service role only
```

P3 index (separate migration, after `embedding` is filled): `create index skill_taxonomy_embedding_hnsw on public.skill_taxonomy using hnsw (embedding extensions.vector_cosine_ops);`. Additive columns are proposed in section 12.

---

## 7. Scalability and reliability

| Concern | Design |
|---|---|
| Cost per match | Stages 1-4 and 7: pure CPU, about 1 ms for 25 JD x 40 candidate terms (`rapidfuzz.process.cdist`, numpy matmul for cosines). Embeddings: one batched call for strings not yet cached; after warm-up, zero. LLM: at most one call, at most 40 pairs (about 3k tokens in, 1.5k out), usually 3-8 pairs; under a tenth of a cent at flash-tier prices, and 0 on cache hits |
| LLM bound | `MAX_LLM_PAIRS = 40` per request, must-haves first; overflow pairs are treated as unmatched with a warning (conservative, never inflates a score); 20 s timeout, then provider fallback, then skip stage 6 with a warning |
| Matrix | `/skill-match/batch` embeds the union of all strings once, dedupes gray pairs across all 24 cells (most pairs repeat across candidates) and adjudicates them in `ceil(n / 40)` calls; expected 1-2 calls for the whole grid |
| Determinism | thresholds and weights frozen in `params.py`, `temperature=0`, verdict cache pinned per `prompt_version`, `matching_version` + `taxonomy_version` stored with every row, so old results stay explainable |
| Offline demo | `skill_embeddings.json`, `skill_pair_verdicts.json` and the 24 precomputed rows mean the grid and all cells work with no network |
| Graceful degradation | every stage is optional; a missing embedder or LLM lowers recall, never breaks the response; `meta.warnings` lists what was skipped |
| Statelessness | agent caches are local and disposable; P3 moves verdicts to `skill_pair_verdicts` (backend writes) so replicas share them |
| 10k postings (P3 story) | candidate vector = weight-averaged skill vectors; pgvector HNSW ANN top-50 postings in a few ms; full cascade only on those 50 (retrieve, then rerank); unknown skills resolved by ANN over `skill_taxonomy` |
| Long matrix | P3 uses the contract's jobs pattern (`202 {job_id}`, poll `GET /api/jobs/:id`), same final shape |

---

## 8. Testing and evaluation

**Unit tests (`pytest`)**
- `test_normalize.py`: `"Python 3.11" -> "python"`, `"C++"` kept, `"HTML/CSS"` split, `"Experience with Node.js"` -> `"node.js"`.
- `test_taxonomy.py`: no cycles in `parents`/`implies`; every alias maps to one id; every sample skill name resolves; `is_distinct("java", "javascript")`.
- `test_cascade.py`: k8s/Kubernetes is `alias`; PostgreSQL for "relational databases" is `implied` 0.9; Java vs JavaScript never matches; "Python" vs "Python Django" goes to the gray zone, not auto-accept; alt group satisfied by any member.
- `test_scoring.py`: the worked example in 3.7 gives exactly 71 and the Karthik cap case gives 49; `impact_points` for Kubernetes is 8.
- `test_properties.py` (hypothesis): adding a candidate skill never lowers the score; turning a matched must into a miss never raises it; score is always 0-100; same input twice gives byte-identical output with LLM off.

**Labelled pair set (`agent/tests/golden/skill_pairs.csv`, about 150 rows)**

Columns: `jd_skill, jd_context, candidate_skill, candidate_context, label (equivalent|partial|unrelated), source`. Built from the real extractions: all JD x candidate skill pairs where fuzzy >= 60 or cosine >= 0.60 (the hard region), plus 30 random negatives, plus 20 curated false friends (Java/JavaScript, SQL/NoSQL, React/React Native, C/C#, Excel/Power BI, ML/MLOps). Two team members label independently; disagreements are discussed and we report the agreement rate. Positive = equivalent or partial.

**Ablation table (`python -m talent_match.skill_match.eval --ablation`, slide material)**

| Configuration | Precision | Recall | F1 | LLM calls / match | p50 latency |
|---|---|---|---|---|---|
| exact only | tbd | tbd | tbd | 0 | tbd |
| + alias | | | | 0 | |
| + implied (taxonomy graph) | | | | 0 | |
| + fuzzy | | | | 0 | |
| + semantic | | | | 0 | |
| + LLM gray zone (full cascade) | | | | tbd | |
| LLM on every pair (reference) | | | | tbd | |

The last row is the honest comparison: we expect the cascade to get close to LLM-on-everything F1 at a fraction of the calls. Also printed: stage share (what % of decisions each stage made) and held-out precision of auto-accepts.

**Ordering and contrast tests (`test_ordering.py`, `@pytest.mark.eval`, from `skill_match_expectations.json`)**
- Karthik > Ananya on Google Data Scientist and on Microsoft Data Analyst.
- Ananya > Karthik on Google SWE and on Microsoft SWE.
- Priya's best JD is one of the two Oracle FSS postings, and her Application Support Analyst score > her Google SWE score.
- Rohan is in the top 2 for at least 5 of the 6 JDs.
- For every JD, max minus min score across the 4 candidates >= 15 (the brief's "visibly different").

**On the slide:** the ablation table (as a bar chart of F1 and LLM calls per configuration), the 4 x 6 grid, and one line: "x % of pairs never reach the LLM".

---

## 9. Demo script (Role 5 slot, about 5 minutes of the 45)

1. **Wizard step 5, Ananya x Google SWE.** Point at the gap list before the score. Say: "The brief said prioritize the gap list over the number, so this is what you see first. Kubernetes is a must-have; here is the JD line that asks for it; she has Docker, so it is a quick win; closing it is worth +8 points."
2. **Score card.** 71, band good. Open the breakdown: must coverage, nice coverage, level fit, and the cap rule. "No LLM produced this number; it is a versioned formula you can audit."
3. **Toggle "Show how we matched".** Two columns with colored lines. Hover the violet line: "Distributed systems <-> Kafka event pipeline: semantic 0.82, gray zone, the LLM said equivalent, here is its reason." Hover a dotted amber line: "PyTorch implies machine learning, from our taxonomy graph."
4. **The wow moment.** Open Ananya's profile (Role 3), add "Kubernetes: deployed my Go service on minikube", save, re-run. The score moves from 71 to 79, exactly the +8 the gap list predicted, and Kubernetes moves to the matched column as `exact`.
5. **Switch candidate to Karthik.** Score drops to the 40s, cap reason "4 must-have skills missing". Then **Compare candidates**: the 4 x 6 grid. Karthik's row lights up on the two data roles, Priya's on Oracle FSS, Rohan's everywhere, which is exactly what the resumes claim. "Best JD for each candidate" sits next to it.
6. **Challenge we faced.** "String similarity said Java and JavaScript were close and that 'Python' fully matched 'Python Django'. Embeddings thought SQL and NoSQL were the same. We built a labelled set of 150 real pairs, measured every stage, added a false-friends list and a subset rule, and only send the doubtful pairs to the LLM in one batched call. Result: [F1 number] at [N] LLM calls per match instead of [M]." Show the ablation slide.

Backup: if the network is down, everything above runs from the precomputed rows and snapshots; the "wow" re-run uses stages 1-4, which need no network.

---

## 10. Dependencies, risks and mitigations

| Dependency or risk | Impact | Mitigation |
|---|---|---|
| Role 1 JD extractions late or missing `requirement` / `section` / `level_hint` | no real input | P0/P1 build on hand-written golden JSON for 2 JDs; defaults `requirement=must`, `section=other`; agent resolves `canonical_id` itself if missing |
| Role 3 profiles not saved yet | no `profile_id` | resume path (`resume` in the agent request) and seeded golden profiles; backend falls back to the resume extraction when proposal 6 lands |
| `skill_levels` absent or all 1 | level_fit and category stage meaningless | use resume `category_levels`; level_fit weight drops to 0 (moves to must) with a warning when all levels are `no evidence` |
| Free-tier LLM rate limits | slow or failed adjudication | one batched call, verdict cache, snapshot, Groq first, budget cap, stage skip |
| Embedding API quota or outage | stage 5 lost | snapshot embeddings for all sample strings; optional local MiniLM |
| Thresholds overfit on 150 pairs | inflated eval | 70/30 split, report held-out numbers only, freeze before the demo |
| Taxonomy gaps for unseen JDs | lower recall live | stages 4-6 still catch them; `suggest` CLI; P3 ANN resolve |
| JD "one of" lists counted as separate must-haves | punishes everyone unfairly | alt groups (heuristic now, `alt_group` field proposed) |
| SQL topics empty in `skill_set_topics` | empty `learn_next` for SQL | backend topic loader falls back to `src/data/skillTopics.ts` |
| Contract enum lacks `implied` / `category` | validation errors | emit `alias` / `semantic` with `relation` set until proposal 1 lands |

---

## 11. Task checklist (order and hour estimates)

**P0, 27 Oct (2 h)**
- [ ] 0.5 h Add SkillMatch models to `contract.py`, export schemas, agree enum additions with the team
- [ ] 0.5 h Golden stub `ananya__google_swe.json`; stub `/skill-match` and `/skill-match/batch` in `api.py`
- [ ] 0.5 h Migration `20261027_05_skill_match.sql`; backend route/controller/service calling the stub
- [ ] 0.5 h `features/skillMatch` 4-layer skeleton rendering the stub; register reducer and routes

**P1, 27 Oct (7 h)**
- [ ] 1.0 h `normalize.py`, `terms.py` (dedupe, alt groups, evidence factors) + tests
- [ ] 1.5 h `taxonomy.py` model, graph, ~250 seed entries with Role 1, `suggest` / `export` CLI + tests
- [ ] 1.0 h `cascade.py` stages 1-4 and 7 + tests (false friends, subset rule)
- [ ] 1.0 h `scoring.py` + worked-example test; `gaps.py` with impact points, closest skill, learn_next
- [ ] 1.0 h Backend: real inputs, topics loader, caching, error mapping, vitest
- [ ] 1.5 h UI: GapList, MatchScoreCard, matched list with method badges; wire into wizard step 5; run on 2 JDs x 2 candidates

**P2, 28 Oct morning (7 h)**
- [ ] 1.0 h `embeddings.py` (Gemini, cache, snapshot export)
- [ ] 1.0 h `adjudicate.py` (prompt, validation, repair retry, verdict cache)
- [ ] 1.0 h `match_batch`, `GET /api/skill-match/matrix`, `precompute-skill-matrix.ts`
- [ ] 1.5 h Label ~150 pairs (two people, 45 min each), `eval.py`, tuning, ablation table, ordering + property tests
- [ ] 1.5 h MatchLinksView with tooltips, MatchMatrix, BestJdRanking, HowComputedDrawer
- [ ] 0.5 h Export snapshots, test the demo with Wi-Fi off
- [ ] 0.5 h Slide content: ablation chart, grid screenshot, challenge story

**P3, 28 Oct afternoon (3 h, or slide only)**
- [ ] 1.0 h `sync-taxonomy.ts`, fill `embedding`, HNSW index, ANN fallback in `resolve()`
- [ ] 1.0 h Retrieve-then-rerank benchmark on 1k synthetic postings (p50/p95 numbers for the slide)
- [ ] 0.5 h `skill_pair_verdicts` table and backend write-through
- [ ] 0.5 h Rehearse the 5-minute segment twice

---

## 12. Proposed contract changes

All additive and optional, so the brief's shape is unchanged. Each needs a one-line OK from the owners named.

1. **`matched_skills[].method`**: add `implied` (taxonomy parent/implies/sibling relation) and `category` (concept requirement matched against `skill_levels`). Add optional `credit` (0-1), `relation` (`instance_of | implies | general_form | sibling | null`), `jd_evidence`, `reason` (LLM reason). Clarify that the existing `evidence` is the **candidate-side** evidence. (Roles 1, 3 for types; frontend.)
2. **`missing_skills[]`**: add optional `gap_type` (`missing | partial`), `effort` (`quick_win | big_gap`), `impact_points` (int), `priority` (int), `jd_evidence`, `section`, `candidate_level`, `required_level`.
3. **`SkillMatchResult`**: add optional `meta` (same idea as `ExtractedSkillList.meta`: `taxonomy_version`, `prompt_version`, `stage_counts`, `llm_calls`, `llm_pairs`, `latency_ms`, `cached`, `warnings`), `match_band` (`strong | good | weak`) and `profile_version`. Fix the `score_breakdown` keys to `must_coverage, nice_coverage, level_fit, raw_score, cap, cap_reason, weights`.
4. **`Skill` (JD only)**: add optional `alt_group` (string). Skills sharing a value are alternatives ("one or more of Java, C++, Python, Go"). (Role 1.)
5. **`jd_id`** in `POST /api/skill-match` and `SkillMatchResult` is `job_postings.id`. (Role 1, wording only.)
6. **"Profile or resume" input**: `POST /api/skill-match` accepts `{resume_extraction_id, jd_id}` as an alternative to `profile_id`, plus optional `refresh`. Then `skill_matches.profile_id` and `profile_version` become nullable, with a new `resume_extraction_id uuid null references extractions(id)` and `check (profile_id is not null or resume_extraction_id is not null)`.
7. **`GET /api/skill-match/matrix`** query params `profile_ids`, `jd_ids`, `refresh` and the response shape in section 6.
8. **`skill_taxonomy`** additive columns: `kind text`, `parents text[]`, `implies text[]`, `related text[]`, `distinct_from text[]`, `maps_to_categories text[]`, `learn_hint text`, `taxonomy_version text`, `updated_at timestamptz`; HNSW index in P3.
9. **`skill_matches`** additive columns: `input_sha256 text` (hash of the canonical request JSON + versions, a stricter cache key) and `taxonomy_version text`; index on `input_sha256`.
10. **P3 table `skill_pair_verdicts`**: `jd_norm text, cand_norm text, prompt_version text, verdict text, reason text, model text, created_at timestamptz, primary key (jd_norm, cand_norm, prompt_version)`; owner Role 5, backend is the writer.
11. **`.env.example`** names: `MATCH_PROVIDERS`, `EMBED_MODEL`, `SKILL_MATCH_USE_LLM`, `SKILL_MATCH_USE_EMBEDDINGS`.

```sql
-- proposals 6, 8, 9 as one follow-up migration (only after the team agrees)
alter table public.skill_matches
  alter column profile_id drop not null,
  alter column profile_version drop not null,
  add column if not exists resume_extraction_id uuid references public.extractions(id),
  add column if not exists input_sha256 text,
  add column if not exists taxonomy_version text,
  add constraint skill_matches_subject_chk check (profile_id is not null or resume_extraction_id is not null);
create index if not exists skill_matches_input_idx on public.skill_matches (input_sha256);
alter table public.skill_taxonomy
  add column if not exists kind text, add column if not exists parents text[] default '{}',
  add column if not exists implies text[] default '{}', add column if not exists related text[] default '{}',
  add column if not exists distinct_from text[] default '{}', add column if not exists maps_to_categories text[] default '{}',
  add column if not exists learn_hint text, add column if not exists taxonomy_version text,
  add column if not exists updated_at timestamptz default now();
```
