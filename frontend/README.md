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
