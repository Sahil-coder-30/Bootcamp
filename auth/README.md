# auth: Google sign-in + JWT + user profiles

Express 5 + TypeScript service (same layout as `../backend`: routes, controllers, services). Port **4100**, k8s Service `auth-service:80`, reachable at `/api/auth/*` through the ingress.

**Why Express+TS and not FastAPI:** the backend and frontend are TypeScript, so token verification (`jose`, HS256) is the same code in both places and the frontend/backend share types. FastAPI stays for the agent/resume services that do Python-only work (LLMs, parsing).

## What it does

- **Google sign-in with Passport** (`passport` + `passport-google-oauth20`, stateless, no sessions). `GET /api/auth/google?redirect=/page` sends the browser to Google. Google returns to `GET /api/auth/google/callback`; the service requires a verified email, optionally limits sign-in to `ALLOWED_EMAIL_DOMAINS`, upserts the user, issues our own tokens and redirects to `FRONTEND_URL/auth/callback#accessToken=...&refreshToken=...&redirect=/page`. Tokens travel in the URL fragment (never in logs or the query string) and the SPA removes them from the address bar at once. CSRF: `state` is a signed 10 min token holding a nonce, and the same nonce is an httpOnly cookie, so only the browser that started the login can finish it. Errors redirect to `FRONTEND_URL/login?error=...`. `redirect` only accepts same-site paths.
- **JWT access + refresh.** Access token: HS256, 15 min, claims `sub` (user uuid), `email`, `role`, `iss=placeintel-auth`, `aud=placeintel`. Refresh token: opaque 64-char random string, stored only as SHA-256, 30 days, **rotated on every use**; presenting an already used token revokes the whole login family (theft detection).
- **User profiles** live in `auth_users`: name, picture, phone, college, branch, graduation year, `role`, plus **`resume_id`** (id of the row in the resume service's `resumes` table, plain reference, no FK) and `candidate_profile_id`.

## API (all under `/api/auth`)

| Method + path | Auth | What |
|---|---|---|
| `GET /google?redirect=` | no | starts Google sign-in (302 to Google) |
| `GET /google/callback` | no | Google's redirect target (302 to the frontend with tokens) |
| `POST /refresh` | no | `{ refreshToken }` -> `{ accessToken, refreshToken, expiresIn, user }` (old refresh token is dead) |
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

`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` (Sahil adds), `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, `JWT_SECRET` (>= 32 chars, same value in backend), `DATABASE_URL` (Supabase Postgres), `AUTO_MIGRATE=true` (applies `migrations/*.sql` at boot), `ALLOWED_EMAIL_DOMAINS`, `ADMIN_EMAILS`. Without `DATABASE_URL` it uses an in-memory store (dev only; refused in production).

Google Cloud Console: create an OAuth client (Web application) and add under **Authorized redirect URIs** exactly the `GOOGLE_CALLBACK_URL` you use:
`http://localhost:5173/api/auth/google/callback` (dev, Vite proxies `/api/auth` to :4100), `http://localhost/api/auth/google/callback` (Skaffold ingress), `https://<prod-host>/api/auth/google/callback`. Authorized JavaScript origins can stay empty (no browser-side Google script anymore).

## Run and test

```bash
cp .env.example .env     # fill GOOGLE_CLIENT_ID, JWT_SECRET
npm install && npm run dev
npm test                  # 27 tests (Passport strategy faked, no Google calls)
TEST_DATABASE_URL=postgresql://user@localhost:5432/authtest npm test   # + live Postgres test
npm run test:coverage
```

Kubernetes: `k8s/auth-deployment.yml`, `auth-service.yml`, secret `auth-secret` (`JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, see `k8s/secrets.example.yml`); `database` secret supplies `DATABASE_URL`.

Known limits: access tokens cannot be revoked before expiry (15 min window); refresh tokens are kept in `localStorage` on the frontend (move to an httpOnly cookie if the app gets a shared domain); HS256 means every verifier holds the secret (switch to RS256 + JWKS if third parties ever verify).
