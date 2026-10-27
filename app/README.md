# PlaceIntel - JSS Placement Intelligence Hub

> **Complete app** of the hackathon project: frontend, business logic and Supabase connection. Built with TanStack Start (Vite + React), not Next.js. Talks to the agent service in `../agent`.

- **Platform Name**: PlaceIntel
- **College**: JSS Academy of Technical Education (JSSATEN), configured in `src/lib/college.ts`.
- **Placement Analytics**: Company profiles, hiring workflows, role compensation tiers, and technical skill ladders.
- **Backend & Database**: Supabase PostgreSQL with seed fallback support.
- **Production URL**: https://placeintel-jssaten.vercel.app

## Getting Started

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`, then run:

```bash
npm install && npm run dev
```

