# Level 4 — Agentic Research (LangChain)

**What this level teaches:** how to automate the manual Level-1/2 research with
LangChain agents. Each prompt you used to run by hand becomes an **agent**. The
research prompt fans out across **three LLMs**, a consolidation agent merges them
into a single Golden Record, and a **testing agent** (the Level-3 framework, now
*in play*) tells you how trustworthy that record is.

> **Files only.** Level 4 writes everything to `outputs/<company>/`. It does NOT
> touch the database — the data isn't validated *and gated* yet. Persisting to
> Supabase behind blocking gates is Level 5's job.

## The agents (the pipeline)

| # | Agent | Prompt | Output | LLMs |
|---|---|---|---|---|
| 1 | `research_agent` | research.md (163 params) | `research_openrouter/groq/gemini.json` | all 3 |
| 2 | `consolidation_agent` | consolidation.md | `golden_record.json` / `.csv` | 1 |
| 3 | `skill_matrix_agent` | expectation_matrix.md (12 skills, Bloom) | `skill_matrix.json` / `.csv` | 1 |
| 4 | `hiring_agent` | hiring.md | `hiring_rounds.json` | 1 |
| 5 | `validation_agent` | *(no LLM — reuses Level 3)* | `data_quality_report.md` / `.json` | 0 |

Pipeline order: **research → consolidation → skills → hiring → test**.

## The session as I2R milestones

Level 4 is taught as **project-based milestones**, each following **I2R**
(Introduction → Immersion → Reflection). See `BUILD_GUIDE.md` for the full
hands-on track.

| Milestone | Theme | You end up with |
|---|---|---|
| 0 | Mission Control | a working venv + the map of "what is an agent" |
| 1 | One interface, three brains | `providers.py` — swappable LLMs |
| 2 | Chat → data | `prompts.py` + `parsing.py` (kills the Excel step) |
| 3 | The research agent | 3 raw provider outputs (multi-LLM consensus) |
| 4 | The consolidation agent | one Golden Record |
| 5 | The specialist agents | skills + hiring artifacts |
| 6 | The testing agent | a data-quality report on the Golden Record |

## Run it

```bash
# activate venv, ensure .env has your keys (see PREWORK.md)

# Step 0 — check your keys first (pings all 3 providers, ~5 sec):
python -m openradix_agents doctor

python -m openradix_agents run --company "Blinkit"
```

Run a single step, or pick providers:
```bash
python -m openradix_agents run --company "Blinkit" --only research
python -m openradix_agents run --company "Blinkit" --only test
python -m openradix_agents run --company "Blinkit" --providers groq gemini
```

**A provider down?** A dead provider is now logged and skipped (it won't crash the
run). If a key is permanently unavailable — e.g. Gemini's free-tier quota — swap it
for a second OpenRouter model (same key, different model id) by adding one line to
`.env`:
```bash
RESEARCH_PROVIDERS=openrouter,groq,openrouter-alt
# optionally choose the 2nd model:  OPENROUTER_MODEL_2=nvidia/nemotron-nano-9b-v2:free
```
Re-run `python -m openradix_agents doctor` to confirm three greens.

Outputs land in `outputs/Blinkit/`.

## Architecture

```
research_agent ──► OpenRouter ┐
               ──► Groq       ├─► 3 raw tables ─► consolidation_agent ─► golden_record.json
               ──► Gemini     ┘                                              │
skill_matrix_agent ─► skill_matrix.csv                                       │
hiring_agent       ─► hiring_rounds.json                                     │
validation_agent  ◄─────────────── reads golden_record.json ◄───────────────┘
        └─► data_quality_report.md   (Level-3 metadata-driven checks, as a report)
```

- `providers.py` — three interchangeable LangChain chat models (lazy-imported).
- `prompts.py` — loads templates and fills `{{TOKEN}}` placeholders.
- `parsing.py` — markdown-table / JSON extraction (automates the "clean it in Excel" step).
- `validation_agent.py` — vendors the Level-3 `rules.py` + `registry.py` + the
  metadata/master-cases in `data/`, builds the 3-scope matrix, and writes a report.

## The testing agent (Level 3, now in play)

The 5th agent doesn't call an LLM. It loads `outputs/<company>/golden_record.json`
and runs the **exact** metadata-driven checks students built in Level 3 — the rich
163 × 30 metadata sheet crossed with the master test cases across three scopes
(Per-Parameter, Specific-Parameters, Global), ~1,500 checks in total — then writes
`data_quality_report.md` grouped by priority, scope, and category.

> It is a **report, not a gate.** Level 4 still writes files only and never blocks.
> Turning these same checks into a *blocking* gate with automatic retries is the
> whole point of Level 5. Here we simply *see* the quality before trusting it.

The vendored `data/`, `rules.py`, and `registry.py` are copied verbatim from
Level 3, so the behaviour is identical to the suite students already know.

## Connecting the levels

- **From Level 3:** the testing agent IS your Level-3 framework, embedded.
- **To Level 5:** the same Golden Record + the same checks reappear — but there
  the checks become a gate inside a LangGraph loop that retries only what failed
  and writes only clean data to the database.

## Notes
- Offline tests: `pytest src/openradix_agents/test_parsing_unit.py -q`.
- The testing agent runs fully offline (no key needed): `--only test`.
- If a provider errors, try `--providers` with just the ones whose keys you have.
