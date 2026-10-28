# PlaceIntel Backend

Node + TypeScript (Express 5) API for the PlaceIntel frontend. Owns all Supabase access and calls the FastAPI agent service.

```bash
cp .env.example .env
npm install
npm run dev     # http://localhost:4000/api/health
npm test
npm run build && npm start
```

Structure: `routes/` → `controllers/` → `services/` (see the root README for the API list).
Without `SUPABASE_URL` + key the API serves the bundled seed data from `src/data/`.

Scripts: `npm run seed:sql` (writes `supabase/seed.sql`), `npm run seed:db` (pushes seed data to Supabase),
`scripts/populate-live-supabase.py` (RLS policies + seed via direct Postgres, reads `SUPABASE_DB_*` env vars).
Bootcamp SQL schema scripts are in `supabase/schema/`.

## Profiles API (Talent Match, Role 3)

Candidate profiles for Talent Check and Skill Matching. Contract: `docs/00-shared-contract.md` 3.4 + 9; plan: `docs/role-3-profile-builder/plan.md`.

| Route | What it does |
|---|---|
| `GET /api/profiles?limit&cursor&q&email` | keyset-paginated summaries (`{items, next_cursor}`) |
| `POST /api/profiles` | create (201 + `ETag` + `Location`); 409 + `existing_profile_id` on a duplicate email |
| `GET /api/profiles/:id` | the profile; `ETag: "<version>"`, 304 on `If-None-Match` |
| `PUT /api/profiles/:id` | update; needs `If-Match: "<version>"` (428 without, 412 + `current` when stale) |
| `POST /api/profiles/from-resume` | `{resume_extraction_id, profile_id?}` -> `{draft, provenance, diff, existing_profile_id, warnings}`; saves nothing |
| `GET /api/profiles/:id/versions`, `/cv-url`, `DELETE /api/profiles/:id` | history, 10-minute signed CV url, right to erasure |
| `GET /api/profiles/calibration/:code?level=` | topics for levels L-1..L+1 (the "calibrate me" checklist) |

`X-Change-Source: form|resume_import|json_import|seed|calibration` records where a save came from. `skill_levels` always has exactly the 12 codes, each an integer 1-10.

**Storage.** Supabase table `candidate_profiles` (migration `supabase/migrations/20261027120300_role3_candidate_profiles.sql`, idempotent; it is *not* applied automatically). With Supabase unset, or `PROFILES_STORE=memory`, an in-memory store seeded with the 4 sample candidates is used. `EXTRACTIONS_SOURCE=fixtures` reads resume extractions from `src/data/extractionFixtures/` instead of the `extractions` table.

**Seeding.** `npm run seed:profiles` inserts the 4 sample profiles (fixed UUIDs `3a000000-0000-4000-8000-00000000000{1..4}`) that are missing; `-- --reset` replaces them, `-- --dry-run` prints without touching anything, `-- --from-extractions` rebuilds them from Role 2's stored extractions, `-- --export-golden` writes copies to `agent/tests/golden/profiles/`.
