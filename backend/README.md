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
