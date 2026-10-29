import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { loadConfig } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { runMigrations } from "../src/migrate.js";
import { PgStore } from "../src/services/pgStore.js";
import { fakeGoogleStrategy } from "./helpers.js";

// Runs against a real Postgres when TEST_DATABASE_URL is set (CI provides one); skipped otherwise.
const url = process.env["TEST_DATABASE_URL"];

async function signIn(app: ReturnType<typeof createApp>, state: string, cookie: string) {
  const cb = await request(app).get("/api/auth/google/callback").query({ code: "alice", state }).set("Cookie", cookie);
  const p = new URLSearchParams(new URL(cb.headers["location"]!).hash.slice(1));
  return { accessToken: p.get("accessToken")!, refreshToken: p.get("refreshToken")! };
}

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
    const config = loadConfig({ JWT_SECRET: "test-secret-test-secret-test-secret-123", GOOGLE_CLIENT_ID: "id", FRONTEND_URL: "http://app.test" });
    const app = createApp({ config, store, strategy: fakeGoogleStrategy });

    expect((await request(app).get("/readyz")).status).toBe(200);
    const start = await request(app).get("/api/auth/google");
    const state = new URL(start.headers["location"]!).searchParams.get("state")!;
    const cookie = (start.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const login = await signIn(app, state, cookie);
    const auth = { Authorization: `Bearer ${login.accessToken}` };

    const patched = await request(app).patch("/api/auth/me").set(auth).send({ branch: "CSE", resumeId: "abc-123", graduationYear: 2027 });
    expect(patched.body.user).toMatchObject({ branch: "CSE", resumeId: "abc-123", graduationYear: 2027 });

    const again = await signIn(app, state, cookie);
    const me = await request(app).get("/api/auth/me").set({ Authorization: `Bearer ${again.accessToken}` });
    expect(me.body.user.branch).toBe("CSE");

    const rot = await request(app).post("/api/auth/refresh").send({ refreshToken: login.refreshToken });
    expect(rot.status).toBe(200);
    const replay = await request(app).post("/api/auth/refresh").send({ refreshToken: login.refreshToken });
    expect(replay.status).toBe(401);
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: rot.body.refreshToken })).status).toBe(401);

    const rows = await store.pool.query("select count(*)::int as n from auth_users");
    expect(rows.rows[0].n).toBe(1);
  });
});
