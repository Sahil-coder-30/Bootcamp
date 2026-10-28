# auth: Google sign-in + JWT + user profiles

Express 5 + TypeScript service (same layout as `../backend`: routes, controllers, services). Port **4100**, k8s Service `auth-service:80`, reachable at `/api/auth/*` through the ingress.

**Why Express+TS and not FastAPI:** the backend and frontend are TypeScript, so token verification (`jose`, HS256) is the same code in both places and the frontend/backend share types. FastAPI stays for the agent/resume services that do Python-only work (LLMs, parsing).

## What it does

- **Google sign-in.** The frontend shows Google's button, gets an ID token and posts it to `POST /api/auth/google`. The service verifies it with `google-auth-library` (audience = `GOOGLE_CLIENT_ID`), requires a verified email, optionally limits sign-in to `ALLOWED_EMAIL_DOMAINS`, and upserts the user. An authorization-code flow (`POST /api/auth/google/code`, needs `GOOGLE_CLIENT_SECRET`) is also there.
- **JWT access + refresh.** Access token: HS256, 15 min, claims `sub` (user uuid), `email`, `role`, `iss=placeintel-auth`, `aud=placeintel`. Refresh token: opaque 64-char random string, stored only as SHA-256, 30 days, **rotated on every use**; presenting an already used token revokes the whole login family (theft detection).
- **User profiles** live in `auth_users`: name, picture, phone, college, branch, graduation year, `role`, plus **`resume_id`** (id of the row in the resume service's `resumes` table, plain reference, no FK) and `candidate_profile_id`.

## API (all under `/api/auth`)

| Method + path | Auth | What |
|---|---|---|
| `GET /config` | no | `{ googleClientId }` for the frontend button |
| `POST /google` | no | `{ credential }` -> `{ accessToken, refreshToken, expiresIn, user }` |
| `POST /google/code` | no | `{ code, redirectUri }` same response |
| `POST /refresh` | no | `{ refreshToken }` -> new pair (old one is dead) |
| `POST /logout` | no | `{ refreshToken }` revokes that login |
| `POST /logout-all` | Bearer | revokes every login of the user |
| `GET /me`, `PATCH /me` | Bearer | read / edit profile (`name phone college branch graduationYear resumeId candidateProfileId`; email and role cannot be changed here) |
| `GET /verify` | Bearer | 200 + `X-User-Id/-Email/-Role` headers, usable as an nginx `auth-url` |

Probes: `/healthz`, `/readyz` (checks the DB).

## How other services verify tokens

- **Backend (Express):** `backend/src/middlewares/auth.ts` verifies the Bearer token with the same `JWT_SECRET`. `authenticate` runs on all `/api` routes (no token = anonymous, bad token = 401), `requireAuth` guards routes, `userHeaders(req)` returns `X-User-Id/-Email/-Role` to forward to internal services. `AUTH_REQUIRED=true` makes `/api/talent-check` require sign-in. `GET /api/whoami` returns the verified user.
- **Resume / agent (Python):** verify with PyJWT (`HS256`, same secret, `iss`, `aud`) or just trust the `X-User-Id` header the backend forwards (cluster-internal).
- **Relation to Talent Check:** `candidate_profiles` (Role 3) is keyed by `email`, which equals `auth_users.email`. `auth_users.candidate_profile_id` caches the link; the auth profile holds identity and the resume pointer, `candidate_profiles.profile` holds the 12-skill levels.

## Config (`.env.example`)

`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Sahil adds), `JWT_SECRET` (>= 32 chars, same value in backend), `DATABASE_URL` (Supabase Postgres), `AUTO_MIGRATE=true` (applies `migrations/*.sql` at boot), `ALLOWED_EMAIL_DOMAINS`, `ADMIN_EMAILS`. Without `DATABASE_URL` it uses an in-memory store (dev only; refused in production).

Google Cloud Console: create an OAuth client (Web application), add the frontend origin (`http://localhost:5173`, the Vercel URL) under *Authorized JavaScript origins*.

## Run and test

```bash
cp .env.example .env     # fill GOOGLE_CLIENT_ID, JWT_SECRET
npm install && npm run dev
npm test                  # 25 offline tests (fake Google verifier)
TEST_DATABASE_URL=postgresql://user@localhost:5432/authtest npm test   # + live Postgres test
npm run test:coverage
```

Kubernetes: `k8s/auth-deployment.yml`, `auth-service.yml`, secret `auth-secret` (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, see `k8s/secrets.example.yml`); `database` secret supplies `DATABASE_URL`.

Known limits: access tokens cannot be revoked before expiry (15 min window); refresh tokens are kept in `localStorage` on the frontend (move to an httpOnly cookie if the app gets a shared domain); HS256 means every verifier holds the secret (switch to RS256 + JWKS if third parties ever verify).
