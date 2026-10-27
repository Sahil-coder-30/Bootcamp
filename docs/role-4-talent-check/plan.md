# Role 4: Talent Check, implementation plan

_Owner: Aryan Singh (Role 4) <aryansingh9c@gmail.com>. Written 2026-10-27, builds on [00-shared-contract.md](../00-shared-contract.md) (locked). Deadline: Wed 28 Oct 2026._

Every company number in this plan was read from the live Supabase project (`brpacqbtxufuxhpgoohu`) on 27 Oct with read-only queries. Candidate levels for the 4 samples are **assumptions** until Roles 2 and 3 produce real `skill_levels`. They are marked as such wherever they appear.

---

## 1. Mission and what "stand out" means for this role

The brief asks for "one button that compares a candidate's profile against a company's expected bar across all 12 RADIX skillsets, and shows the gap". For this role, standing out means:

- **A definition of "ready" we can defend in one sentence:** *"Readiness is the share of the company's skill ladder you have already climbed. Every missing level costs the same number of points, and you are Ready at 80 or more with no category more than two levels short."* Judges can check it by hand, and it is versioned (`tc-1.0`).
- **Gaps you can act on, not just a number:** each gap row lists the exact RADIX topics for the missing levels, and a "fastest path to Ready" study plan says how many level steps it takes and roughly how many hours.
- **It works live:** a what-if slider recomputes in under 1 ms in the browser, with the same answer as Python. Shared test vectors prove it.
- **It scales:** "Which companies am I ready for?" ranks the candidate against all 115 companies in RADIX's data. Vectorized numpy scores 10,000 companies in about 1.3 ms.
- **It shows the data mindset:** we found and handled real data-quality problems in the company bar (section 4.5), and that becomes our "challenge we faced" story.

## 2. Inputs, outputs and hand-offs

| Direction | Object | Contract ref | From / to |
|---|---|---|---|
| In | `CandidateProfile.skill_levels` (all 12 codes, `level` 1-10, `confidence`, `source`, `basis`) plus `id`, `name`, `version` | [3.4](../00-shared-contract.md#34-candidateprofile-role-3-output) | Role 3, read from `candidate_profiles` |
| In | Company bar: 12 rows of `required_level` | [5](../00-shared-contract.md#5-supabase-tables-new), view `v_company_skill_bar` | Supabase, or the JSON snapshot when offline |
| In | Topic ladder: `skill_set_topics` level 1-10 per skill | [5](../00-shared-contract.md#5-supabase-tables-new) | Supabase (plus the SQL fallback in 4.4) |
| Out | `TalentCheckResult` | [3.5](../00-shared-contract.md#35-talentcheckresult-role-4-output) | Frontend `talentCheck` and `flow` step 4; stored in `talent_checks` |
| Out | Readiness matrix (profiles x companies) | [4](../00-shared-contract.md#4-api-surface) `GET /api/talent-check/matrix` | `flow` "Compare candidates" heatmap |

**Hand-off rules.** Role 4 never writes `skill_levels`. A missing code is treated as `{level: 1, confidence: "low", basis: "no evidence"}` and adds a warning. That is the contract's own default (3.4), so we never fail on a partial profile. `category_code` is `skill_set_master.short_name`, so no mapping layer is needed. Role 5 reuses our `next_topics` lookup for `missing_skills[].learn_next` (same backend helper, `getTopicLadder()`).

## 3. The scoring model

### 3.1 Definition of ready

For the candidate level `c_i` and the company's required level `r_i` in each category `i`, both on 1-10:

```
shortfall_i = max(0, r_i - c_i)
covered_i   = min(c_i, r_i) - 1           # rungs climbed above the floor (level 1 = "no evidence")
needed_i    = r_i - 1                     # rungs the company expects above the floor
weight_i    = needed_i / sum(needed)      # contract field "weight"; rows with r_i = 1 have weight 0

readiness   = 100 * sum(covered) / sum(needed)        # = 100 * (1 - sum(shortfall) / sum(needed))
readiness_score = floor(readiness + 0.5)              # integer 0..100, round half up (never banker's rounding)
                                                      # if sum(needed) == 0, readiness = 100
blocking_i  = shortfall_i >= 3                        # more than two levels short = a full Bloom band away

verdict = "ready"   if readiness_score >= 80 and no blocking row
          "almost"  if readiness_score >= 60          (includes >= 80 held back by a blocking row)
          "not_yet" otherwise
```

**Why these choices:**

- **Weighting by `r - 1` (the requirement above the floor).** The weighted average of `covered/needed` with weight `needed` simplifies to "levels covered / levels needed". So **every missing level costs the same number of points**: 100/84 = 1.19 at Google, 100/82 = 1.22 at Microsoft, 100/56 = 1.79 at Oracle FSS. A category the company sets a high bar on has more rungs, so it carries more of the score (the contract's "skills with a higher bar count more"). The cost of one level never depends on which category it is in, which makes it easy to explain on stage.
- **Floor at level 1.** The scale has no 0, and level 1 is the contract's "no evidence" default. A blank resume should score 0, not 12 to 18 points of free credit.
- **Capped at the bar.** Over-qualification in one category never hides a gap in another.
- **Blocking rule (shortfall of 3 or more).** Hiring loops are non-compensatory: one hole a full Bloom band deep fails an interview round, whatever the average says. The score stays a smooth, explainable average. The verdict carries the gate, and the UI marks blocking rows in red. Rows with `r >= 7` (EV or CR band) are also tagged `critical` in the UI copy ("Google evaluates this at EV level").
- **Thresholds 80/60.** At 80 the candidate has climbed four fifths of the ladder, and no row is a full band short. For Google that means 16 or fewer missing levels in total. The thresholds sit in `constants.py`, and changing them bumps `scoring_version`.

**Stated assumption:** we treat the Bloom ladder as equal-interval for scoring. Effort is not linear (EV and CR levels take longer to reach), so non-linearity lives in the study-plan **effort estimate** (3.6), not in the score. That keeps the score honest and the plan realistic.

### 3.2 Worked example: Ananya Rao x Google LLC (company_id 4)

Google's real bar (`company_skill_levels`) is `COD 8, DSA 9, APTI 9, COMM 7, OOD 8, AI 7, SQL 8, SYSD 4, CLOUD 9, SWE 9, NETW 9, OS 9`. sum(needed) = 84. Ananya's levels are assumed (a systems-leaning profile).

| Code | required (band) | candidate (band) | shortfall | weight | points lost | flag |
|---|---|---|---|---|---|---|
| COD | 8 (EV) | 7 (EV) | 1 | 0.083 | 1.2 | |
| DSA | 9 (CR) | 7 (EV) | 2 | 0.095 | 2.4 | |
| APTI | 9 (CR) | 6 (AS) | 3 | 0.095 | 3.6 | blocking |
| COMM | 7 (EV) | 5 (AS) | 2 | 0.071 | 2.4 | |
| OOD | 8 (EV) | 6 (AS) | 2 | 0.083 | 2.4 | |
| AI | 7 (EV) | 4 (AP) | 3 | 0.071 | 3.6 | blocking |
| SQL | 8 (EV) | 4 (AP) | 4 | 0.083 | 4.8 | blocking |
| SYSD | 4 (AP) | 6 (AS) | 0 | 0.036 | 0 | exceeds bar |
| CLOUD | 9 (CR) | 5 (AS) | 4 | 0.095 | 4.8 | blocking |
| SWE | 9 (CR) | 6 (AS) | 3 | 0.095 | 3.6 | blocking |
| NETW | 9 (CR) | 6 (AS) | 3 | 0.095 | 3.6 | blocking |
| OS | 9 (CR) | 7 (EV) | 2 | 0.095 | 2.4 | |

Covered = 55 of 84, so readiness = 65.48, `readiness_score = 65`, verdict **almost** (the 6 blocking rows would hold her back even at 80 or more). `top_gaps = ["CLOUD", "SQL", "APTI"]`, ordered by shortfall desc, then required_level desc, then skill_set_id asc. Closing those three alone would give 79. The fastest path to Ready is 12 level steps, about 190 h (8 steps to clear every blocking row, which gives 75, then the 4 cheapest steps, which give 67/84 = 79.8, rounded to 80).

The generated explanation (template, no LLM):

> "Ananya covers 55 of the 84 skill levels Google LLC expects above the baseline (readiness 65, Almost). The biggest gaps are DevOps and Cloud (5 vs 9), SQL and Design (4 vs 8) and Aptitude and Problem Solving (6 vs 9). 6 categories are more than two levels short, which blocks a Ready verdict. 1 of 12 categories already meets the bar. The fastest path to Ready is 12 level steps, starting with the 6 categories that are more than two levels short."

### 3.3 Alternatives considered

The 3 real company bars are used below. Google has the highest mean bar of the three (8.0), Microsoft is at 7.83 and Oracle FSS at 5.67. Google and Microsoft sit in the 96th and 95th percentile of the 115 companies, Oracle FSS in the 61st. The assumed candidate levels, in COD DSA APTI COMM OOD AI SQL SYSD CLOUD SWE NETW OS order:

| Candidate (assumed) | levels |
|---|---|
| Ananya (systems/SWE) | 7 7 6 5 6 4 4 6 5 6 6 7 |
| Karthik (data) | 5 4 7 6 3 6 7 3 3 4 2 2 |
| Priya (entry-level support) | 4 3 5 6 3 2 5 2 3 4 4 4 |
| Rohan (all-rounder) | 8 8 7 7 7 6 6 7 6 7 6 6 |

| Candidate x company | F1 ratio, w=r | F2 squared ratio | F3 unweighted ratio | F4 % categories met | **F5 chosen** | F5 verdict |
|---|---|---|---|---|---|---|
| Ananya x Google | 70 | 50 | 71 | 8 | **65** | almost |
| Ananya x Microsoft | 72 | 54 | 73 | 8 | **68** | almost |
| Ananya x Oracle FSS | 91 | 85 | 92 | 67 | **89** | ready |
| Karthik x Google | 54 | 35 | 57 | 0 | **48** | not_yet |
| Karthik x Microsoft | 55 | 36 | 56 | 0 | **49** | not_yet |
| Karthik x Oracle FSS | 74 | 60 | 73 | 42 | **68** | almost |
| Priya x Google | 47 | 24 | 48 | 0 | **39** | not_yet |
| Priya x Microsoft | 48 | 26 | 49 | 0 | **40** | not_yet |
| Priya x Oracle FSS | 66 | 48 | 66 | 8 | **59** | not_yet |
| Rohan x Google | 81 | 68 | 83 | 25 | **79** | almost |
| Rohan x Microsoft | 84 | 71 | 85 | 17 | **82** | ready |
| Rohan x Oracle FSS | 100 | 100 | 100 | 100 | **100** | ready |

- **F1** `100*sum(min(c,r))/sum(r)` (the earlier context note's formula). It is close to F5 and also explainable. It is rejected because it gives free credit for level 1: a candidate with no evidence anywhere scores 12.5 at Google and 17.6 at Oracle. It also compresses the spread.
- **F2** `sum(w*(min(c,r)/r)^2)` is a convex penalty that punishes deep gaps. It is rejected because it double-penalizes what the blocking gate already handles, has no "points per level" story, and makes the strongest candidate in the pack (Rohan) look weak at Google (68). A *concave* shortfall penalty, such as `sqrt(shortfall)`, goes the wrong way: it forgives deep holes.
- **F3** `mean(min(c/r,1))`. It is rejected as perverse: one missing level on a required-2 skill costs 4.2 points, while one missing level on a required-9 skill costs 0.9.
- **F4** `% of categories at or above the bar` (the brief's "threshold" option). It is rejected because 7 of 12 cells score 0 to 8, which breaks "visibly different results". It is kept as a secondary stat ("1 of 12 categories met").
- **F5 is chosen.** It gives the widest meaningful spread (39 to 100), every candidate's ranking across the 3 companies matches the brief's stated fits (each candidate scores highest at Oracle FSS, the lowest bar, and Rohan leads everywhere), and it comes with the one-sentence explanation.

### 3.4 Guaranteed properties (each one is a hypothesis test, section 9)

1. **Bounded:** `0 <= readiness_score <= 100` for any levels in 1..10.
2. **Monotonic:** raising any `c_i` never lowers the score and never worsens the verdict.
3. **No reward for over-qualification:** `c_i > r_i` gives the same result as `c_i = r_i`.
4. **Extremes:** the score is 100 if and only if every `c_i >= r_i`, and 0 if and only if every `c_i = 1` (whenever some `r_i > 1`).
5. **Linear marginal value:** each level step below the bar is worth exactly `100/sum(needed)` points (before rounding).
6. **Deterministic and pure:** integer inputs, no I/O, no clock and no randomness. The same input always gives the same JSON byte for byte (sorted keys).
7. **Shape:** always 12 rows in `skill_set_id` order, and `gap == (shortfall > 0)`.
8. **Versioned:** `scoring_version = "tc-1.0"`. Any change to the formula, thresholds, confidence deltas or effort table bumps it, and the golden fixtures are pinned per version.
9. **Verdict consistency:** the verdict is computed from the rounded integer, so the UI never shows "80, Almost" without a blocking row to explain it.

### 3.5 Confidence-aware range (P2)

Every `skill_levels` entry has a confidence. The uncertainty `u` is 0 for `high` or `source: assessed`, 1 for `medium` and 2 for `low`. The range runs the same formula on `clamp(c - u, 1, 10)` (pessimistic) and `clamp(c + u, 1, 10)` (optimistic). For example, if Ananya's AI is `low` and her COMM, SQL and CLOUD are `medium`, Google shows **65 (range 60-71)**. A "no evidence" category (level 1, low) can only move up, to 3, which is the honest reading: we don't know. When the verdict differs across the range, the UI says "Verdict could change: confirm AI Native Engineering and DevOps and Cloud on your profile", and deep-links to Role 3's slider. The point estimate is what gets stored and ranked. The range is extra context.

### 3.6 next_topics and study plan

- **`next_topics` (P1):** for each gap row, one entry per level from `candidate_level + 1` to `required_level`, each `{level, topics}`, where `topics` is the level's topic rows joined with `"; "`. For Ananya's SQL row (4 to 8), level 5 is "Database normalization (1NF-3NF); ER diagram understanding; Foreign keys and relationships; Stored procedures basics". Rows without a gap get `[]`.
- **Study plan (P2), called "fastest path to Ready":** a greedy pass over level steps. (1) Raise every blocking row to `r - 2` first, because the verdict needs it. (2) Then add the cheapest remaining steps until the score reaches 80. Cost is the effort hours of the target level's band: **CU 4 h, AP 8 h, AS 12 h, EV 20 h, CR 30 h per level**. These are rough, labelled "estimate", and kept in `constants.py`. Ties go to the higher weight first. Output: `[{category_code, from, to, hours, topics}]` with totals, for example "12 steps, about 190 h, about 6 weeks at 30 h/week" for Ananya x Google.

### 3.7 Explanations

`explain.py` builds the paragraph from fixed templates: covered/needed, verdict, the top 3 gaps with levels, the blocking count, the met count, the fastest-path step count and the range note when one applies. It is deterministic and testable, and costs nothing. **Optional P3:** a "coaching tone" button sends the finished result (numbers included) to `talent_match.llm` and asks for a friendlier rewrite. The number never comes from the LLM (contract rule 6.3). If the LLM fails, the template text stays.

## 4. Company bar data

### 4.1 What is actually in the DB (27 Oct)

| Fact | Value |
|---|---|
| `company_skill_levels` | 1,380 rows = 115 companies x 12, levels 1..10, mean 5.43 |
| `proficiency_levels` | 10 rows, `proficiency_level_id` 1..10 = level, codes CU CU AP AP AS AS EV EV CR CR |
| `required_proficiency_level_id` | maps the **raw** staging Bloom code to the lowest id with that code (CR to 9, EV to 7, AS to 5, AP to 3) |
| Raw Bloom vs level band | **698 of 1,380 rows (51%) disagree**, in all 115 companies. Example: Google COD is "8-CR" (8 is EV), SYSD "4-AS" (4 is AP) |
| Companies without a bar | 102 ZS Associates (a duplicate of id 33, which has a bar), 1001 Seagate, 1002 Ather Energy |
| `staging_company_skill_levels` | 117 rows, 116 names; `id` equals `company_id` for our 3 (4, 24, 78), with names like "Google LLC (Subsidiary of Alphabet Inc.)" and "Oracle Financial Services Software Limited" |
| SQL topics | `skill_set_topics` has no rows for id 7 because `staging_skill_topics` says "SQL & Design" and the trigger expected "SQL and Design" (`error_message: Skill area not found`). The 10 staging rows exist, and one has mojibake ("1NFÃ¢â‚¬â€œ3NF") |

### 4.2 The view (migration `backend/supabase/migrations/20261027_04_talent_check.sql`)

```sql
create or replace view public.v_company_skill_bar
with (security_invoker = true) as
select distinct on (csl.company_id, csl.skill_set_id)
  csl.company_id,
  c.name                        as company_name,
  csl.skill_set_id,
  sm.short_name                 as category_code,
  sm.skill_set_name,
  csl.required_level,
  band.proficiency_code         as bloom_code,      -- derived from the level (source of truth)
  raw.proficiency_code          as raw_bloom_code,  -- as typed in staging, provenance only
  (band.proficiency_code is distinct from raw.proficiency_code) as bloom_mismatch
from public.company_skill_levels csl
join public.companies          c    on c.company_id = csl.company_id
join public.skill_set_master   sm   on sm.skill_set_id = csl.skill_set_id
join public.proficiency_levels band on band.proficiency_level_id = csl.required_level
left join public.proficiency_levels raw on raw.proficiency_level_id = csl.required_proficiency_level_id
order by csl.company_id, csl.skill_set_id, csl.created_at desc;   -- dedupe if Level 5 re-inserted
```

Decision: **the number is the truth, and the Bloom label is derived from it.** We score on `required_level`, and the candidate's band comes from the same rubric, so the comparison must use the same banding. The raw code stays visible in the "how this was computed" drawer.

### 4.3 Snapshot export (`agent/data/snapshots/talent_check_company_skillsets.json`)

`python -m talent_match.talent_check.export_snapshot` calls Supabase **PostgREST over HTTPS** (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `agent/.env`), not psycopg2 on port 5432, which college networks often block. It reads `v_company_skill_bar`, `v_skill_topics`, and the latest `processed = true` staging row per company id for raw provenance. Shape:

```jsonc
{
  "schema_version": "1.0", "generated_at": "2026-10-27T14:00:00Z",
  "source": "supabase:v_company_skill_bar", "scoring_categories": ["COD","DSA","APTI","COMM","OOD","AI","SQL","SYSD","CLOUD","SWE","NETW","OS"],
  "in_scope_company_ids": [4, 78, 24],
  "companies": [ {                                   // full detail for the 3 brief companies
    "company_id": 4, "company_name": "Google LLC (Subsidiary of Alphabet Inc.)", "display_name": "Google LLC",
    "aliases": ["google", "google llc", "alphabet"],
    "skills": [ { "category_code": "COD", "skill_set_id": 1, "required_level": 8, "bloom_code": "EV",
                  "raw": "8-CR", "raw_bloom_code": "CR", "bloom_mismatch": true } /* x12 */ ] } ],
  "bar_matrix": { "company_ids": [1,2,3,"..."], "company_names": ["Accenture plc","..."], "levels": [[5,4,5,5,3,4,4,3,4,5,3,3], "..."] },  // all 115, for ranking
  "topics": { "SQL": { "5": "Database normalization (1NF–3NF); ER diagram understanding; ..." } /* all 12 x 10 */ },
  "data_quality": { "bloom_mismatch_rows": 698, "total_rows": 1380, "companies_without_bar": [102,1001,1002], "topics_fallback": ["SQL"] }
}
```

The script asserts 12 rows per company, levels in 1..10, that `raw` parses with the Level-5 regex `^\d{1,2}-(CU|AP|AS|EV|CR)$`, and that each raw level equals `required_level`. It fails loudly otherwise. It fixes mojibake with `ftfy.fix_text` (dev dependency only) and writes sorted keys, so diffs stay readable. The snapshot is committed: about 60 KB.

### 4.4 Topic ladder with the SQL fallback

A new view, `v_skill_topics`, joins each level's rows from `skill_set_topics` and fills SQL (id 7) from `staging_skill_topics` until someone fixes the trigger:

```sql
create or replace view public.v_skill_topics with (security_invoker = true) as
select skill_set_id, level_number, string_agg(btrim(topics), '; ' order by topic_id) as topics, 'skill_set_topics'::text as source
from public.skill_set_topics group by skill_set_id, level_number
union all
select 7, nullif(regexp_replace(levels, '\D', '', 'g'), '')::int, btrim(topics), 'staging_skill_topics'
from public.staging_skill_topics
where skill_area ilike 'SQL%Design%'
  and not exists (select 1 from public.skill_set_topics t where t.skill_set_id = 7);
```

The backend resolves topics in this order: (1) `v_skill_topics`, (2) the snapshot's `topics`, (3) `backend/src/data/skillTopics.ts` (the existing fallback), (4) generic text: "Level N (Bloom name): practice at this level". It applies `cleanTopicText()` (a tiny map for the known `Ã¢â‚¬â€œ`/`Ã¢â‚¬â„¢` sequences) and records any fallback in `meta.warnings`. The agent never queries the DB: the backend sends the ladder in the request.

### 4.5 Loader with fallback (backend `companyBar.service.ts`)

`getCompanyBar(id)` tries the view (supabase-js with a 3 s timeout), then the in-memory cache (TTL 10 min), then the snapshot (`TALENT_SNAPSHOT_PATH`, default `../agent/data/snapshots/talent_check_company_skillsets.json`), and returns 404 `{"error":"No skill bar for company 1001"}` when nothing is found. Every response carries `source: "db" | "cache" | "snapshot"`, and the UI shows a small "offline snapshot" badge in that case. A bar with fewer than 12 rows gets 422 `{"error":"Skill bar for company X is incomplete (11/12)"}`. This never happens today, but it protects against future data.

### 4.6 Name to id resolution

JDs (Role 1) and the UI pass names like "Google LLC". `resolveCompanyId(name)` lives in `companyBar.service.ts`, and Role 1 reuses it. The steps:

1. Normalize the name: lowercase, drop any parenthetical, strip punctuation and the suffixes `llc inc ltd limited corporation corp plc private pvt`.
2. Check the pinned aliases: `google|google llc|alphabet → 4`, `microsoft|microsoft corporation → 78`, `oracle financial services software|oracle fss|ofss → 24`. Do **not** confuse OFSS with 3, "Oracle India Private Limited".
3. Look for an exact normalized match over `companies.name` and `short_name`.
4. Look for a prefix match.
5. Among duplicates, prefer the company that has a bar (for example ZS Associates 33 over 102).

It returns `{company_id, matched_by}` or null, and unit tests pin the 3 brief names plus the staging spellings.

## 5. Features by phase

| Phase | Feature | Acceptance criteria |
|---|---|---|
| **P0** (first 2 h) | Contract models in `contract.py` (`TalentCheckRequest`, `TalentCheckResult`, `GapRow`, `NextTopic`, `CompanyBar`, batch models) | `python -m talent_match.contract --export` emits the schemas, the TS types are generated, and the stub agent `/talent-check` returns the golden Ananya x Google JSON, which validates |
| P0 | Migration: `v_company_skill_bar`, `v_skill_topics`, `talent_checks` | `select count(*) from v_company_skill_bar` = 1380; Google has 12 rows; SQL has 10 topic levels |
| P0 | Snapshot exported and committed | The file exists, holds 3 detailed companies and 115 in `bar_matrix`, and its assertions pass |
| P0 | Backend stubs `GET /api/companies/:id/skill-bar`, `POST /api/talent-check` | Roles 3 and 5 and the `flow` owner can call them and get contract-shaped JSON |
| **P1** (Done by brief) | `scoring.py` with F5, verdict, top_gaps, weights, next_topics, template explanation | Unit tests pass; Ananya x Google = 65 almost |
| P1 | `POST /api/talent-check` end to end (profile from `candidate_profiles`, bar, topics, agent, stored in `talent_checks`) | Works for at least 2 candidates x 3 companies; a repeat call returns the cached row (`meta.cached = true`) |
| P1 | Snapshot fallback | With `SUPABASE_URL` unset, the same request returns the same score, with `source: snapshot` |
| P1 | Frontend `/talent-check`: profile + company pickers, score + verdict card, 12 gap bars with Bloom labels, next topics per gap | A judge can pick Ananya and Google, press **Check readiness**, and see the result in under 1 s |
| P1 | Level-3 style "results differ" test | `pytest -k differs` passes (section 9) |
| **P2** (stand-out) | Radar chart (company bar vs candidate) and "how this was computed" drawer (formula, points per level, bar source, raw "8-CR" with mismatch flags) | The drawer numbers reconcile with the score by hand |
| P2 | What-if sliders with the TS mirror; **Save as my level** calls Role 3's `PUT` | Dragging a slider updates the score in under 16 ms per frame; a parity test passes on all shared vectors |
| P2 | Confidence range and "verdict could change" hint | The range is shown when any `u > 0`; property: low <= score <= high |
| P2 | Study plan ("fastest path to Ready") | Following the plan's steps in the what-if gives ready (a test asserts this) |
| P2 | `GET /api/talent-check/matrix` and the 4 x 3 heatmap in `flow` "Compare candidates" | The heatmap renders 12 cells and clicking a cell opens that result |
| P2 | Golden 4 x 3 fixtures, eval output | `pytest -m eval` prints the matrix and the brief-consistency checks |
| **P3** (scale story) | "Which companies am I ready for?" ranking over the 115 companies (`POST /talent-check/rank`, numpy) | Returns the top N with score and verdict in under 50 ms end to end on a warm cache; the agent compute takes under 5 ms |
| P3 | Load test numbers for the slide | The k6 script reports p50/p95 for single and batch calls |
| P3 | Optional LLM coaching rewrite | Behind a toggle; the template text is the fallback; the number is unchanged |

## 6. Files to create or change

### Agent (`agent/`, Python 3.11, Pydantic v2, FastAPI)

| File | Signatures | Purpose |
|---|---|---|
| `src/talent_match/contract.py` (shared, add models) | `class GapRow`, `NextTopic`, `TalentCheckResult`, `CompanyBarRow`, `CompanyBar`, `TalentCheckRequest`, `MatrixRequest`, `MatrixCell`, `RankRequest`, `RankRow` | Role 4's part of the single source of truth |
| `src/talent_match/talent_check/__init__.py` | `from .scoring import score_talent_check, SCORING_VERSION` | Public API of the package |
| `.../talent_check/constants.py` | `CODES: tuple[str, ...]` (skill_set_id order), `BLOOM_BANDS`, `READY=80`, `ALMOST=60`, `BLOCKING_SHORTFALL=3`, `CONFIDENCE_DELTA`, `EFFORT_HOURS`, `SCORING_VERSION="tc-1.0"` | Every tunable in one place, versioned |
| `.../talent_check/scoring.py` | `bloom_for(level: int) -> str`; `raw_readiness(c: Sequence[int], r: Sequence[int]) -> float`; `round_score(x: float) -> int`; `verdict_for(score: int, shortfalls: Sequence[int]) -> Verdict`; `rank_gaps(rows) -> list[str]`; `score_talent_check(req: TalentCheckRequest) -> TalentCheckResult` | The pure core: no I/O |
| `.../talent_check/ranges.py` | `readiness_range(levels: dict[str, SkillLevel], r: Sequence[int]) -> tuple[int, int]` | Confidence band (P2) |
| `.../talent_check/topics.py` | `next_topics_for(code: str, c: int, r: int, ladder: TopicLadder) -> list[NextTopic]`; `clean_text(s: str) -> str` | Topics for the missing levels |
| `.../talent_check/plan.py` | `study_plan(rows: list[GapRow], ladder) -> StudyPlan` | Greedy fastest path to Ready (P2) |
| `.../talent_check/explain.py` | `explain(result: TalentCheckResult, candidate_name: str, display_name: str) -> str` | Template paragraph |
| `.../talent_check/batch.py` | `score_matrix(C: np.ndarray, B: np.ndarray) -> np.ndarray`; `rank_companies(c: np.ndarray, bar: BarMatrix, limit: int) -> list[RankRow]` | Vectorized scoring, the same formula as `raw_readiness` |
| `.../talent_check/bar.py` | `parse_raw(s: str) -> tuple[int, str]`; `load_snapshot(path: Path | None = None) -> Snapshot`; `bar_from_snapshot(company_id: int) -> CompanyBar` | Offline loader for the CLI, tests and `/docs` demos |
| `.../talent_check/export_snapshot.py` | `main(out: Path = DEFAULT_SNAPSHOT) -> None` | Builds the JSON from the views over HTTPS |
| `.../talent_check/vectors.py` | `main(out: Path) -> None` | Writes `docs/contract/fixtures/talent_check_vectors.json` (about 200 cases) |
| `.../talent_check/router.py` | `POST /talent-check`, `POST /talent-check/batch`, `POST /talent-check/rank` | FastAPI router; `api.py` adds one `include_router` line |
| `tests/talent_check/test_scoring.py`, `test_properties.py`, `test_golden.py`, `test_differs.py`, `test_vectors.py`, `test_bar.py` | | Section 9 |
| `tests/golden/talent_check_matrix.json` | | 4 x 3 expected results, pinned to `tc-1.0` |
| `pyproject.toml` | add `numpy`, `fastapi`; dev extras: `hypothesis`, `ftfy` | |

### Backend (`backend/src/`, Express 5 + TS, existing routes, controllers and services pattern)

| File | Signatures | Purpose |
|---|---|---|
| `routes/companies.routes.ts` (one line) | `router.get('/:id/skill-bar', getCompanySkillBar)` | Contract route |
| `routes/talentCheck.routes.ts` (new); `routes/index.ts` mounts `/talent-check` | `POST /`, `GET /matrix`, `GET /rank`, `GET /` | |
| `controllers/companies.controller.ts` (add) | `getCompanySkillBar(req, res)` | Parse id, then `getCompanyBar` |
| `controllers/talentCheck.controller.ts` | `runTalentCheck`, `getTalentMatrix`, `getCompanyRanking`, `listTalentChecks` | zod-parse, call the service, `res.json` |
| `services/companyBar.service.ts` | `getCompanyBar(id: number): Promise<CompanyBar & {source}>`; `getAllBars(): Promise<BarMatrix>`; `getTopicLadder(): Promise<TopicLadder>`; `resolveCompanyId(name: string): Promise<{company_id, matched_by} \| null>` | DB, cache and snapshot loader |
| `services/talentCheck.service.ts` | `runTalentCheck({profileId, companyId, overrides?, persist = true}): Promise<TalentCheckResult>`; `getMatrix(companyIds: number[]): Promise<TalentMatrix>`; `rankCompanies(profileId: string, limit = 10): Promise<RankRow[]>` | Orchestrates the profile (Role 3's `getProfile`), the bar, topics, `callAgent`, and the `talent_checks` upsert |
| `lib/talentCheck.schemas.ts` | `runTalentCheckBody`, `matrixQuery`, `rankQuery` (zod) | Input validation (400 on bad input) |
| `lib/textClean.ts` | `cleanTopicText(s: string): string` | Mojibake fix |
| `supabase/migrations/20261027_04_talent_check.sql` | the views from 4.2 and 4.4, the table from 7.3 | |
| `services/__tests__/companyBar.service.test.ts`, `talentCheck.service.test.ts` | | Fallbacks, caching, validation |

### Frontend (`frontend/src/`, frontend-arch-init 4 layers)

| File | Signatures | Purpose |
|---|---|---|
| `features/talentCheck/service/talentCheck.api.ts` | `getSkillBarAPI(id)`, `runTalentCheckAPI(body)`, `getTalentMatrixAPI(ids)`, `getCompanyRankingAPI(profileId, limit)` | Pure Axios, returns `response.data` |
| `features/talentCheck/slice/talentCheck.slice.ts` | state `{ barsByCompany: Record<number, CompanyBar>, resultsByKey: Record<string, TalentCheckResult>, matrix: TalentMatrix \| null, rankingByProfile: Record<string, RankRow[]>, whatIf: { key: string \| null, overrides: Partial<Record<Code, number>> }, loading: Record<'bar'\|'check'\|'matrix'\|'rank', boolean>, error: string \| null }`; sync reducers only | Key `${profileId}:${companyId}` |
| `features/talentCheck/Hooks/talentCheck.hooks.ts` | `useCompanySkillBar(id)`, `useTalentCheck(profileId, companyId)` returning `{result, run, loading, error}`, `useTalentMatrix(ids)`, `useCompanyRanking(profileId)`, `useWhatIf(result)` returning `{preview, setLevel, reset, save}` | Business logic: try/catch/finally, dispatch |
| `features/talentCheck/lib/readiness.ts` | `scoreLevels(c: number[], r: number[]): {raw, score, verdict, blocking}` | TS mirror for preview only; parity-tested |
| `features/talentCheck/components/` | `TalentCheckPage`, `CompanyPicker`, `ReadinessCard` (score, verdict, range), `GapBars` (recharts horizontal bars with required tick and Bloom labels), `SkillRadar` (recharts `RadarChart`), `NextTopicsList`, `StudyPlan`, `WhatIfPanel` (shadcn `Slider`), `ReadinessHeatmap`, `CompanyRanking`, `HowComputedDrawer` (shadcn `Sheet`) | UI only, data through hooks |
| `routes/talent-check.tsx` | `/talent-check?profile=&company=` | Thin file route |
| `routes/talent-check.compare.tsx` | `/talent-check/compare` | Heatmap and ranking |
| `store.ts` | add `talentCheck` reducer | |
| `features/talentCheck/lib/readiness.test.ts`, `components/GapBars.test.tsx` | | Parity and rendering |

Colors: verdict colors come from `tokens.scss` (`$color-success`, `$color-warning`, `$color-danger`). The heatmap uses a single-hue sequential scale, and each cell also prints its number and verdict text, so it never relies on color alone.

## 7. API and database details

### 7.1 Backend routes

`GET /api/companies/4/skill-bar` returns 200:

```json
{ "company_id": 4, "company_name": "Google LLC (Subsidiary of Alphabet Inc.)", "source": "db",
  "rows": [ { "skill_set_id": 1, "category_code": "COD", "skill_set_name": "Coding", "required_level": 8,
              "bloom_code": "EV", "raw_bloom_code": "CR", "bloom_mismatch": true } ] }
```

`POST /api/talent-check` with `{"profile_id":"6f1c...","company_id":4}` returns 200 with a `TalentCheckResult` (the 3.5 shape plus the optional fields in 13):

```json
{ "company": "Google LLC", "company_id": 4, "profile_id": "6f1c...", "readiness_score": 65, "verdict": "almost",
  "top_gaps": ["CLOUD","SQL","APTI"], "scoring_version": "tc-1.0",
  "skillset_gap": [ { "category_code": "SQL", "required_level": 8, "candidate_level": 4, "gap": true, "shortfall": 4,
      "required_bloom": "EV", "candidate_bloom": "AP", "weight": 0.083,
      "next_topics": [ { "level": 5, "topics": "Database normalization (1NF–3NF); ER diagram understanding; ..." } ] } ],
  "explanation": "Ananya covers 55 of the 84 skill levels Google LLC expects ...",
  "readiness_range": { "low": 60, "high": 71 }, "blocking_gaps": ["APTI","AI","SQL","CLOUD","SWE","NETW"],
  "meta": { "bar_source": "db", "cached": false, "latency_ms": 41, "warnings": [] } }
```

Errors: 400 for a bad body, 404 for an unknown profile or a company without a bar, 422 for an incomplete bar, 502 when the agent is down. In the 502 case the frontend shows "Scoring service unavailable", and `readiness.ts` can still show a preview labelled "preview, not saved". The optional body field `skill_levels_override` (what-if confirm) scores without persisting (`persist: false`).

`GET /api/talent-check/matrix?company_ids=4,78,24` returns `{ "companies":[{id,name}], "profiles":[{id,name}], "cells":[{"profile_id","company_id","readiness_score","verdict","top_gaps"}], "scoring_version" }`. It makes one agent call (`/talent-check/batch`) and is cached for 60 s by `(profile ids+versions, company ids, version)`.

`GET /api/talent-check/rank?profile_id=…&limit=10` (proposed) returns `[{"company_id":8,"company_name":"…","readiness_score":96,"verdict":"ready"}]`.

### 7.2 Agent endpoints

`POST /talent-check` takes `{profile:{id,name,version,skill_levels}, bar:CompanyBar, topics:{COD:{"1":"…"}}, options:{include_range,include_plan}}` and returns `TalentCheckResult`. If `bar` is omitted, it is loaded from the snapshot (handy in `/docs`). `POST /talent-check/batch` takes `{profiles:[…], bars:[…], mode:"summary"}` and returns cells. `POST /talent-check/rank` takes `{profile, bar_matrix, limit}` and returns ranked rows.

### 7.3 DDL

```sql
create table if not exists public.talent_checks (
  id               uuid primary key default gen_random_uuid(),
  profile_id       uuid not null references public.candidate_profiles(id) on delete cascade,
  profile_version  int  not null,
  company_id       int  not null,          -- FK to companies(company_id) if it is the PK (verify in P0)
  result           jsonb not null,
  readiness_score  int  not null check (readiness_score between 0 and 100),
  verdict          text not null check (verdict in ('ready','almost','not_yet')),
  scoring_version  text not null,
  bar_source       text not null default 'db' check (bar_source in ('db','cache','snapshot')),
  created_at       timestamptz not null default now()
);
create index if not exists talent_checks_profile_company_idx on public.talent_checks (profile_id, company_id, created_at desc);
create unique index if not exists talent_checks_idem_idx on public.talent_checks (profile_id, profile_version, company_id, scoring_version);
alter table public.talent_checks enable row level security;   -- no anon policies; the backend uses the service role
```

The write is `upsert ... on conflict (profile_id, profile_version, company_id, scoring_version) do nothing`, which makes it idempotent: a refresh never duplicates rows, and old versions stay explainable.

## 8. Scalability and reliability

- **Pure, stateless compute.** The agent gets everything in the request, so scoring scales horizontally and needs no DB credentials (contract section 1). Scoring itself is O(12).
- **Vectorized batch.** `score_matrix` runs `(np.minimum(C[:,None,:], B[None,:,:]) - 1).sum(-1) / (B - 1).sum(-1)`. Measured: 10,005 bars x 12 in **1.3 ms** on one core. The full 4 x 115 matrix is a single call. At 100k companies we would precompute `sum(needed)` per company and shard by company id; the formula stays identical.
- **Caching.** Bars and topics are cached in the backend for 10 min (they change only when RADIX reruns Level 5). Results are cached in `talent_checks` by the idempotency key. The matrix is cached for 60 s.
- **Offline-first demo.** The snapshot fallback is transparent and labelled. The agent can also run `/docs` with no backend.
- **Validation at every boundary:** zod in the backend, Pydantic in the agent (levels must be ints 1..10, all 12 codes, CODES order), and the snapshot assertions at export.
- **Determinism and audit.** `scoring_version` sits on every row, along with `profile_version` and `bar_source`. Any result can be recomputed and explained later.
- **Observability.** `meta.latency_ms` and `bar_source` on every response, plus one log line per call: `talent-check profile=… company=4 score=65 source=db 41ms`.

## 9. Testing and evaluation

| Test | Tool | What it proves |
|---|---|---|
| `test_scoring.py` | pytest | The worked example (65, almost, top_gaps, weights sum to 1, 12 rows in order); edge cases: all r = 1 gives 100, all c = 1 gives 0, a missing code gives a warning, out-of-range input gives a validation error |
| `test_properties.py` | hypothesis (`st.lists(st.integers(1,10), min_size=12, max_size=12)`) | Bounds, monotonicity (score and verdict order), cap invariance, extremes, linear marginal value, determinism, range ordering (low <= score <= high) |
| `test_golden.py` | pytest, `tests/golden/talent_check_matrix.json` | The exact 4 x 3 results for `tc-1.0`; regenerated once by `vectors.py --golden` when Role 2's real levels land |
| `test_differs.py` (Level-3 style) | pytest, parametrized per company | For each company the 4 scores are pairwise distinct, their max - min is at least 20, and there are at least 2 distinct verdicts across the 12 cells. Brief-consistency checks: Rohan has the top score at each company, each candidate's Oracle FSS score is at least their Google score, and Priya's best company is Oracle FSS |
| `test_vectors.py` and `readiness.test.ts` | pytest and vitest on `docs/contract/fixtures/talent_check_vectors.json` | Python and the TS mirror agree on every vector (score, verdict, blocking) |
| `test_batch.py` | pytest | `score_matrix` equals `raw_readiness` cell by cell over the snapshot |
| `test_bar.py` | pytest | The snapshot has 12 rows per company, `parse_raw("8-CR") == (8, "CR")`, `bloom_for(8) == "EV"`, mismatch flags match the DB count |
| Backend vitest | vitest, mocked supabase and `callAgent` | DB failure falls back to the snapshot; 404 and 422 paths; cache hit returns `cached: true`; the zod 400 path |
| `pytest -m eval` | pytest marker | Prints the 4 x 3 matrix, the property-test counts and the brief-consistency results for the architecture slide |

## 10. Demo script (about 5 of the 45 minutes)

1. **Set up (say):** "The brief told us to decide what ready means. Here is our definition, in one sentence." Show the formula card from the drawer.
2. **Click:** Ananya, then Google LLC, then **Check readiness**. The result appears: **65, Almost**, the radar, and 12 gap bars with Bloom labels. **Say:** "She covers 55 of the 84 levels Google expects. Each missing level costs 1.19 points. DevOps and Cloud is 4 levels short, a full Bloom band, so she can't be Ready even with a high average."
3. **Click** the SQL row to show the next topics ("Database normalization, ER diagrams…") pulled straight from RADIX's topic ladder.
4. **What-if (the wow, part 1):** drag CLOUD from 5 to 7 and SQL from 4 to 6. The score climbs live, and the blocking badges clear. Then open **Fastest path to Ready**: "12 level steps, about 6 weeks." Apply the plan, and the verdict turns **Ready, 80**.
5. **Switch company** to Oracle FSS: **89, Ready**. "Same candidate, different bar: Oracle FSS asks less than Google on 11 of 12 skills."
6. **Compare candidates:** the 4 x 3 heatmap. "This is the brief's 'visibly different results' in one picture, and the test suite enforces it."
7. **Wow, part 2:** **Which companies am I ready for?** for Priya. In under 50 ms it ranks all 115 RADIX companies. "Priya isn't Google-ready yet, but she's Ready for 13 companies today and Almost for 52 more." (Numbers use the assumed levels; re-read them after the real profiles land.)
8. **Challenge we faced (say):** "When we exported the company bar, 51% of the raw values contradicted themselves. Google's Coding is stored as '8-CR', but level 8 is Evaluation, not Creation. The SQL topic ladder was empty because a trigger looked for 'SQL and Design' while the data said 'SQL & Design'. We treat the number as the source of truth, derive the Bloom label from it, keep the raw value as provenance in the drawer, and recovered the SQL topics with a view. It's the RADIX Level-3 lesson: validate data automatically, don't trust it." Open the drawer and show the mismatch flag on "8-CR".

**Fallback:** if the network fails, the snapshot badge appears and every step above still works.

## 11. Dependencies, risks and mitigations

| Risk or dependency | Impact | Mitigation |
|---|---|---|
| Role 3's `skill_levels` are not ready by P1 | Nothing real to score | Golden profiles for the 4 samples are inserted by a seed script in P0. Read through Role 3's `getProfile`, and fall back to golden JSON until it exists |
| Role 2's inferred levels differ from the assumed ones | The golden values change | Golden exact values are regenerated once. The `test_differs` ordering checks are value-independent |
| `candidate_profiles` migration lands after ours | The FK fails | Prefix ours with `_04_`, after Role 3's `_03_`. If needed, add the FK in a follow-up migration |
| Supabase unreachable on demo Wi-Fi | No bar | Snapshot fallback (4.5), rehearsed with the network off |
| Agent down | No score | 502 with a clear message, plus a `readiness.ts` preview labelled "not saved" |
| TS mirror drifts from Python | Slider disagrees with the saved result | Shared vectors in CI; the mirror is used only for preview; Save always calls the API |
| Judges challenge "Google SYSD = 4" | Looks odd | Show it as RADIX's real data (raw "4-AS"); our job is to score faithfully and flag it, not edit it |
| Thresholds called arbitrary | Credibility | Defended in 3.1, versioned, with alternatives in 3.3; the what-if shows how the verdict reacts |
| Effort hours look made up | Credibility | Labelled "estimate"; one constants table; shown only as "about N weeks" |

## 12. Task checklist (in order, hours estimated)

- [ ] **P0 (2 h)**
  - [ ] Add Role 4 models to `contract.py` and export the schemas (0.5 h)
  - [ ] Write the migration with the two views and `talent_checks`, apply it, check the counts (0.5 h)
  - [ ] Write `export_snapshot.py`, commit the snapshot (0.5 h)
  - [ ] Agent stub `/talent-check` returning golden JSON; backend stubs for skill-bar and talent-check (0.5 h)
- [ ] **P1 (5 h)**
  - [ ] `constants.py`, `scoring.py`, `topics.py`, `explain.py`, plus `test_scoring.py` (1.5 h)
  - [ ] `companyBar.service.ts` (DB, cache, snapshot, topics, resolver) plus its tests (1 h)
  - [ ] `talentCheck.service.ts`, controller, routes, persistence and caching (1 h)
  - [ ] Frontend service, slice, hooks, `TalentCheckPage`, `ReadinessCard`, `GapBars`, `NextTopicsList`, route (1.5 h)
  - [ ] Golden 4 x 3 fixtures plus `test_differs.py`; mark the milestone Done (0.5 h, overlaps)
- [ ] **P2 (5 h)**
  - [ ] `SkillRadar`, `HowComputedDrawer` (with raw provenance) (1 h)
  - [ ] `readiness.ts` mirror, `vectors.py`, parity tests, `WhatIfPanel`, Save via Role 3 (1.5 h)
  - [ ] `ranges.py` and the range UI; `plan.py` and `StudyPlan` (1.5 h)
  - [ ] `batch.py`, the matrix endpoint, `ReadinessHeatmap` in `flow` (1 h)
  - [ ] `test_properties.py` (hypothesis), the eval marker output (0.5 h, overlaps)
- [ ] **P3 (2 h)**
  - [ ] `/talent-check/rank`, backend route, `CompanyRanking` (1 h)
  - [ ] k6 load test (single, matrix, rank); put the numbers on the architecture slide (0.5 h)
  - [ ] Optional LLM coaching rewrite behind a toggle (0.5 h)
- [ ] **Freeze:** rehearse the section 10 script twice, once with the network off

## 13. Proposed contract changes

All of these are additive: no brief field changes, and no existing table is modified.

1. **`v_company_skill_bar` columns:** define `bloom_code` as **derived from `required_level`** (the same banding as the candidate side), and add `skill_set_name`, `raw_bloom_code` and `bloom_mismatch`. Reason: 698 of 1,380 raw codes disagree with their level.
2. **New view `v_skill_topics`** (Role 4): one row per `(skill_set_id, level_number)` with the topic rows joined, plus the SQL fallback from `staging_skill_topics`. Role 5 can use it for `learn_next`.
3. **`TalentCheckResult` optional fields:** `readiness_range {low, high}`, `blocking_gaps: string[]`, `levels_covered`, `levels_needed`, `categories_met`, `study_plan {steps:[{category_code, from, to, hours, topics}], total_steps, total_hours}`, and `meta {bar_source, cached, latency_ms, warnings}`. Optional per-row fields: `confidence`, `candidate_source`, `blocking`, `points_lost`, `raw_bloom_code`.
4. **`weight` definition:** `(required_level - 1) / sum(required_level - 1)`, which is consistent with the contract's example of 0.11.
5. **`talent_checks` columns:** add `verdict` and `bar_source`, plus the unique idempotency index `(profile_id, profile_version, company_id, scoring_version)`.
6. **New routes:** `GET /api/talent-check/rank?profile_id&limit` (agent `POST /talent-check/rank`) and `GET /api/talent-check?profile_id` (history). `POST /api/talent-check` also accepts the optional `skill_levels_override` and `persist`.
7. **Shared fixtures location:** `docs/contract/fixtures/talent_check_vectors.json`, next to the exported schemas, read by both pytest and vitest.
8. **`resolveCompanyId(name)`** in `backend/src/services/companyBar.service.ts` is the one shared name-to-id resolver (Role 1 uses it for `company_id`). The pinned aliases keep OFSS (24) distinct from Oracle India (3).
