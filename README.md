# JSS Academy of Technical Education — Companies Research & Placement Analytics Portal

- **Phase 1 is UI-only.** All data comes from `src/data/seedCompanies.ts` (one company: Accenture).
- **Fully public** — there is no login.
- College: **JSS Academy of Technical Education (JSSATEN)**, set in `src/lib/college.ts`.
- **Phase 2** will swap the data-access functions in `src/lib/companyData.ts` to database rows; the normalizers already accept the same `short_json` / `full_json` / `skill_levels` shapes.
- Optional env var: `VITE_LOGO_DEV_PUBLISHABLE_KEY` for company logos.
