# Role 1: JD Analytics, implementation plan

_Owner: Sahil Sharma (Role 1) <sahilsharma3043@gmail.com>. Written 2026-10-27 against [00-shared-contract.md](../00-shared-contract.md) (locked). Deadline Wed 28 Oct 2026. Any change this plan needs in the contract is listed in section 12, not applied silently._

---

## 1. Mission and what "stand out" means for this role

Mission: given any JD as PDF or DOCX, return an `ExtractedSkillList` (`source_type = "jd"`) that names every skill the role really requires. Each skill is mapped onto the 12 RADIX categories, has a must/nice tag and an implied level, and quotes the line it came from.

What makes this stand out to industry judges and investors:

- **Every skill can be checked.** Every skill quotes a sentence that the pipeline has verified exists in the JD, and the UI highlights that sentence beside the skill. If a skill has no verified evidence, we drop it. "Zero unverifiable skills" is a claim we can demonstrate live.
- **We measure quality.** A hand-labelled golden set for all 6 JDs gives precision, recall and F1 per category. We score the LLM pipeline against a keyword-only baseline, which puts a number on the brief's claim that "keyword matching alone will miss a lot".
- **We go beyond a skill list to a requirement profile.** `category_levels` turns wording such as "strong", "hands-on" or "3+ years" into a 1-10 level per category on the same rubric as the company bar. We can then say "this Google SWE posting asks for more SYSD than Google's general bar".
- **It keeps working when the free tier fails.** Results are cached by sha256 plus prompt version, providers fall back from one to the next, the model gets one repair retry, and if every LLM fails we drop to a keyword mode with a visible "degraded" banner. The demo never shows a spinner forever.
- **Other roles reuse our pieces.** `documents.py`, `llm.py`, the upload route and the taxonomy seed are used by Roles 2 and 5. That is the "one platform, five features" story on the architecture slide.

## 2. Inputs, outputs and hand-offs

| Item | Definition | Contract ref |
|---|---|---|
| Input | JD file (PDF or DOCX, 10 MB max), uploaded via `POST /api/documents` with `kind=jd` | §4 API surface |
| Extraction call | `POST /api/jds/extract {document_id, company_id?, role?}` | §4 |
| Output | `ExtractedSkillList` with `source_type=jd`, `company`, `role`, `skills[Skill]`, `document_id`, `company_id`, `category_levels`, `meta` | §3.1, §3.2 |
| Persistence | `documents`, `extractions`, `job_postings` (owned by me), plus the `skill_taxonomy` seed (table owned by Role 5) | §5 |
| Shared code | `agent/src/talent_match/documents.py`, `agent/src/talent_match/llm.py` | §1 repo layout |

**Who consumes what**

| Consumer | Uses | Needs from me |
|---|---|---|
| Role 2 Resume Parsing | `documents.py`, `llm.py`, `POST /api/documents`, `extractions` table | stable function signatures by end of P0; `kind=resume` support in section detection (Role 2 supplies the resume heading map) |
| Role 5 Skill Matching | `ExtractedSkillList.skills` (canonical_id, requirement, category_code, level_hint), `job_postings.id` as `jd_id` | canonical ids drawn from the same taxonomy; the `jd_id` returned with every extraction (see §12-2) |
| Role 4 Talent Check | nothing directly; my P2 chart reads Role 4's `GET /api/companies/:id/skill-bar` | none |
| Flow wizard (step 1) | `JdPicker` component + `useJdLibrary()` hook | exported from `features/jd/` |

## 3. Approach and design

### 3.1 Pipeline

```
 FRONTEND  features/jd  (dropzone | library of 6)
     │ multipart file                                   │ {document_id, company_id?, role?, consensus?}
     ▼                                                  ▼
 BACKEND POST /api/documents                       BACKEND POST /api/jds/extract
   multer memory, 10 MB, magic-byte check            zod body; load documents row (404 / 409 if kind != jd)
   sha256(bytes) → hit? return {cached:true}         cache: extractions(document_id, prompt_version) → hit? return, meta.cached=true
   Storage talent-docs/jd/<sha256>.pdf               companies list (118 rows, memo 10 min) as resolution candidates
   agent POST /documents/parse  (§12-1) ─┐           agent POST /extract/jd ───────────────────────────────┐
   insert documents(text, sections, …)   │                                                                 │
                                          ▼                                                                 ▼
 AGENT  documents.py                                 AGENT jd/pipeline.py
   PyMuPDF dict blocks → column ordering             0 prepare: drop boilerplate sections, number lines,
   python-docx body order (paras + tables)             tag "[SECTION requirements|nice] …"
   strip repeated header/footer lines                1 LLM pass (llm.py): JdLlmOutput, temperature 0
   normalise (NFKC, bullets, hyphenation)              provider A ──┐ P2: provider B in parallel
   page spans + heading detection → sections           repair once ─┴─ fallback chain → keyword mode
                                                     2 deterministic post-processing
                                                       a clean/split names   b evidence gate (fuzzy verify)
                                                       c taxonomy normalise  d category validation
                                                       e must/nice resolve   f dedupe + merge
                                                       g consensus merge     h confidence rules
                                                       i level_hint + category_levels
                                                       j company resolution  k keyword baseline (for UI diff)
                                                     3 validate as contract.ExtractedSkillList
 BACKEND upsert extractions + job_postings  →  response ExtractedSkillList (+ jd_id)
```

### 3.2 Text extraction (`documents.py`)

- **PDF (PyMuPDF / fitz).** We use `page.get_text("dict")` rather than plain text, because it keeps block bboxes, span font size and bold flags (`flags & 16`). Multi-column detection works per page: we build a histogram of block `x0` values. If the blocks split into two clusters separated by at least 15% of page width, and each cluster holds at least 25% of the text, we read the left column top to bottom and then the right column. Otherwise we sort by `(round(y0/3), x0)`. Full-width blocks such as titles stay in vertical order.
- **DOCX (python-docx).** We iterate `document.element.body` in order so that paragraphs and tables stay interleaved. Table rows become one line each (`cell | cell`). The heading signal is a paragraph style starting with `Heading`, or bold runs over the whole paragraph. Section headers and footers are read once and dropped if they repeat.
- **Header and footer removal.** A line is dropped if it appears on at least 50% of pages within the top or bottom 8% of the page (page numbers, "Confidential", logos).
- **Normalisation, in this order:**
  1. `unicodedata.normalize("NFKC")`, which also handles ligatures.
  2. Smart quotes and dashes become ASCII.
  3. The bullet glyphs `• ▪ ● ◦ – * ` and numbered bullets at line start become `- `.
  4. De-hyphenation: `(\w)-\n(\w)` becomes `\1\2` when the joined word is lowercase.
  5. Soft line breaks inside a sentence are joined.
  6. Whitespace is collapsed and the text is trimmed.

  **Offsets always refer to the normalised text** stored in `documents.text`, so evidence spans can be used directly in the UI.
- **Output model** (internal to the agent, and returned by `/documents/parse`):

```python
class Section(BaseModel):
    kind: Literal["responsibilities","requirements","skills","projects","experience",
                  "education","certifications","other"]          # = contract Skill.section enum
    label: str                       # raw heading, e.g. "What We're Looking For"
    requirement_hint: Literal["must","nice"] | None
    start: int; end: int             # char offsets in text
    page_start: int; page_end: int
    signal: bool                     # True for responsibilities/requirements/skills

class ParsedDocument(BaseModel):
    text: str; page_count: int
    pages: list[tuple[int, int]]     # char span per page
    sections: list[Section]
    parser_version: str = "doc-1.0"
    warnings: list[str]              # e.g. "low_text_density: possibly scanned"
```

### 3.3 Section detection

A line is a heading candidate if it meets **any one** of these: bold for the whole line, font size at least 1.15 × the page's median body size, DOCX Heading style, or a line of 60 characters or fewer with no terminal period that is in Title Case, ALL CAPS, or ends with `:`. Each candidate is normalised (lowercase, punctuation stripped, curly apostrophes fixed) and matched against the JD heading map with `rapidfuzz.fuzz.ratio >= 85`. If nothing matches, the heading still opens a section, with `kind="other"`.

| Section kind | requirement_hint | JD headings matched (extensible list in `documents.py`) |
|---|---|---|
| responsibilities | must | Key Responsibilities, Responsibilities, What You'll Do, The Role, Your Impact, Day to Day |
| requirements | must | What We're Looking For, Minimum Qualifications, Basic Qualifications, Requirements, Qualifications, Who You Are, Required Skills |
| requirements | nice | Preferred Qualifications, Nice to Have, Good to Have, Bonus Points, Desired Skills, Additional Qualifications |
| skills | must | Technical Skills, Skills, Tech Stack, Tools |
| education | must | Education, Eligibility |
| other (dropped before LLM) | none | Benefits, Perks, Equal Opportunity, EEO, How to Apply, Why Join Us |
| other (kept as context) | none | About Us, About the Team, About the Role, Overview, Location |

The brief's hint is wired in at two places: signal sections are sent first in the prompt, and their skills earn a higher confidence (§3.6).

### 3.4 Pass 1: LLM structured extraction

Before the call, `jd/prepare.py` drops the boilerplate sections, numbers each line (`L014`) and adds a tag before each section, for example `[SECTION requirements | nice | "Preferred Qualifications"]`. Line numbers make evidence verification cheap and precise. The LLM output schema (`jd/schema.py`) is deliberately richer than the contract, because post-processing turns it into the contract:

```python
class LlmSkill(BaseModel):
    skill_name: str = Field(max_length=80)
    category_code: CategoryCode                 # from contract.py (12 codes + OTHER)
    evidence: str = Field(max_length=300)       # verbatim span
    line: int | None = None                     # L-number the span starts on
    requirement: Literal["must", "nice"] = "must"
    strength: str | None = None                 # "strong", "3+ years", "exposure to"
    explicit: bool = True                       # False = inferred from prose

class JdLlmOutput(BaseModel):
    company: str | None; role: str | None; location: str | None
    seniority: Literal["intern","fresher","junior","mid","senior","staff"] | None
    years_min: float | None
    skills: list[LlmSkill] = Field(min_length=1, max_length=80)
```

The prompt lives in `agent/prompts/jd_extract.md`. Its front matter `version:` field is the `prompt_version`, which starts at `jd-v1` (the contract's `jd-v3` is only an illustrative value). Prompt skeleton:

```markdown
---
version: jd-v1
task: jd_extract
---
## system
You are a precise hiring-requirements analyst for RADIX. You read ONE job description and list
every skill, technology and capability the role requires. You never invent skills.

CATEGORIES (exactly one code per skill)
COD   Coding: programming languages, writing production code (Python, Java, C++, Go)
DSA   Data Structures and Algorithms: complexity, trees, graphs, "efficient algorithms"
APTI  Aptitude and Problem Solving: analytical thinking, statistics, probability, root-cause analysis
COMM  Communication Skills: stakeholders, documentation, presenting, cross-team collaboration
OOD   Object-Oriented Programming and Design: OOP, design patterns, SOLID, modular design
AI    AI Native Engineering: ML, deep learning, LLMs, GenAI tooling, ML frameworks
SQL   SQL and Design: SQL, relational databases, data modelling, query tuning
SYSD  System Design and Architecture: distributed systems, scalability, microservices, APIs at scale
CLOUD DevOps and Cloud: AWS/GCP/Azure, Docker, Kubernetes, CI/CD, monitoring
SWE   Software Engineering: SDLC, testing, code review, Git, agile, debugging practice
NETW  Computer Networking: TCP/IP, HTTP, DNS, load balancing, network troubleshooting
OS    Operating System: Linux/Unix, processes, memory, concurrency, shell scripting
OTHER anything else: domain (banking, financial services), BI tools, spoken languages

RULES
1. One skill per item. "Java, C++ or Go" -> three items.
2. Include named technologies AND capabilities written in prose:
   "build systems that serve millions of users" -> "Large-scale distributed systems", SYSD, explicit=false.
3. evidence = the shortest EXACT span (<= 25 words) copied from the JD. Never paraphrase. Give its line number.
4. requirement = "nice" if the line or its [SECTION] says preferred / nice to have / a plus / bonus / ideally; else "must".
5. strength = the exact depth wording ("strong", "hands-on", "3+ years", "exposure to") or null.
6. Ignore benefits, equal-opportunity text, company marketing and application steps.
7. Coverage check: consider each of the 12 categories in turn. If the JD needs it, include >= 1 skill for it.
   Never force a category the JD does not need.
8. Also return company, role, location, seniority and years_min if stated.
Return ONLY JSON matching: {format_instructions}

## example  (synthetic JD, NOT one of the 6 evaluation JDs, to keep the eval honest)
{few_shot_input}  ->  {few_shot_output}

## user
Source file: {source_file} | Company hint: {company_hint} | Role hint: {role_hint}
{numbered_tagged_jd}
```

`llm.py` runs the chain (§3.9). It uses `with_structured_output(JdLlmOutput, method="json_schema")` on providers that support it (Groq, Gemini). On the free OpenRouter models it uses JSON mode via `parsing.extract_json` plus Pydantic validation. Both paths return the same `LlmResult`.

### 3.5 Pass 2: deterministic post-processing (`jd/postprocess.py`)

Rules run in this order. Each rule appends to a `trace` list that the provenance drawer shows.

| # | Rule | Detail |
|---|---|---|
| a | Clean and split | Strip versions and trailing punctuation. Split leftovers like "Java/C++" on `/`, `,` and ` or ` when every part resolves in the taxonomy. |
| b | **Evidence gate** | Normalise evidence and JD text (casefold, collapse whitespace, strip punctuation). (1) Exact substring, searched first on `line` ±1, then the whole text: **verified_exact**. (2) `rapidfuzz.fuzz.partial_ratio_alignment(evidence, text) >= 90`: **verified_fuzzy**, and the evidence is replaced with the real JD substring. (3) Score 75-89: kept with confidence lowered one step and the warning `weak_evidence`. (4) Below 75: if `skill_name` itself occurs in the text, the evidence becomes the sentence containing it (`rebuilt`, confidence medium at most). Otherwise the skill is **dropped** into `meta.dropped` with reason `unverified_evidence`. The surviving evidence is trimmed to 200 chars or fewer around the span, and the span becomes `evidence_span {start, end, page}` (§12-3). |
| c | Taxonomy normalisation | `taxonomy.resolve(name)` tries exact, then alias, then fuzzy (`token_set_ratio >= 92`) and returns a `canonical_id`. An unknown skill gets `canonical_id = slugify(name)` plus the warning `new_skill:<slug>`, which feeds taxonomy growth. |
| d | Category validation | If the taxonomy has a category for the skill, the taxonomy wins over the LLM, and any disagreement is logged as `category_override`. If the category is not one of the 13 codes, it becomes OTHER. |
| e | must/nice | The first match wins: (1) a cue in the evidence sentence: `preferred, nice to have, a plus, bonus, ideally, good to have` gives nice, and `must, required, minimum, mandatory` gives must; (2) the section's `requirement_hint`; (3) the LLM's value; (4) otherwise must. |
| f | Dedupe and merge | Group by `canonical_id`. Within a group, keep must over nice, the highest confidence, the highest level_hint, and the evidence from a signal section (shortest verified span). Unknown slugs in the same category are merged when `token_set_ratio >= 92`. |
| g | Consensus (P2) | See §3.8. |
| h | Confidence | See §3.6. |
| i | Levels | See §3.7. |
| j | Section label | The section is the one containing `evidence_span.start`, mapped to the contract's `Skill.section` enum. |

### 3.6 Confidence rules (the contract rule, adapted to JDs)

The contract's rule is high = explicit with evidence of use, medium = explicit without it, low = inferred. For a JD, "evidence of use" becomes "explicitly demanded in a signal section":

| Confidence | JD condition |
|---|---|
| high | `explicit=true`, evidence verified_exact or verified_fuzzy, and the span lies in a signal section (responsibilities, requirements, skills) |
| medium | explicit, but only in a non-signal section, or the evidence is `rebuilt`, or one step down from high because of `weak_evidence` |
| low | `explicit=false` (inferred from prose, e.g. "serve billions of users" gives Scalability), with verified evidence |
| dropped | no verifiable evidence (the contract's anti-hallucination gate) |

Consensus adjustment (P2): if both models found the skill, it moves up one step, but an inferred skill never goes above medium. If only one model found it, it keeps its confidence when the evidence is verified_exact and drops one step otherwise.

### 3.7 Level inference (`jd/level_inference.py`, JD column of the shared rubric)

1. **Seniority detection** is deterministic first and falls back to the LLM. A regex over the title and the first 600 characters maps `intern`; `associate | graduate | fresher | entry | 0-[12] years` to fresher; `senior | sr.` to senior; `staff | principal | lead architect` to staff. If none match we use the LLM's `seniority`, and then `mid`.
2. **Phrase rules** are applied to the full sentence that contains the evidence span (not just the quote). The strongest match wins:

| Band | Level (default / with intensifier) | Phrases (case-insensitive regex) |
|---|---|---|
| CU | 2 / 2 | exposure to, awareness of, familiar(ity) with, basic understanding, nice to have, introductory |
| AP | 3 / 4 | working knowledge, knowledge of, able to write, experience with (no years), coursework, academic projects |
| AS | 5 / 6 | strong, hands-on, solid (understanding\|grasp), proficien(t\|cy), good command, debug, optimi[sz]e |
| EV | 7 / 8 | design(ing)?, own(ership)?, lead, drive, mentor, review, deep (expertise\|knowledge), expert |
| CR | 9 / 10 | architect, define (standards\|direction), set technical direction, principal, invent |

   Intensifiers (`excellent, deep, extensive, advanced, expert`) select the upper value in the band.
3. **Years rule:** `(\d+)\s*\+?\s*(?:-|to)?\s*(\d+)?\s*years?` in the same sentence. 0-1 gives 4, 1-3 gives 6, 3-5 gives 7, 5+ gives 8. `level_hint = max(phrase_level, years_level)`. If neither matches, the default comes from seniority: intern 3, fresher 4, junior 5, mid 6, senior 7, staff 8.
4. **nice** skills: `level_hint - 1`, with a floor of 2.
5. **Category level:** the max of the must hints in the category. If the category has only nice skills, it takes the max nice hint. If it has at least 3 must skills in a signal section, it gets +1. The result is then clamped to the seniority band (intern [2,5], fresher [3,6], junior [3,7], mid [4,8], senior [5,9], staff [6,10]). Categories without skills are **omitted**, matching the contract's partial-dict example. Each fired rule is written to `meta.level_basis[code]`, for example `"strong (AS) + 3+ years -> 7; clamp senior"`.

### 3.8 Multi-LLM consensus (P2, the RADIX Level-4 fan-out echo)

`EXTRACT_PROVIDERS` order: the primary is first and the consensus partner is the first *different provider family* after it. Both run with `asyncio.gather` and their own timeouts. Each run is post-processed through steps a-f separately, then merged by `canonical_id`:

- `agreement = |A ∩ B| / |A ∪ B|` (Jaccard on canonical ids), plus per-category agreement.
- For each skill, `meta.consensus.per_skill[canonical_id] = ["openrouter", "groq"]`.
- If the partner fails or times out, the single-run result is returned with `meta.consensus.status = "partial"`. Consensus never blocks a result.
- Consensus is off by default for uploads. It is on for the 6 pre-loaded samples (computed once, then cached) and when the request sets `consensus: true`. This protects the free-tier rate limit.

### 3.9 `llm.py` (shared with Roles 2 and 5)

```python
@dataclass
class PromptSpec: name: str; version: str; system: str; user: str; example: str | None

@dataclass
class LlmResult(Generic[T]):
    value: T; provider: str; model: str; latency_ms: int
    attempts: list[dict]          # [{provider, error, kind: timeout|rate_limit|invalid|http}]
    raw_text: str | None

def load_prompt(name: str) -> PromptSpec                     # reads agent/prompts/<name>.md, front matter version
def get_model(provider: str, *, temperature: float = 0.0, timeout_s: int = 45) -> BaseChatModel
    # wraps openradix_agents.providers: base = PROVIDERS[provider]();
    # return base.model_copy(update={"temperature": temperature, "timeout": timeout_s, "max_retries": 0})
async def run_structured(schema: type[T], prompt: PromptSpec, variables: dict, *,
                         providers: list[str] | None = None, repair: int = 1,
                         total_budget_s: int = 120) -> LlmResult[T]
```

The algorithm for each provider in order (`EXTRACT_PROVIDERS`):

1. Acquire that provider's `RateLimiter`, an async token bucket with RPM read from env (default openrouter 18/min, groq 28/min, gemini 14/min).
2. Call the model (native structured output, or JSON mode).
3. On a `ValidationError`, make **one repair call** that sends the error text and the invalid JSON with the instruction "return corrected JSON only".
4. On 429, if `retry-after` is 5 s or less, wait and retry. Otherwise move on to the next provider.
5. On a timeout or 5xx, move on to the next provider.

If every provider fails, raise `AllProvidersFailed(attempts)`. Every call logs one line: `llm provider=groq prompt=jd-v1 ms=6100 ok=true repair=0`.

### 3.10 Company resolution (`jd/company.py`)

The backend sends `companies: [{company_id, name}]` (118 rows, memoised) to the agent. This keeps the agent stateless and DB-free, and keeps the logic in Python.

1. If the request has a `company_id`, use it.
2. Pinned aliases are checked over the normalised LLM company and the first 600 characters: `google | alphabet` gives 4, `microsoft` gives 78, and `oracle financial services | ofss | oracle fss` gives 24. "Oracle" alone only resolves to 24 when "financial services" appears anywhere in the text.
3. Strip legal suffixes (`llc, inc, corporation, corp, ltd, pvt, limited`, parenthesised text), then `rapidfuzz.process.extractOne(..., scorer=token_set_ratio)` with a score of 88 or more.
4. Otherwise `company_id = null`, with the warning `company_unresolved`. The UI then offers a company select.

### 3.11 Keyword baseline (`jd/baseline.py`)

The baseline is a word-boundary regex scan over the taxonomy's display names and aliases. It produces skills with `confidence=low`, `requirement` taken from the section hint, and no capabilities. It runs on every extraction and is cheap. Its canonical ids go into `meta.baseline_ids`, so the UI can show "what keyword matching found vs missed". It is also the **degraded-mode** extractor when all LLMs fail.

### 3.12 Taxonomy seed (for Role 5's `taxonomy.py`)

The seed file is `agent/data/taxonomy/skill_taxonomy.seed.json`, with about 80 entries in P0 and about 250 in P2. It is built from the 6 JDs, the 4 resumes and common technologies, and reviewed by hand. Entry shape (matches the table columns):

```json
{ "canonical_id": "kubernetes", "display_name": "Kubernetes", "category_code": "CLOUD",
  "aliases": ["k8s", "kubernetes engine", "gke", "aks", "eks"] }
```

The interface agreed with Role 5 is `resolve(name: str) -> TaxonomyHit | None` with `canonical_id, display_name, category_code, method: exact|alias|fuzzy, score`. Ambiguous mappings are fixed in the seed so that both roles behave the same:

| Skill | Code | Why |
|---|---|---|
| Statistics, probability, A/B testing, hypothesis testing | APTI | quantitative problem solving |
| pandas, NumPy, R | COD | programming |
| scikit-learn, TensorFlow, PyTorch, ML, NLP, LLMs | AI | AI Native Engineering |
| Data modelling, ETL, data warehousing | SQL | SQL and Design |
| Power BI, Tableau, Excel | OTHER | BI tooling, not in the 12 |
| REST APIs, microservices, scalability | SYSD | architecture |
| Unit testing, Git, code review, Agile, debugging | SWE | engineering practice |
| ITIL, incident management, production support | SWE | support practice (Oracle support role) |
| Linux, shell scripting, Unix | OS | |
| Banking domain, financial services, capital markets | OTHER | domain |

## 4. Features by phase

### P0 Contract (27 Oct, first 2 h)

| Feature | Acceptance criteria |
|---|---|
| Role 1 migration | `documents`, `extractions`, `job_postings` created with RLS on; bucket `talent-docs` exists; the migration re-runs without errors |
| `POST /api/documents` real | uploading a PDF returns `{document_id, sha256, cached:false}`; uploading it again returns `cached:true` with the same id; a .txt returns 415 |
| Agent stubs | `POST /extract/jd` returns `tests/golden/google_swe.json` (with `_eval` stripped) and validates as `contract.ExtractedSkillList`; `POST /documents/parse` returns `ParsedDocument` using plain `page.get_text()` |
| `POST /api/jds/extract` wired to the stub | Role 5 can fetch a real-shaped `ExtractedSkillList` with `jd_id` |
| `llm.py` and `documents.py` signatures frozen | Role 2 can import both; `test_llm_fallback.py` passes using LangChain fake chat models |
| Taxonomy seed v0 | about 80 entries; loads in Role 5's `taxonomy.py` or my fallback |

### P1 Done-by-brief (27 Oct)

| Feature | Acceptance criteria |
|---|---|
| Robust `documents.py` (columns, DOCX tables, normalisation, sections) | all 6 JDs in **both** PDF and DOCX parse; the "Key Responsibilities" and "What We're Looking For" sections are detected in every sample that has them; PDF and DOCX text for the same JD have token Jaccard of 0.9 or more |
| LLM pass + post-processing a-f, h | at least 2 JDs (Google SWE, Oracle FSS Associate SWE) return valid output; every skill has verified evidence; `category_code` is always valid |
| must/nice + `category_levels` | Preferred-qualification skills come out `nice`; `category_levels` is present for every category with skills; `meta.level_basis` is filled |
| Company resolution | the 6 samples resolve to 4/78/24 without hints |
| Cache | the second extract of the same doc returns in under 300 ms with `meta.cached=true` |
| `GET /api/jds`, `GET /api/jds/:id` | the library lists the pre-loaded JDs; the detail returns extraction + posting + document text |
| Frontend `features/jd` v1 | dropzone → stages → result grouped by category with must/nice badges and confidence; library of the 6; click a skill to highlight its evidence in the JD text |
| Golden for 2 JDs + eval harness | `pytest -m eval` prints P/R/F1 for 2 JDs |

### P2 Stand-out (28 Oct morning)

| Feature | Acceptance criteria |
|---|---|
| Golden for all 6 JDs + baseline comparison | eval table (baseline vs LLM vs LLM+post vs consensus), exported to `agent/outputs/eval/jd_eval.md` for the slide |
| Multi-LLM consensus | samples pre-computed with 2 providers; the UI shows an agreement percentage and a "2/2 models" marker per skill |
| Side-by-side evidence viewer | clicking a highlight in the text selects its skill and vice versa; sections are shaded, with signal sections marked |
| Category-levels chart vs company bar | recharts bar chart of JD-implied level against `GET /api/companies/:id/skill-bar`; the delta is labelled |
| "Keyword baseline" toggle | chips found only by the LLM get an "LLM-only" outline; the counter reads "keywords would have missed N skills" |
| Provenance drawer | model, prompt_version, latency, cached, attempts, warnings, dropped skills with reasons, level basis |
| Degraded mode | with all providers disabled via env, extraction still returns the keyword result with a banner |
| Taxonomy seed v1 (about 250 entries) + `backend/scripts/seed-taxonomy.ts` | the upsert is idempotent; Role 5 confirms there are no category conflicts |
| Offline snapshot | `backend/src/data/snapshots/jds/*.json`; `GET /api/jds` serves it when Supabase is unreachable |

### P3 Scale story (28 Oct afternoon, or a slide only)

| Feature | Acceptance criteria |
|---|---|
| Async jobs path | `POST /api/jds/extract?async=1` returns `202 {job_id}`; `GET /api/jobs/:id` gives the result; the UI hook polls with the same response shape |
| Batch extraction | agent `POST /extract/jd/batch` runs with bounded concurrency (one semaphore per provider); timing for 6 JDs is recorded |
| OCR fallback for scanned PDFs | low text density triggers PyMuPDF OCR (`page.get_textpage_ocr`, Tesseract) behind the flag `OCR_ENABLED` |
| Taxonomy growth loop | `new_skill:*` warnings are aggregated into a review list; embedding nearest-neighbour suggestions once Role 5's pgvector lands |
| Generalisation check | 5 to 10 extra public JDs, keyword vs LLM recall measured (labelled lightly) |

## 5. Files to create or change

### Agent (`agent/`, Python 3.11; add `pymupdf`, `python-docx`, `rapidfuzz`, `fastapi`, `uvicorn`, `pytest-asyncio` to `pyproject.toml`)

| File | Signatures | Purpose |
|---|---|---|
| `src/talent_match/documents.py` | `parse_document(data: bytes, file_name: str, kind: Literal["jd","resume"]) -> ParsedDocument`; `normalize_text(s: str) -> str`; `_pdf_blocks(doc) -> list[Block]`; `_order_columns(blocks, page_width) -> list[Block]`; `_docx_blocks(data: bytes) -> list[Block]`; `detect_sections(blocks, kind) -> list[Section]`; `HEADING_MAPS: dict[str, list[HeadingRule]]` | shared PDF/DOCX parser; Role 2 adds `HEADING_MAPS["resume"]` |
| `src/talent_match/llm.py` | see §3.9 | shared structured-output chain with fallback, repair, rate limits |
| `src/talent_match/jd/__init__.py` | `from .pipeline import extract_jd` | package |
| `src/talent_match/jd/schema.py` | `LlmSkill`, `JdLlmOutput`, `JdExtractRequest`, `CompanyCandidate` | internal LLM schema and agent request model |
| `src/talent_match/jd/prepare.py` | `build_llm_input(doc_text: str, sections: list[Section]) -> tuple[str, LineMap]` | drop boilerplate, number lines, tag sections |
| `src/talent_match/jd/postprocess.py` | `verify_evidence(s, text, line_map) -> Verified \| None`; `resolve_requirement(s, section) -> str`; `normalize(skills) -> list`; `dedupe(skills) -> list`; `assign_confidence(s) -> str` | rules a-f, h, j |
| `src/talent_match/jd/level_inference.py` | `detect_seniority(text, llm_value) -> str`; `infer_level_hint(sentence, seniority, requirement) -> tuple[int, str]`; `category_levels(skills, seniority) -> tuple[dict[str,int], dict[str,str]]` | §3.7 |
| `src/talent_match/jd/consensus.py` | `merge_runs(a: list[Skill], b: list[Skill], providers: tuple[str,str]) -> tuple[list[Skill], dict]` | §3.8 |
| `src/talent_match/jd/company.py` | `resolve_company(llm_name, text, candidates, hint_id) -> tuple[int \| None, str \| None, str]` | §3.10 |
| `src/talent_match/jd/baseline.py` | `keyword_extract(text: str, sections: list[Section]) -> list[Skill]` | baseline and degraded mode |
| `src/talent_match/jd/pipeline.py` | `async def extract_jd(req: JdExtractRequest) -> ExtractedSkillList` | orchestration and meta |
| `src/talent_match/jd/router.py` | `router = APIRouter()`; `POST /extract/jd`; `POST /documents/parse` | included in `api.py` with `app.include_router(jd_router)` |
| `src/talent_match/taxonomy.py` | (Role 5 owns it) I write a P0 fallback `resolve()` only if Role 5's is not merged by hour 2 | normalisation |
| `prompts/jd_extract.md` | front matter `version` | versioned prompt |
| `data/taxonomy/skill_taxonomy.seed.json` | | seed |
| `tests/test_documents.py`, `test_jd_postprocess.py`, `test_jd_levels.py`, `test_jd_company.py`, `test_llm_fallback.py`, `test_jd_contract.py` | | unit and contract tests |
| `tests/eval/test_jd_eval.py`, `tests/eval/metrics.py` | `@pytest.mark.eval` | golden-set eval |
| `tests/golden/{google_swe,google_data_scientist,microsoft_swe,microsoft_data_analyst,oracle_fss_associate_swe,oracle_fss_app_support_analyst}.json` | contract-valid `ExtractedSkillList` + `_eval` block | golden labels, also the P0 stubs |
| `tests/golden/llm_cache/` | `<sha256>.<prompt_version>.<provider>.json` | record/replay so `pytest -m eval` is offline and deterministic |

### Backend (`backend/`; add `multer`, `@types/multer`, `zod`)

| File | Signatures | Purpose |
|---|---|---|
| `src/middlewares/upload.ts` | `export const uploadSingle = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 }, fileFilter }).single("file")` | multer config; multer errors become HttpError 413/415 |
| `src/middlewares/validate.ts` | `validateBody(schema: ZodTypeAny): RequestHandler` | shared with Role 3 (whoever lands first owns it) |
| `src/validators/jd.schemas.ts` | `ExtractJdBody`, `UploadKind` | zod |
| `src/routes/documents.routes.ts` | `POST /` → `uploadDocument`; `GET /:id` → `getDocument` (§12-7) | |
| `src/controllers/documents.controller.ts` | `uploadDocument(req, res)`, `getDocument(req, res)` | parse/validate, call the service |
| `src/services/documents.service.ts` | `ingestDocument(file: Express.Multer.File, kind: DocKind): Promise<UploadDocumentResponse>`; `getDocumentById(id: string): Promise<DocumentRow>`; `sha256Hex(buf: Buffer): string`; `sniffType(buf: Buffer): "pdf" \| "docx" \| null` | Storage + parse + insert, dedupe |
| `src/routes/jds.routes.ts` | `POST /extract`, `GET /`, `GET /:id` | |
| `src/controllers/jds.controller.ts` | `extractJd`, `listJds`, `getJd` | |
| `src/services/jds.service.ts` | `extractJd(input: ExtractJdInput): Promise<ExtractedSkillList>`; `listJds(): Promise<JdSummary[]>`; `getJd(id: string): Promise<JdDetail>`; `getCompanyCandidates(): Promise<CompanyCandidate[]>`; `getPromptVersion(task: "jd"): Promise<string>` (from agent `/health`, memo 60 s) | cache check, agent call, upsert |
| `src/routes/index.ts` (change) | `router.use("/documents", documentsRoutes); router.use("/jds", jdsRoutes)` | mount |
| `src/types/contract.ts` | generated | shared TS types |
| `supabase/migrations/20261027_role1_jd_analytics.sql` | | DDL §6 |
| `scripts/seed-taxonomy.ts` | `npx tsx scripts/seed-taxonomy.ts` | upsert the seed JSON |
| `scripts/preload-samples.ts` | `npx tsx scripts/preload-samples.ts --consensus` | upload + extract the 6 JDs (and the 4 resumes once Role 2 is ready), mark `is_sample` |

### Frontend (`frontend/src/`, 4-layer `frontend-arch-init`)

| File | Signatures | Purpose |
|---|---|---|
| `features/jd/service/jd.api.ts` | `uploadDocumentAPI(file: File, kind: DocKind, onProgress?: (pct: number) => void)`; `extractJdAPI(body: ExtractJdRequest)`; `getJdsAPI()`; `getJdAPI(id: string)` | pure Axios, returns `.data` |
| `features/jd/slice/jd.slice.ts` | state `{library, byId, stage, error, selectedSkillKey, categoryFilter, showBaseline}`; reducers `setJdLibrary, setJdDetail, setJdStage, setJdError, setSelectedSkill, setCategoryFilter, toggleBaseline` | sync only |
| `features/jd/Hooks/jd.hooks.ts` | `useJdLibrary()`, `useJdDetail(jdId)`, `useJdUploadAndExtract()` → `{run(file), stage, error}`, `useSkillSelection()`, `useEvidenceSegments(detail)` | business logic; stages `uploading → parsing → extracting → done` (the first two stages are real calls) |
| `features/jd/lib/highlight.ts` | `buildSegments(text: string, spans: Span[]): Segment[]`; `findSpan(text, evidence): Span \| null` | pure, unit tested; `findSpan` is the fallback if `evidence_span` is absent |
| `features/jd/components/JdAnalyticsPage.tsx` | | library + dropzone |
| `.../JdDropzone.tsx`, `JdLibraryGrid.tsx` (uses `CompanyLogo`), `ExtractionStepper.tsx` | | input |
| `.../JdResultView.tsx`, `CategoryGroup.tsx` (Accordion of 12 + OTHER), `SkillChip.tsx` (Badge must/nice, confidence dot, consensus marker, LLM-only outline) | | result |
| `.../JdTextViewer.tsx` | `<mark>` segments, section shading, `scrollIntoView` on selection | evidence side by side |
| `.../CategoryLevelsChart.tsx` | recharts BarChart, JD vs company bar | P2 |
| `.../ProvenanceDrawer.tsx` | shadcn `Sheet` | "how we got this" |
| `.../JdPicker.tsx` | `({ onSelect(jdId) })` | reused by the flow wizard step 1 |
| `features/jd/jd.module.scss` | tokens from `styles/tokens.scss` | styles |
| `routes/jd.tsx`, `routes/jd.index.tsx`, `routes/jd.$jdId.tsx` | thin file routes | pages |
| `store.ts` (change) | add `jd: jdReducer` | |

## 6. API and database details

### `POST /api/documents` (multipart: `file`, `kind`)

```http
201 Created
{ "document_id": "8c1e…", "sha256": "4f9a…", "cached": false,
  "kind": "jd", "file_name": "google_swe.pdf", "page_count": 2,
  "sections": [ { "kind": "responsibilities", "label": "Key Responsibilities", "requirement_hint": "must" },
                { "kind": "requirements", "label": "Preferred Qualifications", "requirement_hint": "nice" } ] }
```

The first three fields are the contract's. The rest are additive and drive the stepper's "found 5 sections". A dedupe hit returns **200** with the same body and `cached: true`. Errors: 400 `no file`; 413 `File larger than 10 MB`; 415 `Only PDF or DOCX` (based on magic bytes: `%PDF-` or a ZIP containing `word/document.xml`, so a renamed `.doc` is also rejected); 422 `No extractable text (scanned PDF?)`.

### `POST /api/jds/extract`

```jsonc
// request
{ "document_id": "8c1e…", "company_id": 4, "role": "Software Engineer", "consensus": false, "force": false }
// 200: ExtractedSkillList (contract §3.2) + "jd_id"
{ "source_type": "jd", "source_file": "google_swe.pdf", "company": "Google LLC", "role": "Software Engineer",
  "document_id": "8c1e…", "jd_id": "b71d…", "company_id": 4,
  "skills": [ { "skill_name": "Data structures and algorithms", "category_code": "DSA",
                "evidence": "Strong foundation in data structures and algorithms", "confidence": "high",
                "canonical_id": "data-structures-algorithms", "level_hint": 6, "requirement": "must",
                "section": "requirements", "evidence_span": { "start": 1432, "end": 1484, "page": 1 } } ],
  "category_levels": { "DSA": 6, "COD": 6, "SYSD": 5 },
  "meta": { "schema_version": "1.0", "prompt_version": "jd-v1", "model": "groq:openai/gpt-oss-120b",
            "doc_sha256": "4f9a…", "latency_ms": 7400, "cached": false, "warnings": ["new_skill:borg"],
            "dropped": [ { "skill_name": "Kubernetes", "reason": "unverified_evidence" } ],
            "level_basis": { "DSA": "strong (AS) -> 6; clamp junior" }, "seniority": "junior",
            "baseline_ids": ["python", "java", "c++"],
            "consensus": { "providers": ["openrouter", "groq"], "agreement": 0.86, "status": "ok", "per_skill": {} },
            "degraded": false, "parser_version": "doc-1.0" } }
```

The sample values above illustrate the shape only. They are not real output. Errors: 404 document not found; 409 `document kind is resume`; 502 `All LLM providers failed` (only when degraded mode is also off); 504 when the agent call exceeds 300 s.

**Cache logic in `jds.service.extractJd`:**

1. Look up `select … from extractions where document_id=$1 and prompt_version=$2`.
2. On a hit, and when `!force` and `(!consensus || result.meta.consensus)`, return it with `meta.cached=true`.
3. Otherwise call the agent, then `upsert` the extraction on `(document_id, prompt_version)`, then upsert `job_postings` on `document_id` (§12-6).

### `GET /api/jds` and `GET /api/jds/:id`

```jsonc
// GET /api/jds → JdSummary[]
[ { "jd_id": "b71d…", "document_id": "8c1e…", "company_id": 4, "company_name": "Google LLC",
    "role": "Software Engineer", "location": "Bengaluru, India (Hybrid)", "skill_count": 31, "must_count": 22,
    "top_categories": ["COD","DSA","SYSD"], "prompt_version": "jd-v1", "is_sample": true, "created_at": "…" } ]
// GET /api/jds/:id → JdDetail
{ "jd_id": "b71d…", "extraction": { /* ExtractedSkillList */ }, "job_posting": { /* row */ },
  "document": { "file_name": "google_swe.pdf", "text": "…", "sections": [ /* Section */ ], "page_count": 2 } }
```

### Agent endpoints (FastAPI, live at `/docs`)

- `POST /documents/parse` takes `{file_b64, file_name, kind}` and returns `ParsedDocument` (§12-1).
- `POST /extract/jd` takes `JdExtractRequest {document_id, source_file, text, sections, company_hint, role_hint, companies: [{company_id, name}], options: {consensus}}` and returns `ExtractedSkillList`.

The agent receives already-parsed text, so a cache miss never re-parses the file.

### DDL: `backend/supabase/migrations/20261027_role1_jd_analytics.sql`

```sql
create table if not exists public.documents (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null check (kind in ('jd','resume')),
  file_name      text not null,
  sha256         text not null unique,
  storage_path   text not null,                    -- '<kind>/<sha256>.<ext>' in bucket talent-docs
  mime           text not null,
  size_bytes     int,                              -- additive
  text           text,
  sections       jsonb not null default '[]'::jsonb,
  page_count     int,
  parser_version text,                             -- additive
  created_at     timestamptz not null default now()
);

create table if not exists public.extractions (
  id             uuid primary key default gen_random_uuid(),
  document_id    uuid not null references public.documents(id) on delete cascade,
  source_type    text not null check (source_type in ('jd','resume')),
  prompt_version text not null,
  model          text not null,
  result         jsonb not null,                   -- contract object, validated before insert
  latency_ms     int,
  created_at     timestamptz not null default now(),
  unique (document_id, prompt_version)
);
create index if not exists extractions_document_id_idx on public.extractions(document_id);

create table if not exists public.job_postings (
  id            uuid primary key default gen_random_uuid(),   -- = jd_id
  extraction_id uuid not null references public.extractions(id) on delete cascade,
  document_id   uuid unique references public.documents(id) on delete cascade,  -- additive, §12-6
  company_id    int references public.companies(company_id),  -- verify PK column name with list_tables
  company_name  text not null,
  role          text not null,
  location      text,
  is_sample     boolean not null default false,             -- additive
  created_at    timestamptz not null default now()
);
create index if not exists job_postings_extraction_id_idx on public.job_postings(extraction_id);
create index if not exists job_postings_company_id_idx   on public.job_postings(company_id);

alter table public.documents    enable row level security;
alter table public.extractions  enable row level security;
alter table public.job_postings enable row level security;   -- no anon policies: service-role only

insert into storage.buckets (id, name, public) values ('talent-docs', 'talent-docs', false)
on conflict (id) do nothing;
```

`documents(sha256)` is indexed by its unique constraint. `skill_taxonomy` DDL is Role 5's. My seed script upserts with `on conflict (canonical_id) do update set aliases = excluded.aliases, display_name = excluded.display_name` and never changes `category_code` once Role 5 has set it.

## 7. Scalability and reliability

| Concern | Design |
|---|---|
| Duplicate cost | sha256 dedupe at upload (no re-store, no re-parse), and the extraction cache on `(document_id, prompt_version)`. Cost scales with **unique JDs, not views**. A prompt change bumps the version and invalidates the cache cleanly. |
| Latency | parse under 1 s; LLM 5-30 s on the free tier; cache hit under 300 ms. All 6 samples are pre-computed, so the demo is instant. |
| Free-tier rate limits | per-provider token bucket in `llm.py`; skip to the next provider on a long `retry-after`; consensus only on samples or opt-in; `preload-samples.ts` runs sequentially with a 3 s gap. |
| Timeouts | 45 s per provider attempt, 120 s total LLM budget in the agent, 300 s backend timeout (existing). |
| Horizontal scale | the agent is stateless (it receives text and the company list, has no DB credentials), so it scales with more uvicorn workers or containers. Only the backend writes to the DB. |
| Async path (P3) | a `jobs` row with status `queued/running/done/failed`, `202 {job_id}`, and polling `GET /api/jobs/:id`. The result shape is unchanged. A worker can later move to a queue (pg-boss or a Supabase queue) without touching the UI. |
| Cost at scale | about 2-3k input and 1.5-2k output tokens per JD. On a paid flash-class model that is a fraction of a cent per *unique* JD, and consensus doubles it. Post-processing is CPU-only. |
| Licensing | PyMuPDF is AGPL, which is fine for the hackathon. For a commercial product, swap in `pypdfium2` behind the same `_pdf_blocks` interface. This is a slide point that shows maturity. |

**Failure modes and what the user sees**

| Failure | Behaviour | UI |
|---|---|---|
| Unsupported or oversized file | 415 / 413 | inline dropzone error with the allowed types |
| Scanned PDF (low text density) | 422 (P3: OCR) | "This PDF has no selectable text. Try the DOCX or enable OCR" |
| Primary LLM rate-limited or down | next provider | nothing visible; the provenance drawer lists the attempts |
| Invalid JSON from the model | one repair retry, then the next provider | nothing visible |
| All providers fail | keyword degraded mode, `meta.degraded=true` | amber banner "Keyword mode: LLM unavailable, results are partial" plus a retry button |
| Consensus partner fails | single result, `consensus.status=partial` | agreement badge reads "1 model" |
| Company not resolved | `company_id=null` | company select above the result |
| Supabase unreachable | `GET /api/jds` serves the snapshot; extraction returns the result unsaved with a warning | toast "Offline: results not saved" |

## 8. Testing and evaluation

**Unit tests (pytest, offline)**

- `test_documents.py`
  - builds a 2-column PDF with fitz inside the test and asserts that the left column is read before the right;
  - builds a DOCX with a table and a Heading 2 via python-docx and asserts the order and the sections;
  - checks de-hyphenation and bullet normalisation;
  - checks header/footer removal on a 3-page PDF.
- `test_jd_postprocess.py`, table-driven:
  - exact, fuzzy, weak and fabricated evidence;
  - must/nice cue precedence;
  - dedupe merge keeps must and the highest confidence;
  - a taxonomy category override.
- `test_jd_levels.py`: one case per rubric row, the years regex, the nice floor and the seniority clamp.
- `test_jd_company.py`: "Google LLC (Subsidiary of Alphabet Inc.)" gives 4; "Oracle Financial Services Software Ltd" gives 24; "Oracle Corporation" alone does not give 24.
- `test_llm_fallback.py`, using `GenericFakeChatModel`: provider A returns invalid JSON, then fails the repair, so provider B is used; also a 429 with a long `retry-after` skips immediately.

**Contract tests**

- `test_jd_contract.py`: every golden file and every pipeline output validates as `contract.ExtractedSkillList` and against the exported JSON Schema.
- Backend vitest: the upload route covers dedupe, 415 and 413, with Storage and the agent mocked; the extract route covers a cache hit without calling the agent.
- Frontend vitest: slice reducers, `buildSegments` with overlapping spans, and `useJdUploadAndExtract` stage transitions with a mocked service.

**Golden-set eval (`pytest -m eval`)**

- **Labels.** `tests/golden/<sample>.json` is a contract-valid `ExtractedSkillList` plus an `_eval` block: `{level_ranges: {"DSA": [5,7]}, acceptable_extra: ["agile"], must_not_include: ["kubernetes"]}`. I label them by hand, the Scrum Master reviews 2 of them, and we record the disagreements. The few-shot example is synthetic and is never taken from these 6 files.
- **Matching.** A predicted skill counts as a TP when its `canonical_id`, or a taxonomy alias of it, equals a golden canonical id. Skills in `acceptable_extra` count as neither TP nor FP. We report both strict and lenient scores.
- **Metrics per JD and micro-averaged:**
  - skill P/R/F1;
  - per-category P/R ("did we detect that the JD needs SYSD?");
  - must/nice accuracy on matched skills;
  - `category_levels` MAE and in-range percentage;
  - **hallucination rate**: the share of raw LLM skills dropped by the evidence gate;
  - verified-evidence rate after the gate, which must be 100%;
  - `must_not_include` violations.
- **Systems compared:** keyword baseline, LLM raw, LLM + post-processing, and consensus.
- **Replay.** Runs read `tests/golden/llm_cache/` by default. `--live` re-records. This keeps numbers reproducible on stage Wi-Fi.

**Slide content.** One table (rows = the 4 systems, columns = P, R, F1, category recall, hallucinations blocked) and one sentence, for example "keyword matching found X of Y required skills; our pipeline found Z with 0 unverifiable". The numbers come only from the actual run and are never estimated.

## 9. Demo script (my 4-5 minutes of the 45)

1. **Problem, 20 s.** Open `/jd`. Say: "JDs are written in prose. 'Build systems that serve a billion users' never says 'distributed systems', yet that is the real requirement."
2. **Library, 20 s.** Show the 6 pre-loaded JD cards with logos. Open **Google SWE**; the result is instant from the cache, and the drawer shows `cached: true`.
3. **Live upload, 60 s.** Drag the **Microsoft Data Analyst DOCX** into the dropzone, where the stepper shows Uploading, then Parsing ("2 pages, 5 sections found"), then Extracting. While it runs, say: "pass 1 is the LLM; pass 2 is plain Python that verifies every quote". The skills appear grouped by category, with must/nice badges.
4. **The wow moment, 60 s.** Click the chip "Large-scale data pipelines" (confidence low, inferred). The JD text scrolls and highlights the exact prose sentence. Then flip **"Keyword baseline"**: the counter shows "keyword matching would have missed N of M", and the LLM-only chips are outlined. Open the drawer: 2 models, an agreement percentage, and the list of **dropped** skills with the reason `unverified_evidence`.
5. **Levels, 40 s.** Show the CategoryLevelsChart: the JD-implied level against Google's company bar. Say: "This posting's wording ('strong', '3+ years') implies SYSD 7, above Google's general bar. That is the input for Skill Matching." Then hand over to Role 2.
6. **Challenge story, 40 s.** Say: "Our first run on the Oracle support JD returned Kubernetes. It was not in the JD; the model was pattern-matching 'production systems'. Instead of more prompt tweaking we added the evidence gate. Every skill must point to a real sentence, or it is dropped. Our eval shows X% of raw LLM skills were blocked, and after the gate 100% of shown skills are verifiable." Use the real example and number from our own runs, and swap in whichever hallucination we actually observe.

Backup: if the live upload fails, pick the cached DOCX from the library. If the network fails, the offline snapshot serves the library.

## 10. Dependencies, risks and mitigations

| Dependency or risk | Impact | Mitigation |
|---|---|---|
| `contract.py` not landed by hour 1 | everyone blocked | I draft the `Skill`/`ExtractedSkillList` models myself in the first 30 min and hand them to the contract owner |
| Role 5 `taxonomy.py` late | no canonical ids | P0 fallback `resolve()` over the seed JSON, same interface; it is replaced when Role 5 merges |
| Role 4 skill-bar route late | P2 chart has no bar | chart renders the JD levels only; reads the snapshot JSON directly as a fallback |
| Sample pack not in the repo | nothing to test | ask the Scrum Master first thing; `agent/data/samples/jds/` gitignored if the organizers require it |
| Free-tier outage or limits on demo day | slow or failed extraction | pre-computed samples, cache, fallback chain, degraded mode, recorded LLM cache for the eval |
| Category ambiguity (statistics, BI tools) | inconsistent with Role 5 | fixed mapping table in §3.12, agreed with Role 5 by P1 |
| Small golden set (6 JDs) | judges question the eval | report it honestly, add the P3 generalisation set, show labeller agreement |
| PDF and DOCX of the same JD differ | inconsistent results | the PDF/DOCX Jaccard acceptance test; `meta.parser_version` |
| Over-engineering the deadline | P1 slips | strict order in §11; P2 items are independent and cuttable; consensus is the first to cut |

## 11. Task checklist (order = execution order)

**P0 (27 Oct, hours 0-2)**

- [ ] 0.25 h Draft the JD parts of `contract.py` with the contract owner; export the schema
- [ ] 0.25 h Write the migration, apply it, create the bucket, verify the `companies` PK name
- [ ] 0.5 h `POST /api/documents`: multer, sniffing, sha256, Storage, dedupe, insert
- [ ] 0.25 h Agent `jd/router.py` stubs (`/extract/jd` golden, `/documents/parse` naive); backend `POST /api/jds/extract` wired
- [ ] 0.25 h `llm.py` signatures + fake-model fallback test; `documents.py` signatures; announce to Roles 2 and 5
- [ ] 0.5 h Hand-label `google_swe.json` golden (it doubles as the stub); taxonomy seed v0 (about 80 entries)

**P1 (27 Oct, hours 2-10)**

- [ ] 1.5 h `documents.py`: fitz dict blocks, column ordering, DOCX body order + tables, normalisation, header/footer, sections, tests
- [ ] 1.0 h `prompts/jd_extract.md` + `prepare.py` + the `run_structured` real implementation (native + JSON mode, repair, rate limiter)
- [ ] 1.5 h `postprocess.py` rules a-f, h, j + tests
- [ ] 0.75 h `level_inference.py` + tests; `company.py` + tests
- [ ] 0.5 h `pipeline.py` meta, contract validation, baseline
- [ ] 0.75 h Backend cache logic, `GET /api/jds`, `GET /api/jds/:id`, zod
- [ ] 2.0 h Frontend `features/jd` v1: service, slice, hooks, dropzone, stepper, library, result groups, text viewer with highlights
- [ ] 0.5 h Golden `oracle_fss_associate_swe.json` + eval harness; run on 2 JDs; fix the top issues

**P2 (28 Oct morning, about 6 h)**

- [ ] 1.25 h Golden for the remaining 4 JDs; eval table with the baseline; export `jd_eval.md`
- [ ] 1.0 h Consensus merge + UI agreement markers
- [ ] 1.0 h Provenance drawer, baseline toggle, degraded banner
- [ ] 0.75 h CategoryLevelsChart against the company bar
- [ ] 0.75 h Taxonomy seed v1 + `seed-taxonomy.ts` (with Role 5)
- [ ] 0.5 h `preload-samples.ts --consensus`, offline snapshot export
- [ ] 0.5 h `JdPicker` for the flow wizard; integration with Role 5 on Google SWE × Ananya

**P3 (28 Oct afternoon, about 2 h, cut freely)**

- [ ] 0.75 h Async jobs path for `/api/jds/extract` (if the shared `jobs` table exists)
- [ ] 0.5 h `/extract/jd/batch` + timing numbers for the slide
- [ ] 0.5 h OCR flag; taxonomy-growth report from `new_skill:*`
- [ ] 0.25 h Demo rehearsal of my segment, with backup paths

## 12. Proposed contract changes

All of these are additive. None renames or removes anything in the locked contract.

1. **New agent endpoint `POST /documents/parse`**, called by `POST /api/documents` on a non-dedupe upload. Gap: the contract's `documents` table has `text`, `sections` and `page_count`, but the API table says the upload makes no agent call, and `ExtractedSkillList` carries no text. Something has to fill those columns. Parsing at upload also gives a real "Parsing" stage in the UI and lets Roles 2 and 5 reuse the text. Under the current wording, the fallback is that `/extract/jd` accepts `file_b64` and also returns the parsed document.
2. **`jd_id` (optional, JD only) in `ExtractedSkillList`** = `job_postings.id`. Role 5's `POST /api/skill-match {profile_id, jd_id}` needs it, and nothing in the current object carries it.
3. **`evidence_span {start, end, page}` (optional) on `Skill`**: character offsets into `documents.text`, so the UI highlights exactly what was verified. Role 2 can emit it too. Without it, the frontend falls back to `findSpan()`.
4. **Documented `meta` keys:** `dropped[]`, `level_basis{}`, `seniority`, `baseline_ids[]`, `consensus{providers, agreement, status, per_skill}`, `degraded`, `parser_version`. These go into `contract.py`, so the generated TS types include them.
5. **`POST /api/jds/extract` optional body fields `consensus?: boolean`, `force?: boolean`.** The upload response gains `kind, file_name, page_count, sections[]` (summary only).
6. **Additive columns:** `job_postings.document_id uuid unique`, `job_postings.is_sample`, `job_postings.created_at`, `documents.size_bytes`, `documents.parser_version`. `document_id unique` keeps `jd_id` **stable across prompt-version bumps**: re-extraction updates `extraction_id` instead of creating a duplicate posting, so the library never shows a JD twice and Role 5's matrix keys stay valid.
7. **`GET /api/documents/:id`** (shared, owned by me) returns `{id, kind, file_name, text, sections, page_count}` plus a short-lived signed URL. Role 2's resume view needs the same thing.
8. **Cache key clarification.** Rule 4 says the key includes "model family", but `unique(document_id, prompt_version)` does not. Proposal: keep the unique constraint and do not include the model in the key. The stored `meta.model` records which model produced the result, and a consensus result supersedes a single-model one.
9. **Storage path consistency.** The §3.4 `cv_file` example is `documents/<sha256>.pdf`, while the §4 route says `<kind>/<sha256>.<ext>`. Proposal: `cv_file = "resume/<sha256>.pdf"`.
10. **Clarification, no schema change.** "Preferred qualifications" maps to `section: "requirements"` plus `requirement: "nice"`. Boilerplate sections map to `other`. The `Skill.section` enum stays as is.
11. **Taxonomy interface and ambiguous-category table** (§3.12) to be added to the contract as the shared rule for Roles 1, 2 and 5.
