# Role 2: Resume Parsing, implementation plan

_Owner: Himanshu Gola (Gola) <himanshu.gola05@gmail.com> (Role 2). Written 2026-10-27. Builds on [00-shared-contract.md](../00-shared-contract.md) (locked). Where this plan needs something the contract does not have yet, it is listed in section 12 and marked "(proposed)" where it is used. Nothing here renames a contract field._

---

## 1. Mission and what "stand out" means for this role

- **Mission (brief p.7):** given any resume as PDF or DOCX, return the shared skill list plus the fields we can pull reliably (education, experience, projects, hackathons, certifications), as a `ResumeExtraction` (contract 3.3).
- **Stand out 1, format-invariant parsing.** The same resume as PDF, DOCX, a two-column re-layout or a scanned image gives the same answer. We prove it with a measured test, not a claim ("PDF vs DOCX: skill overlap 0.9x, level difference 0.x").
- **Stand out 2, explainable levels.** `category_levels` (the number Talent Check depends on) comes from a deterministic, versioned evidence-to-level model mapped onto the Bloom rubric (contract 2). Every level has a `basis` sentence and the evidence lines behind it. The LLM can only nudge a level by ±1, and it has to cite evidence to do so.
- **Stand out 3, grounded and private.** Every skill carries an evidence quote that we check against the source text (a grounding check, not just a prompt instruction). Email and phone are found with regex and **masked before any text goes to a third-party LLM**.
- **Stand out 4, measured.** A golden-set eval on the 4 samples reports field accuracy, skill precision and recall, level MAE and format invariance with one command, and those numbers go on a slide.

## 2. Inputs, outputs and hand-offs

| | What | Contract reference |
|---|---|---|
| Input | `document_id` of a file already stored by `POST /api/documents` (`kind=resume`, Role 1's shared upload route) | contract 4, table `documents` (5) |
| Output | `ResumeExtraction` = `ExtractedSkillList` (`source_type: "resume"`, `company: null`) + `candidate`, `education`, `experience`, `projects`, `hackathons`, `certifications`, `field_confidence`, `category_levels` | contract 3.1, 3.2, 3.3 |
| Stored in | one row in `extractions` (`source_type = 'resume'`, `prompt_version = 'resume-v1'`) | contract 5 |
| Route | `POST /api/resumes/parse {document_id}` → agent `POST /extract/resume` | contract 4 |

**Who consumes it**

| Consumer | Uses | What they rely on |
|---|---|---|
| Role 3 Profile Builder | `POST /api/profiles/from-resume {resume_extraction_id}` reads our row | `candidate.*`, `education[]`, `experience[]` (they become `internships`), `projects`, `hackathons`, `certifications`, `skills[]`, and `category_levels` + per-category confidence/basis, which they copy into `skill_levels` with `source: resume_inferred` (contract 3.4) |
| Role 4 Talent Check | indirectly, through `skill_levels` | all 12 codes present, 1 to 10, `1 / low / "no evidence"` when nothing is found |
| Role 5 Skill Matching | `skills[]` (through the profile, or the resume directly, brief p.8) | `canonical_id`, `category_code`, `evidence`, `section`, `level_hint` |
| Role 1 JD Analytics | shares code with us | we reuse `documents.py`, `llm.py`, `taxonomy.py`; we give back the heading/column logic and the rubric helpers in `levels.py` |

## 3. Approach and design

### 3.1 Pipeline

```
 file bytes (PDF | DOCX)                                    agent: talent_match.resume.pipeline.parse_resume()
   │
   ├─► documents.py (Role 1)  ── blocks with bbox, font size, bold, page ─┐
   │                                                                     ▼
   │                              resume/layout.py   column detection, reading order, running header/footer
   │                                                 removal, DOCX tables + text boxes + headers, OCR fallback
   │                                                                     │  list[Line]  (text, page, x0, size, bold, caps)
   ▼                                                                     ▼
 resume/patterns.py  ◄──── full text ───────────  resume/sections.py   heading lexicon + fuzzy match → Sections
 email, phone, links, CGPA/%, dates                         │                (LLM segmentation only if < 2 headings)
   │  Contact                                               │
   └──► redact_pii(): [EMAIL] [PHONE] [LINK1] ──────────────┤
                                                            ▼
                         ┌──────────── resume/extract.py (asyncio.gather, semaphore = 2) ────────────┐
                         │ call A: EXPERIENCE  (entries + skills + signals)                           │
                         │ call B: PROJECTS    (entries + skills + signals)                           │
                         │ call C: MISC        (education, certs, hackathons, achievements,          │
                         │                      positions, summary/target role, soft signals,        │
                         │                      category for unmapped skill tokens)                  │
                         │ no LLM: SKILLS section split + taxonomy lookup                            │
                         └───────────────────────────────┬────────────────────────────────────────────┘
                                                         ▼
                         resume/merge.py   canonicalize (taxonomy.py) → merge per canonical_id → grounding
                                           check → confidence rule → drop skills without evidence
                                                         ▼
                         levels.py         evidence units per category → points → Bloom gates → level,
                                           confidence, basis  (+ optional LLM review, clamped ±1)
                                                         ▼
                                     ResumeExtraction (validated by contract.py, one repair retry)
```

Three LLM calls per resume (plus one optional for the level review) instead of one huge prompt or one call per section. Small prompts are much more reliable on the free-tier models in `.env.example`, and three calls stay inside the free rate limits. `RESUME_EXTRACT_MODE=single` switches to one whole-document call when a provider is rate-limiting hard.

### 3.2 Layout tolerance (`resume/layout.py`)

Resumes break naive `page.get_text()` in predictable ways. Each case and the fix:

| Problem | Detection | Fix |
|---|---|---|
| Two-column / sidebar PDF (Canva, Overleaf templates) | x-occupancy histogram of narrow blocks has an empty vertical gutter covering ≥ 70% of the body height | order = full-width blocks above the columns, then left column top-down, then right column, then full-width blocks below. The sidebar becomes its own stream, so its "Skills" heading still segments correctly |
| Word-per-span PDFs | PyMuPDF `get_text("dict")` gives spans | join spans into lines by `line` id, then lines into blocks by y-gap < 0.6 × font size |
| Running header/footer, "Page 1 of 2" | normalized text (digits → `#`) repeats on ≥ 2 pages inside the top/bottom 7% band | drop it, **but run `patterns.find_contacts()` on the raw page-1 text first**, because contact details often live in the header |
| Icon glyphs (Font Awesome phone/mail icons), ligatures, odd bullets | Unicode private-use range U+E000–U+F8FF, `ﬁ ﬂ`, `• ▪ ● ➢ ◦ –` | NFKC normalize, strip PUA, turn bullets into `- ` |
| Hyphenated line breaks | line ends with `-` and the next starts lowercase | join |
| DOCX tables used for layout (very common) | `w:tbl` in body order | iterate `body.iterchildren()` so tables keep their position; a 2-cell layout row becomes two column streams; dedupe repeated text from merged cells |
| DOCX text boxes and shapes | `.//w:txbxContent//w:p` (and `mc:Fallback` duplicates) | extract in document order, dedupe against `mc:Choice` |
| DOCX header/footer with contact info | `section.header` / `section.footer` paragraphs and tables | prepend the first header to the text, flagged `region="header"` |
| Scanned PDF | page has < 40 extractable characters and at least one image | OCR: render at 300 dpi → `pytesseract.image_to_data` → lines with bbox, so the same column logic applies. Optional dependency; without it we return 422 `scanned_pdf_ocr_unavailable` and a clear message |
| Encrypted or corrupt file | PyMuPDF / python-docx exception | 422 `unreadable_document` |

Column detection sketch (pure Python, no numpy):

```python
def detect_gutter(blocks: list[Block], page_w: float, body_top: float, body_bot: float) -> float | None:
    narrow = [b for b in blocks if b.width < 0.62 * page_w and body_top <= b.y0 <= body_bot]
    if len(narrow) < 6:
        return None
    bins = [0.0] * (int(page_w) // 4 + 1)                 # 4 pt bins
    for b in narrow:
        for i in range(int(b.x0) // 4, int(b.x1) // 4 + 1):
            bins[i] += b.height
    lo, hi = int(0.2 * len(bins)), int(0.8 * len(bins))   # gutter must be in the middle 60 %
    best = max(_zero_runs(bins[lo:hi]), key=len, default=None)
    if best and len(best) * 4 >= 8:                       # at least 8 pt of white space
        return (lo + best[len(best) // 2]) * 4.0
    return None
```

### 3.3 Section segmentation (`resume/sections.py`)

1. **Heading candidate:** a line with ≤ 5 words, no trailing period, and at least one of: bold, font size ≥ body median + 1 pt, ALL CAPS, ends with `:`, DOCX style `Heading*`/`Title`.
2. **Heading lexicon**, matched with `rapidfuzz.fuzz.token_set_ratio ≥ 85` after lowercasing and stripping `& / :`:

| Canonical section | Variants (abridged) |
|---|---|
| `summary` | summary, profile, objective, career objective, about me |
| `education` | education, academic background, academics, qualifications, scholastic |
| `experience` | experience, work experience, internships, internship, professional experience, employment, industry experience |
| `projects` | projects, academic projects, personal projects, key projects, technical projects |
| `skills` | skills, technical skills, tech stack, tools and technologies, core competencies, skill set |
| `certifications` | certifications, certificates, licenses, courses, online courses |
| `hackathons` | hackathons, competitions, coding competitions, contests |
| `achievements` | achievements, awards, honors, accomplishments, scholarships |
| `positions` | positions of responsibility, leadership, extracurricular, volunteering, activities |
| `publications` | publications, research, papers |
| `coursework` | relevant coursework, coursework, subjects |
| `other` | languages, interests, hobbies, declaration, references |

3. Lines before the first heading are `header` (name, contact, links).
4. **LLM fallback:** if fewer than 2 headings are found and the text is longer than 1,200 characters, send numbered lines and ask only for boundaries (`[{"start_line": 12, "section": "projects"}]`). The output is tiny, so it is cheap and reliable. If that fails too, the whole body goes to a single `other` section and the `single` extraction mode runs (warning `segmentation_fallback`).

### 3.4 Deterministic fields (`resume/patterns.py`)

| Field | Rule |
|---|---|
| email | RFC-lite regex; first match in header region wins |
| phone | `(\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}` plus a generic E.164 pattern; normalized to `+91XXXXXXXXXX` |
| links | `github.com/…`, `linkedin.com/in/…`, `leetcode.com/…`, `codeforces.com/profile/…`, `kaggle.com/…`, portfolio URLs |
| name | first header line with 2 to 4 capitalized tokens and no digits; confidence `high` if it fuzzy-matches the email local part, else `medium` |
| score | `\d\.\d{1,2}\s*(/\s*10)?\s*(CGPA|GPA|CPI)` or `\d{2}(\.\d+)?\s*%` |
| dates | `Jan 2025`, `01/2025`, `2025-01`, `Summer 2025`, `2023 – Present` → `YYYY-MM` or `present`; `months(start, end)` for duration |
| competitive ranks | `LeetCode … (\d{4})`, `Codeforces (Expert|Specialist|…)`, `ICPC … (Regional|World)`, `rank \d+ / \d+`, `top \d+%`, `AIR \d+` |

`redact_pii(text, contact)` replaces email, phone and profile links with `[EMAIL]`, `[PHONE]`, `[LINK1..n]` before any LLM call. The LLM never needs them, because they were already extracted.

### 3.5 Per-section LLM extraction (`resume/extract.py`, `resume/prompts.py`)

All calls go through Role 1's `llm.py` (structured output, `temperature=0`, provider fallback, one repair retry with the validation error). Lines are numbered so the model cites `line` numbers, which feeds the grounding check.

```text
[prompt: resume-v1/experience]
SYSTEM: You read ONE section of a candidate's resume and return JSON matching the schema. Rules:
- Copy facts, never invent. Each skill needs "evidence": a phrase copied from the text (<= 200 chars) and the "line" it came from.
- category_code is one of: COD Coding, DSA Data Structures and Algorithms, APTI Aptitude and Problem Solving,
  COMM Communication, OOD Object-Oriented Design, AI AI Native Engineering, SQL SQL and Design,
  SYSD System Design and Architecture, CLOUD DevOps and Cloud, SWE Software Engineering,
  NETW Computer Networking, OS Operating Systems, OTHER.
- Dates as YYYY-MM or "present"; null if absent.
- signals: leadership = led/designed/owned/architected/mentored; quantified = a number describing impact
  (%, users, latency, rows, money); production = shipped to real users or in a company system.
USER:
Section: EXPERIENCE
L1  SDE Intern, Acme Payments                         May 2025 – Jul 2025
L2  - Built a Kafka-based event pipeline in Go, cutting settlement latency by 40%
...
SCHEMA: {"entries":[{"title":str,"org":str,"kind":"internship|job|freelance","start":str|null,"end":str|null,
  "highlights":[str],"skills":[{"skill_name":str,"category_code":str,"evidence":str,"line":int}],
  "signals":{"leadership":bool,"quantified":bool,"production":bool}}]}
```

`projects` uses the same skeleton with `{name, description, link, skills, signals: {..., "creation": bool}}`, where `creation` means a novel system, published work or an OSS project with outside users. `misc` returns `education[]`, `certifications[]`, `hackathons[]` (result normalized to `Winner | Runner-up | Finalist | Top N | Participant`), `achievements[]`, `positions[]`, `target_role`, `soft_signals[{category: COMM|APTI|SWE, signal, evidence, line}]` (talks, client-facing support, TA, documentation, aptitude exams, puzzles) and `unmapped[{token, category_code}]` for skill tokens the taxonomy did not know.

**Skills section without an LLM:** split on `, ; | •` and on `Label:` prefixes (`Languages: Python, Java`), strip versions and proficiency words (`Python (Advanced)` keeps `Advanced` as a self-claim note), look each token up in `taxonomy.py`, and send only the unknown tokens to the `misc` call.

### 3.6 Merge, grounding and skill confidence (`resume/merge.py`)

1. Canonicalize every raw skill with `taxonomy.canonicalize(name)` → `canonical_id`, `category_code`. Unknown → `slugify(name)` with the LLM's category and warning `unmapped_skill:<name>`.
2. Group by `canonical_id`. Keep the strongest mention as `evidence`/`section`, using the priority `experience > projects > hackathons > publications > certifications > achievements > positions > skills > coursework > summary`.
3. **Grounding check:** `rapidfuzz.fuzz.partial_ratio(evidence, cited_line_window) ≥ 80` (window = cited line ± 1). If it fails, re-check against the whole section. If that fails as well, drop the mention and count it in `meta.warnings` as `ungrounded_evidence`. `meta.grounding_rate` (proposed) = grounded / total.
4. **Confidence (contract 3.1 rule, made concrete for resumes):**

| Skill appears in | confidence |
|---|---|
| any applied context (experience, projects, hackathons, publications) with a grounded quote | `high` |
| only `skills` or `certifications` (stated, no usage) | `medium` |
| only inferred (coursework, summary, or the LLM inferred it from a description without naming it) | `low` |

5. `level_hint` per skill = the same points model as section 3.7, run on that skill's own units only.
6. A skill with no evidence string is dropped (the anti-hallucination gate in the contract).

### 3.7 Level inference (`levels.py`), the key design decision

**Goal:** one number from 1 to 10 per category that a recruiter would agree with, that changes when the evidence changes, and that can explain itself in one sentence. It is a points model on top of the shared rubric, with Bloom gates so that piling up weak evidence cannot reach a high band.

**Step 1, evidence units.** `collect_evidence()` turns the extraction into units, one per (category, context entry). A project using Go and Kafka gives one COD unit and one SYSD unit. Mentioning three SQL tools in the same project still gives one SQL unit, so keyword stuffing is not rewarded.

| Unit kind | Base points | Notes |
|---|---|---|
| `listed` (skills section, self-claim) | 0.5 each, **capped at 1.0 per category** | |
| `coursework` | 0.5, cap 0.5 | |
| `certification` | 0.75 foundational, 1.5 associate/professional | from a small issuer/level lexicon (AWS, Azure, GCP, Oracle, NPTEL Elite) |
| `project` | 1.5 | |
| `hackathon` | 1.5, +1.0 if Winner/Runner-up/Top 3 | |
| `experience` | 2.5, +0.5 per extra full 3 months beyond the first 3 (cap +1.5) | `production = true` by default |
| `competitive` (DSA, APTI only) | 1.5 (200+ problems), 2.5 (LeetCode 1600–1999, CF Specialist), 4.0 + `top_rank` (≥ 2000, CF Expert+, ICPC regional) | |
| `soft_signal` (COMM, APTI, SWE) | 1.0, or 2.5 for a client-facing/support role | e.g. "handled 30+ customer tickets a week" |
| `publication` | 3.0 + `creation` | |

**Step 2, depth and recency.** Each unit is multiplied by `depth = min(1.5, 1 + 0.25·quantified + 0.25·leadership)` and by `recency = 0.8` if it ended more than 3 years ago, else 1.0.

**Step 3, points → level**, using the thresholds below.

| Points P | 0 | (0, 1] | (1, 2.5] | (2.5, 4] | (4, 6] | (6, 8.5] | (8.5, 11] | (11, 14] | (14, 18] | > 18 |
|---|---|---|---|---|---|---|---|---|---|---|
| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

**Step 4, Bloom gates** (the rubric in contract 2, enforced):

| Gate | Condition to go above the cap | Cap if not met |
|---|---|---|
| G-AP | at least 1 applied unit (project, experience, hackathon, competitive, soft signal) or a certification | 2 |
| G-AS | at least 2 applied units, or 1 experience unit | 4 |
| G-EV | (leadership on some unit, `top_rank`, or a production unit with `quantified`) **and** (an experience unit or at least 3 applied units) | 6 |
| G-CR | a `creation` unit (publication, maintained OSS, novel system) | 8 |

**Step 5, confidence and basis.**

| Level confidence | Rule |
|---|---|
| `high` | at least 2 grounded applied units |
| `medium` | 1 applied unit, or certifications only |
| `low` | listed/coursework only, or no evidence (then level 1, basis `"no evidence"`, exactly as the contract requires) |

`basis` is a template (≤ 140 chars), never free LLM text: `"<n> internship(s) (<top refs>) + <n> project(s) (<refs>) · <signals> → <level> <bloom>"`, plus `" · capped: no lead/design evidence"` when a gate applied.

**Step 6 (P2, optional), LLM rubric review.** One call with the rubric, the 12 rule levels and their units. It returns `{"SYSD": {"delta": 1, "evidence_ref": "projects[0]", "reason": "…"}}`. A delta is applied only if it is -1, 0 or +1, cites an existing unit, and does not break a gate. When it is applied, the basis gets `" · +1 rubric review"` and the confidence drops one step if the model disagreed. Version `lv-1.0+review`. It is turned on only if it lowers level MAE on the golden set (section 8), which is an honest, data-driven call we can talk about.

**Worked example (Ananya, SYSD; illustrative wording, re-check against the real resume):**

| Unit | Base | Depth | Points |
|---|---|---|---|
| experience[0] "SDE Intern, Kafka event pipeline, cut latency 40%" (3 months) | 2.5 | 1.25 (quantified) | 3.125 |
| projects[0] "Designed a Raft-based KV store in Go, 10k ops/s" | 1.5 | 1.5 (lead + quantified) | 2.25 |
| projects[1] "Distributed rate limiter, p99 < 5 ms" | 1.5 | 1.25 | 1.875 |
| listed "Kafka, Redis, gRPC" | 0.5 × 3, capped | | 1.0 |
| **Total** | | | **8.25 → level 6** |

Gates: G-AS passes (experience unit). G-EV would pass (leadership plus experience), but P = 8.25 sits in the level-6 band, so no cap applies. Confidence `high` (3 applied units). Basis: `"1 internship (Kafka pipeline, -40% latency) + 2 projects (Raft KV store, rate limiter) · designed, quantified → 6 AS"`.

Counter-example (Priya, SQL; illustrative): she lists `SQL, MySQL, PL/SQL, Oracle` in Skills. On its own that is P = 1.0 (the listed cap), so level 2, which shows keyword stuffing does not pay. She also has "wrote SQL queries to triage 50+ support tickets a week" in an internship (2.5 × 1.25 = 3.125). P = 4.125 → level 5; G-AS passes through the experience unit; confidence `medium` (only 1 applied unit). That is "solid basics with real use", which is the story the brief tells about her.

**Calibration rules.** Weights and thresholds sit in one dict, `LEVELS_CONFIG`, and are tuned **globally, never per candidate or per category**, against the hand labels. With only 48 labels we report leave-one-candidate-out MAE (tune on 3, test on the 4th) so we can say we did not overfit. After tuning we freeze the config as `lv-1.0`.

### 3.8 Calibration oracle (provisional, re-label after reading the real resumes)

Rough expected levels from the brief's profile descriptions. **First task in P1: read the 4 resumes and replace this table with the hand labels in `agent/tests/golden/`.** The test tolerance is ±1 per cell.

| Candidate | COD | DSA | APTI | COMM | OOD | AI | SQL | SYSD | CLOUD | SWE | NETW | OS | mean |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Ananya Rao (systems/SWE) | 6 | 7 | 5 | 4 | 5 | 2 | 3 | 6 | 5 | 6 | 5 | 6 | 5.0 |
| Karthik Subramaniam (data) | 5 | 4 | 5 | 5 | 3 | 6 | 7 | 2 | 3 | 4 | 1 | 2 | 3.9 |
| Priya Menon (entry, support) | 3 | 2 | 4 | 6 | 3 | 1 | 5 | 1 | 2 | 3 | 3 | 3 | 3.0 |
| Rohan Verma (all-rounder) | 7 | 7 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 7 | 4 | 5 | 6.0 |

**Relational invariants (must hold exactly; these are the tests that protect the brief's "visibly different" requirement):**
- `Ananya.SYSD > Karthik.SYSD`, `Ananya.OS > Karthik.OS`, `Ananya.DSA ≥ Karthik.DSA + 2`
- `Karthik.SQL > Ananya.SQL`, `Karthik.AI > Ananya.AI`
- `Priya.mean` is the lowest of the four; `Priya.COMM ≥ median(Priya)` + 2 and `Priya.SQL ≥ 4`
- `Rohan.mean` is the highest; Rohan is ≥ the other three on at least 8 of 12 categories
- pairwise L1 distance between any two fingerprints ≥ 12 (the shapes really differ)

## 4. Features by phase

### P0 Contract and stubs (27 Oct, first 2 h)

| Feature | Acceptance criteria |
|---|---|
| `ResumeExtraction` in `contract.py` checked with Role 1 | `python -m talent_match.contract --export docs/contract/` emits `ResumeExtraction.schema.json`; TS types regenerate cleanly |
| Golden stub JSON for Ananya and Priya | `agent/tests/golden/resume_ananya_rao.json` and `resume_priya_menon.json` validate against the model, with all 12 `category_levels` present |
| Stub `POST /extract/resume` | returns the golden JSON matching the uploaded file name (or Ananya by default), with `meta.warnings: ["stub"]` |
| Stub `POST /api/resumes/parse` | zod-validated; calls the agent; inserts into `extractions`; returns `extraction_id`. Role 3 can build `from-resume` against it immediately |
| Frontend skeleton | `features/resume/{components,Hooks,service,slice}` compile; slice registered in `store.ts` |

### P1 Done-by-brief (27 Oct)

| Feature | Acceptance criteria |
|---|---|
| Text + layout for PDF and DOCX (single and two-column, DOCX tables, headers) | all 8 sample files produce a reading order where every section heading comes before its own content (asserted in a unit test with fixtures) |
| Section segmentation | ≥ 95% of the real headings in the 8 files are found and classified correctly |
| Contact, education, dates regex | email, phone and CGPA exact on all 4 samples |
| 3-call sectioned extraction + merge + grounding | runs end to end on ≥ 2 samples (brief DoD), then all 4; output validates; every skill has evidence; grounding rate ≥ 0.9 |
| `levels.py` v1 (deterministic) | all 12 codes always present; relational invariants pass on all 4; unit tests for every gate |
| Real `POST /api/resumes/parse` | cache hit on the second call (< 300 ms, `meta.cached: true`); `existing_profile_id` filled when the email matches a profile |
| Frontend upload + parsed view + skill chips + "Send to Profile Builder" | a user can upload Ananya's PDF, see the sections and chips, click the button and land in Role 3's pre-filled form; the Google SWE × Ananya flow works end to end |

### P2 Stand-out (28 Oct morning)

| Feature | Acceptance criteria |
|---|---|
| Skill fingerprint radar (12 axes) with the basis on hover | shows level, Bloom label, confidence and basis; low-confidence axes drawn dashed |
| "How we got this" drawer | shows layout detected (`single`/`two_column`/`ocr`), sections found, model(s), latency, LLM calls, grounding rate, PII-redacted badge, warnings |
| Evidence click-through | clicking a chip or a radar axis highlights the source lines in the parsed view |
| Golden-set eval (`pytest -m eval`) | prints the metrics table of section 8 and writes `agent/outputs/eval/resume_eval.json` for the slide |
| Format invariance test + variant generator | PDF vs DOCX for all 4: skill Jaccard ≥ 0.85, level MAE ≤ 0.35, max per-category difference ≤ 1 |
| Torture variants (two-column re-layout, scanned image PDF, shuffled section order) | levels within ±1 of the original on ≥ 90% of cells |
| OCR fallback (optional dependency) | the scanned variant parses with `meta.ocr_used: true` |
| LLM rubric review (±1) | kept only if leave-one-out MAE improves; otherwise off, and we say so on the slide |
| Compare view (4 fingerprints overlaid) | the 4 shapes are visibly different; it reads from pre-computed extractions in < 1 s |
| Pre-compute all 4 resumes × 2 formats | every demo click is a cache hit |

### P3 Scale story (28 Oct afternoon, or slide only)

| Feature | Acceptance criteria |
|---|---|
| Async jobs path | `Prefer: respond-async` → `202 {job_id}`; `GET /api/jobs/:id` returns the same `ResumeExtraction`; the UI polls with the same hook |
| `POST /levels/infer` (deterministic, no LLM) | re-scores an extraction in < 20 ms; used to refresh levels when `levels_version` changes and (if Role 3 wants it) to update slider hints live when a candidate adds a hackathon or certification |
| Bulk ingest script | `python -m talent_match.resume.bulk <folder>` parses N resumes with a per-provider token bucket; reports throughput and cache hit rate |
| Load numbers | measured p50/p95 cold and cached latency, LLM calls per resume, tokens per resume, on a slide |

## 5. Files to create or change

### Agent (`agent/src/talent_match/`), Python 3.11, Pydantic v2

| File | Signatures | Purpose |
|---|---|---|
| `resume/__init__.py` | `from .pipeline import parse_resume` | public entry |
| `resume/pipeline.py` | `async def parse_resume(data: bytes, file_name: str, mime: str, *, document_id: str \| None = None, options: ResumeOptions = ResumeOptions()) -> ResumeExtraction` | orchestrates layout → sections → patterns → extract → merge → levels; fills `meta` |
| | `class ResumeOptions(BaseModel): use_llm: bool = True; mode: Literal["sectioned","single"] = "sectioned"; level_review: bool = False; ocr: bool = True` | knobs (also read from env) |
| `resume/layout.py` | `def reading_order(doc: ParsedDocument) -> list[Line]` | column-aware ordering over Role 1 blocks |
| | `def detect_gutter(blocks, page_w, body_top, body_bot) -> float \| None` | two-column detection |
| | `def strip_running_lines(pages: list[list[Line]]) -> tuple[list[Line], list[str]]` | header/footer removal, returns what was removed |
| | `def docx_lines(data: bytes) -> list[Line]` | body order incl. tables, text boxes, headers (only if `documents.py` does not already) |
| | `def ocr_pages(data: bytes, pages: list[int]) -> list[Line]` | pytesseract fallback, lazy import |
| | `def normalize(text: str) -> str` | NFKC, PUA strip, bullets, de-hyphenation |
| `resume/sections.py` | `HEADING_LEXICON: dict[SectionName, tuple[str, ...]]` | variants table from 3.3 |
| | `def classify_heading(line: Line, body_size: float) -> SectionName \| None` | style + fuzzy test |
| | `def segment(lines: list[Line]) -> list[Section]` | deterministic segmentation |
| | `async def llm_segment(lines: list[Line]) -> list[Section]` | boundary-only fallback |
| `resume/patterns.py` | `def find_contacts(text: str) -> Contact` · `def parse_date_range(s: str) -> tuple[str \| None, str \| None]` · `def months_between(a, b) -> int` · `def find_scores(text) -> list[str]` · `def find_ranks(text) -> list[Rank]` · `def redact_pii(text: str, c: Contact) -> str` · `def mask_for_log(s: str) -> str` | deterministic fields + PII masking |
| `resume/prompts.py` | `PROMPT_VERSION = "resume-v1"`; `EXPERIENCE`, `PROJECTS`, `MISC`, `SEGMENT`, `SINGLE` templates; `def render(section: Section) -> str` (numbered lines) | prompts in one place, versioned |
| `resume/llm_models.py` | `ExperienceOut`, `ProjectsOut`, `MiscOut`, `SegmentOut` (Pydantic) | LLM output schemas, internal, not contract |
| `resume/extract.py` | `async def extract_sections(sections: list[Section]) -> RawExtraction` · `def parse_skills_section(s: Section) -> list[RawSkill]` · `def keyword_fallback(s: Section) -> list[RawSkill]` | 3 calls with `asyncio.gather` + semaphore; deterministic skills; no-LLM fallback |
| `resume/merge.py` | `def merge(raw: RawExtraction, lines: list[Line]) -> tuple[list[Skill], dict[str, Confidence], list[str]]` · `def grounded(evidence: str, window: str) -> bool` · `def skill_confidence(mentions: list[Mention]) -> Confidence` | canonicalize, dedupe, grounding, confidence, warnings |
| `resume/bulk.py` (P3) | `async def main(folder: Path, concurrency: int = 2) -> None` | bulk ingest + throughput report |
| `levels.py` | `LEVELS_VERSION = "lv-1.0"` · `LEVELS_CONFIG: dict` | versioned model |
| | `@dataclass(frozen=True) class EvidenceUnit: category; kind; ref: str; text: str; points: float; quantified: bool; leadership: bool; production: bool; creation: bool; top_rank: bool` | one unit of evidence |
| | `def collect_evidence(x: ResumeExtraction) -> dict[CategoryCode, list[EvidenceUnit]]` | units per category |
| | `def points_to_level(p: float, units: list[EvidenceUnit]) -> tuple[int, str \| None]` | thresholds + gates (returns the cap reason) |
| | `def infer_levels(x: ResumeExtraction) -> dict[CategoryCode, CategoryLevel]` | the 12 levels, confidence, basis |
| | `def bloom(level: int) -> Literal["CU","AP","AS","EV","CR"]` | shared helper (Role 1/3/4 may import) |
| | `async def review_levels(levels, units) -> dict[CategoryCode, CategoryLevel]` | optional ±1 LLM review |
| `api.py` (shared file, add routes only) | `@app.post("/extract/resume", response_model=ResumeExtraction)` · P3: `@app.post("/levels/infer", response_model=LevelsOut)` | FastAPI endpoints |
| `contract.py` (shared) | add the proposed optional fields of section 12 | single source of truth |

Tests and scripts: `agent/tests/test_resume_layout.py`, `test_resume_sections.py`, `test_resume_patterns.py`, `test_levels.py`, `test_resume_contract.py`, `agent/tests/eval/test_resume_eval.py` (`-m eval`), `agent/tests/eval/test_format_invariance.py` (`-m eval`), `agent/tests/golden/resume_<first>_<last>.json` × 4, `agent/scripts/make_resume_variants.py` (two-column / scanned / shuffled variants into `agent/data/samples/resumes/variants/`). Dependencies added to `agent/pyproject.toml`: `pymupdf`, `python-docx`, `rapidfuzz` (coordinate with Roles 1 and 5, who likely add the same), `pytesseract` + `pillow` as the extra `[ocr]`.

### Backend (`backend/src/`), Express 5 + TS, existing routes → controllers → services pattern

| File | Signatures | Purpose |
|---|---|---|
| `routes/resumes.routes.ts` | `router.post('/parse', parseResume)`; P3 `router.get('/:id', getResumeExtraction)` | routes |
| `routes/index.ts` (edit) | `router.use('/resumes', resumesRoutes)` | mount |
| `controllers/resumes.controller.ts` | `export async function parseResume(req: Request, res: Response)` | zod `ParseResumeBody = z.object({ document_id: z.string().uuid(), force: z.boolean().optional() })`, then `res.json(await resumesService.parse(...))` |
| `services/resumes.service.ts` | `parse(documentId: string, opts: { force?: boolean }): Promise<ResumeExtraction>` · `findCached(documentId, promptVersion)` · `saveExtraction(doc, result): Promise<string>` · `findProfileIdByEmail(email): Promise<string \| null>` | cache lookup, agent call, persistence, dedupe, single-flight |
| `services/agent.service.ts` (edit) | `getAgentVersions(): Promise<{ resume: string; levels: string; jd: string }>` (60 s memo, env fallback `RESUME_PROMPT_VERSION`) | knows the current prompt version without calling the LLM |
| `lib/pii.ts` | `maskEmail(s)`, `maskPhone(s)`, `redactExtractionForLog(x)` | logs never contain PII |

No migration from Role 2: we write `extractions` (owned by Role 1) and read `documents` and `candidate_profiles`. The P3 `jobs` table is shared (Scrum Master or Role 1).

### Frontend (`frontend/src/features/resume/`), 4-layer rules from `frontend-arch-init`

| File | Signatures | Purpose |
|---|---|---|
| `service/resume.api.ts` | `uploadResumeAPI(file: File, onProgress?): Promise<{document_id; sha256; cached}>` (multipart to `/documents`, `kind=resume`) · `parseResumeAPI(documentId: string, force = false): Promise<ResumeExtraction>` | pure Axios, returns `response.data` |
| `slice/resume.slice.ts` | state `{ byDocumentId: Record<string, ResumeExtraction>; currentDocumentId: string \| null; status: 'idle'\|'uploading'\|'parsing'\|'done'\|'error'; error: string \| null; highlight: string \| null }`; sync reducers `setResumeStatus`, `setResumeExtraction`, `setResumeError`, `setCurrentResume`, `setHighlight` | no thunks |
| `Hooks/resume.hooks.ts` | `useResumeUpload()` → `{ upload(file), status, error }` (upload then parse) · `useResumeExtraction(documentId)` · `useSkillFingerprint(x)` → 12 radar rows `{code, name, level, bloom, confidence, basis}` · `useSendToProfileBuilder()` → calls Role 3's `createProfileFromResumeAPI` (imported from `features/profile/service`), sets `flow.resume_extraction_id`, navigates to step 3 | all business logic |
| `components/ResumeParsePage.tsx` | page used by the `/resume` route and by step 2 of the `/match` wizard | layout |
| `components/ResumeUploadCard.tsx` | drag-and-drop, PDF/DOCX ≤ 5 MB, "Try a sample" buttons (4 candidates), privacy note | input |
| `components/ResumeParsedView.tsx` | shadcn `Tabs`: Overview · Experience · Projects · Education & certs · Hackathons; `FieldConfidenceBadge` per section | output |
| `components/SkillChips.tsx` | shadcn `Badge`, colored by category, solid/outline/dashed = high/medium/low confidence, tooltip shows evidence | skills |
| `components/SkillFingerprintRadar.tsx` | recharts `RadarChart`, 12 axes in `skill_set_id` order, custom tooltip with basis; `compare` prop overlays up to 4 | the hero visual |
| `components/HowWeGotThisDrawer.tsx` | shadcn `Sheet` with `meta` | observability |
| `components/FormatInvarianceCard.tsx` (P2) | PDF vs DOCX side by side: Jaccard, level MAE, diff list | slide-ready proof |
| `routes/resume.tsx` | thin TanStack file route rendering `ResumeParsePage` | route |
| `store.ts` (edit) | add `resume: resumeReducer` | wiring |
| `lib/categories.ts` (proposed shared) | `CATEGORIES: {code, id, name, colorVar}[]` | one place for names, order and colors |

## 6. API and database details

**`POST /api/resumes/parse`**

```http
POST /api/resumes/parse
Content-Type: application/json

{ "document_id": "4b0c1f0e-6a1d-4f6e-9a55-0f2d2b8d7c11", "force": false }
```

```jsonc
// 200 OK (abridged)
{
  "source_type": "resume", "source_file": "Ananya_Rao.pdf", "company": null, "role": "Software Engineer",
  "document_id": "4b0c1f0e-…", "extraction_id": "9e2d…",            // (proposed) extractions.id
  "existing_profile_id": null,                                         // (proposed) set when the email matches a profile
  "candidate": { "name": "Ananya Rao", "email": "ananya.rao@example.com", "phone": "+919876543210",
                 "links": ["github.com/ananyarao"] },
  "skills": [
    { "skill_name": "Kafka", "category_code": "SYSD", "canonical_id": "kafka", "section": "experience",
      "evidence": "Built a Kafka-based event pipeline in Go, cutting settlement latency by 40%",
      "confidence": "high", "level_hint": 5 },
    { "skill_name": "PostgreSQL", "category_code": "SQL", "canonical_id": "postgresql", "section": "skills",
      "evidence": "Databases: PostgreSQL, Redis", "confidence": "medium", "level_hint": 2 }
  ],
  "education": [ { "degree": "B.Tech CSE", "institution": "…", "year": "2026", "score": "8.7 CGPA" } ],
  "experience": [ { "title": "SDE Intern", "org": "Acme Payments", "kind": "internship", "start": "2025-05", "end": "2025-07",
                    "highlights": ["…"], "skills": ["Go", "Kafka"] } ],
  "projects": [ { "name": "Raft KV store", "description": "…", "skills": ["Go", "Raft"], "link": "github.com/…" } ],
  "hackathons": [ { "name": "Smart India Hackathon", "result": "Finalist", "year": "2024" } ],
  "certifications": [],
  "category_levels": { "COD": 6, "DSA": 7, "APTI": 5, "COMM": 4, "OOD": 5, "AI": 2, "SQL": 3,
                       "SYSD": 6, "CLOUD": 5, "SWE": 6, "NETW": 5, "OS": 6 },
  "category_level_details": {                                          // (proposed)
    "SYSD": { "level": 6, "bloom": "AS", "confidence": "high", "points": 8.25, "capped_by": null,
              "basis": "1 internship (Kafka pipeline, -40% latency) + 2 projects (Raft KV store, rate limiter) · designed → 6 AS",
              "evidence_refs": ["experience[0]", "projects[0]", "projects[1]"] },
    "AI":   { "level": 2, "bloom": "CU", "confidence": "low", "points": 0.5, "capped_by": "G-AP",
              "basis": "listed only (PyTorch) → 2 CU", "evidence_refs": ["skills"] }
    // … all 12
  },
  "field_confidence": { "candidate": "high", "education": "high", "experience": "high", "projects": "high",
                        "hackathons": "medium", "certifications": "high" },
  "meta": { "schema_version": "1.0", "prompt_version": "resume-v1", "levels_version": "lv-1.0",
            "model": "openrouter:nvidia/nemotron-3.5-lightning:free", "doc_sha256": "…", "latency_ms": 14200,
            "cached": false, "llm_calls": 3, "layout": "two_column", "ocr_used": false,
            "sections_found": ["header","summary","education","experience","projects","skills","hackathons"],
            "grounding_rate": 0.96, "pii_redacted": true, "warnings": [] }
}
```

| Status | When | Body |
|---|---|---|
| 400 | body fails zod | `{ "error": "document_id must be a uuid" }` |
| 404 | no such document | `{ "error": "Document not found" }` |
| 409 | `documents.kind` is `jd` | `{ "error": "Document is a JD, not a resume" }` |
| 422 | unreadable, empty, encrypted, or scanned without OCR | `{ "error": "This PDF looks scanned and OCR is not available. Upload the DOCX or a text PDF." }` |
| 502 / 504 | agent or all LLM providers failed / timed out | `{ "error": "Resume parser is busy, try again in a minute" }` |

**Agent `POST /extract/resume`** (request shape shared with Role 1's `/extract/jd`, proposed in section 12):

```json
{ "document_id": "4b0c…", "file_name": "Ananya_Rao.pdf", "mime": "application/pdf", "sha256": "…",
  "content_b64": "JVBERi0xLjcK…", "options": { "level_review": false } }
```

**Database writes and reads**

| Table | Operation | Detail |
|---|---|---|
| `documents` | read | `id, kind, file_name, sha256, storage_path, mime` |
| Storage `talent-docs` | read | `resume/<sha256>.<ext>` → bytes for the agent |
| `extractions` | upsert on `(document_id, prompt_version)` | `source_type='resume'`, `prompt_version='resume-v1'`, `model`, `result` (the full object), `latency_ms`. `force=true` → `on conflict do update` |
| `candidate_profiles` | read | `select id where lower(email) = lower($1)` for `existing_profile_id` (Role 3 owns the table and its unique email) |

## 7. Scalability and reliability

**Caching, three layers**
1. **Backend row cache:** `(document_id, prompt_version)` in `extractions`, and `documents.sha256` is unique, so re-uploading the same file is a hit as well. Hit latency is one DB read.
2. **Levels refresh without the LLM:** if a cached row has an older `meta.levels_version`, the backend calls `POST /levels/infer` (P3) and updates the row. A level-model change never costs an LLM call.
3. **Agent dev cache** (`agent/.cache/resume/<sha256(section_text)>-<prompt_version>.json`, off in production, on for eval): eval loops do not burn free-tier quota. It is **disabled for the format-invariance test**, so that test stays honest.

**Single-flight:** `resumes.service.ts` keeps `Map<document_id, Promise>`, so a double click or two tabs trigger one agent call.

**Rate limits:** `asyncio.Semaphore(2)` per provider inside the agent; on HTTP 429, exponential backoff with jitter (0.5 s, 1 s, 2 s), then the next provider in `EXTRACT_PROVIDERS`. Overall agent budget is 120 s, below the backend's 300 s timeout.

**Async path (P3):** same route, `Prefer: respond-async` → insert `jobs(id, kind='resume_parse', input, status, result, error)` → `202 {job_id}`. A worker loop in the backend (or a second agent worker) processes jobs. The frontend hook polls `GET /api/jobs/:id` every 1.5 s and then dispatches the same `setResumeExtraction`. No component changes.

**Horizontal scale:** the agent is stateless (contract 1), so N uvicorn workers or containers work behind the backend; throughput is bounded by LLM quota, not CPU (layout + regex + levels take < 300 ms per resume). Cost per resume is about 3 LLM calls of a few thousand tokens each; we measure the exact tokens in P3 rather than guessing.

**Failure modes and what the user sees**

| Failure | Behaviour | UI |
|---|---|---|
| One section's LLM call fails on every provider | `keyword_fallback()` for that section (taxonomy scan, confidence `low`), warning `projects_llm_fallback` | amber banner "Projects parsed in fallback mode, check the skills" |
| All providers down | `use_llm=False` path: regex + segmentation + skills section + taxonomy scan + levels | banner "Offline mode: basic parse"; still a valid object and a fingerprint |
| LLM JSON invalid | one repair retry with the validation error, then the next provider (contract rule 1) | nothing (latency only) |
| Ungrounded evidence | mention dropped, counted | drawer shows the grounding rate |
| Headings missing | LLM boundary segmentation | drawer: "sections inferred" + `field_confidence` medium |
| Scanned PDF, no OCR | 422 with advice | toast with the message, upload card stays |
| Name or email not found | null + `field_confidence.candidate = "low"` | Role 3's form highlights the field as required |
| Agent unreachable | 502 | toast "Parser offline, try a sample" (samples are cached rows) |

**PII**
- Email and phone are stored (Role 3 needs email as the profile key), only in `extractions.result` and later `candidate_profiles`. RLS is on with service-role access only (contract 5).
- They are **never sent to an LLM** (`redact_pii`) and **never logged**: one log line per call, `resume.parse doc=4b0c… email=a***@example.com cached=false 14.2s 3 calls`.
- Upload card note: "Your resume is read by an AI model to extract skills. Contact details are removed before that step. The file and results are stored in this project's database for your profile." A delete route is listed as P3 in section 12.

## 8. Testing and evaluation

**Unit tests (`pytest`, no network)**

| Test file | Covers |
|---|---|
| `test_resume_layout.py` | gutter detection on synthetic blocks (single, two-column, sidebar, full-width header); running-line removal; DOCX body order with a layout table and a text box (fixture built with python-docx in the test) |
| `test_resume_sections.py` | 40 heading variants → canonical section, including typos ("Experiance"), caps, trailing colon; non-headings ("Python, Java") rejected |
| `test_resume_patterns.py` | Indian and E.164 phones, emails in a header, date ranges ("May'25 – Present"), CGPA/percent, ranks; `redact_pii` leaves no email or phone |
| `test_levels.py` | each unit kind, depth cap, every gate (keyword-stuffed skills list stays ≤ 2; certs only ≤ 3; one internship reaches 5; no leadership caps at 6; no creation caps at 8), "no evidence" → `1/low/"no evidence"`, all 12 codes present, monotonicity (adding a unit never lowers a level), golden relational invariants of 3.8 run on the golden extractions |
| `test_resume_contract.py` | `/extract/resume` with `use_llm=False` on a fixture → validates against `ResumeExtraction`; JSON Schema export unchanged (snapshot) |

**Golden-set eval (`pytest -m eval`, uses the real LLM with the dev cache)**

Golden files `agent/tests/golden/resume_<name>.json` are hand-labelled by reading each resume (about 20 minutes each, done in P1 hour 1, reviewed by a teammate).

| Metric | How | P1 target | P2 target |
|---|---|---|---|
| Contact exact match | name, email, phone | 100% | 100% |
| Education / experience / project row F1 | rows matched by fuzzy org/name ≥ 85; fields compared after normalization | ≥ 0.8 | ≥ 0.9 |
| Date accuracy | `start`/`end` exact to the month | ≥ 0.8 | ≥ 0.9 |
| Skill precision / recall / F1 | over `canonical_id` | P ≥ 0.85, R ≥ 0.75 | P ≥ 0.9, R ≥ 0.85 |
| Category accuracy | among matched skills | ≥ 0.85 | ≥ 0.9 |
| Level MAE / within ±1 | 48 cells vs hand labels; also leave-one-candidate-out | MAE ≤ 1.0 | MAE ≤ 0.75, ±1 ≥ 90% |
| Relational invariants | section 3.8 | all pass | all pass |
| Grounding rate | grounded / total mentions | ≥ 0.9 | ≥ 0.95 |
| Latency | cold p50, cached p50 | measured | measured |

**Format-invariance test (`tests/eval/test_format_invariance.py`, cache off):** for each of the 4 candidates, parse the PDF and the DOCX, then the generated variants (two-column re-layout, scanned at 200 dpi, shuffled section order). Assert skill Jaccard ≥ 0.85, all contact fields equal, the same number of experience and project rows, level MAE ≤ 0.35 and a maximum per-category difference ≤ 1. Also run the same file 3 times and report level stability (the levels are deterministic given the extraction, so any variance comes only from the LLM extraction step, which is a useful honest point).

**Slide content (one slide, "Resume parsing, measured"):** a 4 × 2 table of PDF vs DOCX (Jaccard, level MAE), the skill P/R/F1 line, level MAE vs hand labels with LOO, grounding rate, "0 PII sent to LLMs", and the 4 overlaid fingerprints.

## 9. Demo script (about 4 minutes of the 45)

1. **Set-up line (15 s):** "Resumes are the messiest input in this tool. No two share a layout, and the number we produce here, the level per skill category, is what Talent Check scores against. So it has to be right and it has to explain itself."
2. **Live upload (45 s):** drag Ananya's **two-column PDF** onto the upload card. While it parses, point at the privacy note. The parsed view appears: sections, internship, projects, chips colored by category.
3. **The wow (60 s):** the skill fingerprint radar animates in. Hover SYSD: "6, Analysis & Synthesis, high confidence: one internship building a Kafka pipeline with a 40% latency cut, plus two projects." Click the axis and the source lines light up in the resume view. "Every number traces back to a line in the resume. The LLM reads the text, but the level comes from a versioned rule on the Bloom rubric, so it is explainable and testable."
4. **Visibly different (30 s):** toggle Compare and overlay Karthik, Priya and Rohan. Four different shapes: Ananya spikes on SYSD/OS/DSA, Karthik on SQL/AI, Priya is smaller but strong on COMM and SQL basics, Rohan is wide everywhere.
5. **Format-invariant (30 s):** drop Ananya's DOCX. The radar is the same. Open the Format Invariance card: "PDF vs DOCX across all four candidates: skill overlap 0.9x, average level difference 0.x."
6. **Hand-off (20 s):** click "Send to Profile Builder"; Role 3's form opens pre-filled, sliders already set from these levels.
7. **Challenge we faced (40 s, adapt to what really happens):** "Our first version read two-column PDFs straight across the page. Ananya's Skills sidebar got woven into her internship bullets, so Kafka showed up as education and her SYSD level dropped by two. We fixed it with gutter detection on the text-block layout, and then wrote the format-invariance test so it can never silently come back. That test now runs on every change."

Backup: every sample is pre-computed (cache hits), and the "Try a sample" buttons work even if the LLM providers are down.

## 10. Dependencies, risks and mitigations

| Dependency | From | Needed by | Fallback |
|---|---|---|---|
| `contract.py` with `ResumeExtraction` | P0 (all) | hour 1 | I write the resume models myself and Role 1 reviews them |
| `documents.py` exposing blocks with bbox and font info | Role 1 | P1 start | `resume/layout.py` calls PyMuPDF / python-docx directly (same libraries), merged later |
| `llm.py` structured call with fallback | Role 1 | P1 extraction | thin shim over `openradix_agents.providers.invoke` + `parsing.extract_json` + Pydantic validate |
| `taxonomy.py` `canonicalize()` | Role 5 (seeded by Role 1) | P1 merge | local alias dict of ~80 common skills in `merge.py`, deleted when taxonomy lands |
| `POST /api/documents` upload | Role 1 | P1 frontend | P0 stub inserts a `documents` row from a sample file |
| `POST /api/profiles/from-resume` | Role 3 | P1 button | button navigates with `resume_extraction_id` in the flow slice; Role 3 reads it |
| Sample resumes in `agent/data/samples/resumes/` | Scrum Master | hour 1 | none; this blocks the golden labels |

| Risk | Likelihood | Mitigation |
|---|---|---|
| Free-tier rate limits during the demo | high | pre-compute all 8 files; cache; provider fallback; offline mode |
| Levels look implausible to judges (e.g. Priya scores high on SYSD) | medium | relational invariants as tests; gates; LOO-tuned config; basis visible on hover |
| LLM category drift (Kafka → CLOUD in one run, SYSD in another) | medium | category comes from `taxonomy.py` when the skill is known; LLM category only for unknown skills |
| Hallucinated skills | medium | evidence required + line-level grounding check; ungrounded mentions dropped and counted |
| Overfitting the level model to 4 resumes | medium | global weights only, LOO MAE reported, frozen version |
| Two-column detection misfires on a single-column resume with a right-aligned date column | medium | gutter must be in the middle 60% of the page and ≥ 8 pt; date columns are narrow and right-aligned, so they fail the "≥ 6 narrow blocks on both sides" test; unit test covers it |
| OCR dependency (tesseract binary) missing on the demo machine | medium | optional; scanned variant is pre-computed; 422 path is friendly |
| Time | high | P2/P3 items are independent; the checklist order keeps the DoD path first |

## 11. Task checklist (order matters; estimates in hours)

**P0, 27 Oct (2 h)**
- [ ] Agree on `ResumeExtraction` and the proposed fields (section 12) with Role 1 and the Scrum Master; add them to `contract.py` (0.5)
- [ ] Skeleton golden JSON for Ananya and Priya, validated by the model (0.5)
- [ ] Stub `/extract/resume` in `api.py` returning golden JSON (0.25)
- [ ] Backend `resumes.routes/controller/service` stub writing `extractions`, returning `extraction_id` (0.5)
- [ ] Frontend `features/resume` skeleton + slice in `store.ts` (0.25)

**P1, 27 Oct (≈ 10 h)**
- [ ] Read the 4 resumes; finish the 4 golden files; replace the provisional table in 3.8 (1.25)
- [ ] `patterns.py` + tests (0.75)
- [ ] `layout.py`: PDF reading order, gutter detection, running lines, normalization + tests (1.5)
- [ ] `layout.py`: DOCX tables, text boxes, headers (if `documents.py` does not cover them) (0.75)
- [ ] `sections.py` lexicon + fuzzy + tests (0.75)
- [ ] `prompts.py` + `llm_models.py` + `extract.py` (3 calls, skills parser, keyword fallback) (2.0)
- [ ] `merge.py` canonicalize + grounding + confidence (1.0)
- [ ] `levels.py` v1 + gate tests + relational invariants (1.5)
- [ ] Real backend route: cache, single-flight, dedupe by email, PII-safe log (0.75)
- [ ] Frontend: upload card, parsed view, chips, "Send to Profile Builder"; Google SWE × Ananya end to end with Roles 1/3/4 (2.0)

**P2, 28 Oct morning (≈ 6 h)**
- [ ] Eval harness `pytest -m eval` + JSON output; tune `LEVELS_CONFIG` with LOO; freeze `lv-1.0` (1.5)
- [ ] Skill fingerprint radar + basis tooltip + evidence click-through (1.25)
- [ ] "How we got this" drawer (0.5)
- [ ] `make_resume_variants.py` + format-invariance test + Format Invariance card (1.5)
- [ ] OCR fallback behind the `[ocr]` extra (0.5)
- [ ] LLM rubric review (±1), keep it only if MAE improves (0.75)
- [ ] Compare overlay of 4 fingerprints; pre-compute all 8 files (0.5)
- [ ] Slide numbers + rehearse the demo section (0.5)

**P3, 28 Oct afternoon (≈ 3 h, or slide only)**
- [ ] `POST /levels/infer` + backend levels refresh on version change (0.75)
- [ ] Jobs path (`Prefer: respond-async`, polling hook) with the shared `jobs` table (1.25)
- [ ] `resume/bulk.py` + measured throughput, tokens and latency for the scale slide (1.0)

## 12. Proposed contract changes

All are **additive and optional**, so they do not break the brief's shape. They need the Scrum Master's and the affected owners' OK before they go into `00-shared-contract.md` and `contract.py`.

| # | Change | Why | Affects |
|---|---|---|---|
| 1 | `ResumeExtraction.category_level_details: {<code>: {level, bloom, confidence, basis, points, capped_by, evidence_refs[]}}` for all 12 codes, while `category_levels` stays the plain int map (always all 12 codes for resumes) | Role 3's `skill_levels` needs `confidence` and `basis` per category (contract 3.4 example), and the int map cannot carry them | Role 3 (copies it), frontend radar |
| 2 | `ResumeExtraction.extraction_id` (= `extractions.id`) and `existing_profile_id` (nullable), filled by the backend | the frontend must pass `resume_extraction_id` to `POST /api/profiles/from-resume`; dedupe by email lets Role 3 offer "update your existing profile" | Role 3, frontend |
| 3 | Extend the `Skill.section` enum with `hackathons, achievements, coursework, positions, publications, summary` | resume evidence lives in those sections, and the confidence rule depends on it. If rejected: map coursework → `education` and the rest → `other`, keeping the detail internal | Role 5 (reads `section`), Role 1 (enum in `contract.py`) |
| 4 | `experience[].kind: internship \| job \| freelance` | Role 3 maps experience to the brief's `internships` field | Role 3 |
| 5 | Additive `meta` fields: `levels_version`, `llm_calls`, `layout`, `ocr_used`, `sections_found`, `grounding_rate`, `pii_redacted`, `models_used` | observability drawer (contract rule 8) and levels refresh without an LLM call | Role 1 (shared `meta` model) |
| 6 | Shared agent request body for `/extract/jd` and `/extract/resume`: `{document_id, file_name, mime, sha256, content_b64, options}` (P3 may add `signed_url`) | the contract does not specify the agent request; one shape means one helper in `agent.service.ts` | Role 1 |
| 7 | `documents.py` public API returns blocks (`text, page, bbox, font_size, bold`) and `ocr_used`, not only clean text | column detection and heading detection need geometry and font information; JDs benefit too | Role 1 |
| 8 | New agent endpoint `POST /levels/infer` (deterministic, no LLM; input: a `ResumeExtraction`-shaped evidence object, output: `category_levels` + `category_level_details`) and, if Role 3 wants it, backend `POST /api/profiles/level-hints` | re-score cached rows when `levels_version` changes; live slider hints when a candidate adds a hackathon or certification in Profile Builder | Role 3 (optional), backend |
| 9 | `POST /api/resumes/parse` accepts optional `force: boolean` | re-run after a prompt fix during the hackathon without deleting rows | none |
| 10 | Shared `frontend/src/lib/categories.ts` (code, id, name, color token) and 12 category color tokens in `styles/tokens.scss` | chips, the radar (Role 2) and the Talent Check chart (Role 4) use the same colors and order | Role 4, Role 5 frontend |
| 11 | (P3) `DELETE /api/resumes/:document_id`, which removes the stored file, extraction rows and unlinks the profile | completes the privacy story ("delete anytime") | Role 1 (documents), Role 3 |
