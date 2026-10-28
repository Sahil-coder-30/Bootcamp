import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { loadConfig } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/migrate.js";
import { PgStore } from "../src/services/pgStore.js";
import { fakeGoogle } from "./helpers.js";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one); skipped otherwise.
const url = process.env["TEST_DATABASE_URL"];

describe.skipIf(!url)("PgStore + migrations (live Postgres)", () => {
  let store: PgStore;

  beforeAll(async () => {
    expect(await runMigrations(url!)).toContain("001_auth_init.sql");
    expect(await runMigrations(url!)).toContain("001_auth_init.sql"); // idempotent
    store = new PgStore(url!);
    await store.pool.query("truncate auth_refresh_tokens, auth_users cascade");
  });
  afterAll(async () => {
    await store?.pool.end();
  });

  it("serves the full login -> profile -> refresh flow from the database", async () => {
    const config = loadConfig({ JWT_SECRET: "test-secret-test-secret-test-secret-123", GOOGLE_CLIENT_ID: "id" });
    const app = createApp({ config, store, google: fakeGoogle });

    expect((await request(app).get("/readyz")).status).toBe(200);
    const login = await request(app).post("/api/auth/google").send({ credential: "good-alice-credential" });
    expect(login.status).toBe(200);
    const auth = { Authorization: `Bearer ${login.body.accessToken}` };

    const patched = await request(app).patch("/api/auth/me").set(auth).send({ branch: "CSE", resumeId: "abc-123", graduationYear: 2027 });
    expect(patched.body.user).toMatchObject({ branch: "CSE", resumeId: "abc-123", graduationYear: 2027 });

    const again = await request(app).post("/api/auth/google").send({ credential: "good-alice-credential" });
    expect(again.body.user.id).toBe(login.body.user.id);
    expect(again.body.user.branch).toBe("CSE");

    const rot = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
    expect(rot.status).toBe(200);
    const replay = await request(app).post("/api/auth/refresh").send({ refreshToken: login.body.refreshToken });
    expect(replay.status).toBe(401);
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: rot.body.refreshToken })).status).toBe(401);

    const rows = await store.pool.query("select count(*)::int as n from auth_users");
    expect(rows.rows[0].n).toBe(1);
  });
});
