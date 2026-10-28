# Resume service (Role 2: Resume Parsing)

Offline resume parser for RADIX Talent Match. PDF, DOCX or TXT in, a `ResumeExtraction`
(contract `docs/00-shared-contract.md` §3.3) out, with a 1–10 level for each of the 12
skill categories (`lv-1.0`). **No LLM and no external API calls**: everything runs inside
this service.

| Step | How (all local) |
|---|---|
| Text + layout | PyMuPDF spans (font size, bold, position), two-column detection, running header/footer removal; python-docx paragraphs, tables, text boxes, header |
| Sections | heading lexicon + rapidfuzz fuzzy match (`WORK EXPERIENCE`, `Projets`, `Skills:` inline) |
| Contacts, dates, CGPA, ranks | regex (`patterns.py`) |
| Name, orgs, location | spaCy `en_core_web_sm` NER (baked into the image), heuristics as fallback |
| Skills | `data/taxonomy.json` (~100 canonical skills, ~900 aliases) with word-boundary matching; weak aliases (`rest`, `spring`) only in skill lists; rapidfuzz for typos |
| Levels | deterministic points model + Bloom gates (role-2 plan §3.7); every level has a confidence and a one-line basis |

Files are stored in **S3** when `S3_BUCKET` is set (key `resume-files/<sha256>.<ext>`,
SSE-AES256), otherwise in `data/files/`. Metadata and the parse live in the `resumes`
table (`migrations/001_resumes.sql`; the service also creates it on boot). Postgres via
`DATABASE_URL`, SQLite by default.

## API (port 8100, OpenAPI at `/docs`)

| Route | What |
|---|---|
| `GET /healthz`, `/readyz`, `/health` | probes; `/health` shows parser, taxonomy, NER model, storage |
| `POST /parse` (multipart `file`) | parse only, stores nothing |
| `POST /parse/text` `{text}` | parse pasted text |
| `POST /levels/infer` (ResumeExtraction) | re-score skills and levels after edits, no document needed |
| `POST /resumes` (multipart `file`, optional `user_id`, `?force=true`) | store + parse; same file again returns the cached parse (200) |
| `GET /resumes?user_id=&email=&include_extraction=` | list |
| `GET /resumes/{id}` | record + extraction |
| `GET /resumes/{id}/file[?redirect=true]` | original file (S3 presigned redirect) |
| `GET /resumes/{id}/profile-draft` | CandidateProfile draft: `skill_levels {CODE:{level,source,confidence,basis,inferred_level}}` for Role 3 / Talent Check |
| `POST /resumes/{id}/reparse` | parse the stored file again (after a parser upgrade) |
| `PATCH /resumes/{id}` `{user_id}` | attach to a user |
| `DELETE /resumes/{id}` | delete row (and the file when no other row uses it) |

`X-User-Id` (set by the backend after it verifies the JWT) scopes every read and write to
that user. `RESUME_API_KEY` (optional) requires `X-Resume-Key` on everything but the probes.
The frontend reaches all of this through the backend at `/api/resumes/*`.

## Run

```bash
cd resume
uv venv -p 3.12 .venv && . .venv/bin/activate
uv pip install -r requirements-dev.txt -e .
uvicorn resume_service.main:app --reload --port 8100
pytest --cov                     # 50+ tests, no network (S3 is mocked with moto)
ruff check src tests && mypy
```

Settings: see `.env.example`. Docker: `docker build -t resume-service resume/`.
