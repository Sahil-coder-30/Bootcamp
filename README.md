# JSS Academy of Technical Education — Companies Research & Placement Analytics Portal

- **Phase 1 is UI-only.** All data comes from `src/data/seedCompanies.ts` (one company: Accenture).
- **Fully public** — there is no login.
- College: **JSS Academy of Technical Education (JSSATEN)**, set in `src/lib/college.ts`.
- **Phase 2** connects the portal directly to Supabase Postgres (read-only, JSON-driven). Seed files (`src/data/seedCompanies.ts` and `src/data/skillTopics.ts`) remain as fallbacks.
- Optional env var: `VITE_LOGO_DEV_PUBLISHABLE_KEY` for company logos.

## Phase 2 — Supabase

Paste `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` into `.env`, then run:

```bash
npm install && npm run dev
```

