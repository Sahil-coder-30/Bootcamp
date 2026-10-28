# PlaceIntel - JSS Placement Intelligence Hub

> **Frontend service** (React + TypeScript + Vite). All data comes from the backend API in `../backend`. Architecture: see the root README.

- **Platform Name**: PlaceIntel
- **College**: JSS Academy of Technical Education (JSSATEN), configured in `src/lib/college.ts`.
- **Placement Analytics**: Company profiles, hiring workflows, role compensation tiers, and technical skill ladders.
- **Data**: served by `../backend` (Supabase PostgreSQL with seed fallback).
- **Production URL**: https://placeintel-jssaten.vercel.app

## Getting Started

```bash
cp .env.example .env
npm install && npm run dev   # http://localhost:5173
```

Start the backend first (`../backend`, port 4000); Vite proxies `/api` to it. In production set `VITE_API_URL` to the backend URL.

## Profile builder (Talent Match, Role 3)

`/profile` lists saved candidate profiles, `/profile/new` and `/profile/:id` open the 7-step builder
(`src/features/profile`). A parsed resume can pre-fill it (`?extraction=<id>`); re-importing a CV into a saved
profile shows a diff instead of overwriting. `ProfileBuilder` takes `{profileId?, extractionId?, onSaved?}` so the
integrated flow can embed it as step 3. Form rules are a copy of the backend's and both run
`docs/contract/fixtures/candidate-profile-cases.json`.

Dev note: `vite.config.ts` proxies `/api` to `http://localhost` (the k8s ingress). Without the cluster, run the
backend on port 4000 and set `VITE_API_URL=http://localhost:4000` in `.env`.
