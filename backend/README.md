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

## Telegram bot

Runs **inside this backend process** (`src/bot/`), so there is nothing extra to deploy. It answers students in Telegram: look up companies, and check readiness for a company once their chat is linked to their profile.

| Command | What it does |
|---|---|
| `/companies <name>` | search recruiting companies; tap one for its card |
| `/readiness <company>` | your Talent Check for that company (needs a linked profile and the agent service) |
| `/me`, `/link`, `/unlink` | your linked profile, how to connect, disconnect |

**Turn it on:** put `TELEGRAM_BOT_TOKEN` (from `@BotFather`) in `backend/.env` and restart. No token means the bot is simply off. By default it uses **long polling**, which needs no public URL. Only one process may poll per token: two backends with the same token fight each other (Telegram error 409), so use a separate bot for development and production, or set `TELEGRAM_BOT=off` on the extra one.

**Linking a chat to a profile** uses a one-time code, never an email: the web app's **Connect Telegram** button (shown on a saved profile when the bot is running) calls `POST /api/telegram/link-code`, which returns a `https://t.me/<bot>?start=<code>` link. The code works once and expires after 10 minutes. `GET /api/telegram/status` says whether the bot is running.

**Storage:** links live in Supabase (`telegram_links`, `telegram_link_codes`; migration `supabase/migrations/20261029_01_telegram_bot.sql`, not applied automatically). `TELEGRAM_STORE=memory` keeps them in memory instead (lost on restart).

**Webhook mode (production):** set `TELEGRAM_WEBHOOK_URL` (public HTTPS) and `TELEGRAM_WEBHOOK_SECRET`; Telegram then calls `POST /telegram/webhook`. Tests run with no network: `test/bot.test.ts` feeds the bot a fake Telegram API.
