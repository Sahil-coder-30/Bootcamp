import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./helpers.js";

async function login(app: ReturnType<typeof buildApp>["app"], credential = "good-alice-credential") {
  const res = await request(app).post("/api/auth/google").send({ credential });
  return res;
}

describe("google login", () => {
  it("creates the user and returns access + refresh tokens", async () => {
    const { app } = buildApp();
    const res = await login(app);
    expect(res.status).toBe(200);
    expect(res.body.tokenType).toBe("Bearer");
    expect(res.body.expiresIn).toBe(900);
    expect(res.body.user).toMatchObject({ email: "alice@jssaten.ac.in", role: "student", resumeId: null });
    expect(res.body.accessToken.split(".")).toHaveLength(3);
    expect(res.body.refreshToken.length).toBeGreaterThan(40);
  });

  it("reuses the same user on the second login", async () => {
    const { app } = buildApp();
    const a = await login(app);
    const b = await login(app);
    expect(b.body.user.id).toBe(a.body.user.id);
  });

  it("rejects a bad credential and a missing body", async () => {
    const { app } = buildApp();
    expect((await login(app, "nonsense-credential")).status).toBe(401);
    expect((await request(app).post("/api/auth/google").send({})).status).toBe(400);
  });

  it("rejects an unverified email", async () => {
    const { app } = buildApp();
    expect((await login(app, "unverified-credential")).status).toBe(403);
  });

  it("enforces ALLOWED_EMAIL_DOMAINS", async () => {
    const { app } = buildApp({ ALLOWED_EMAIL_DOMAINS: "jssaten.ac.in" });
    expect((await login(app, "good-alice-credential")).status).toBe(200);
    expect((await login(app, "good-bob-credential")).status).toBe(403);
  });

  it("gives admin role to ADMIN_EMAILS", async () => {
    const { app } = buildApp({ ADMIN_EMAILS: "alice@jssaten.ac.in" });
    expect((await login(app)).body.user.role).toBe("admin");
  });

  it("supports the authorization code flow", async () => {
    const { app } = buildApp();
    const ok = await request(app).post("/api/auth/google/code").send({ code: "good-code", redirectUri: "http://localhost:5173/auth/callback" });
    expect(ok.status).toBe(200);
    const bad = await request(app).post("/api/auth/google/code").send({ code: "bad-code", redirectUri: "http://localhost:5173/auth/callback" });
    expect(bad.status).toBe(401);
  });
});

describe("refresh tokens", () => {
  it("rotates the refresh token and the old one stops working (reuse revokes the family)", async () => {
    const { app } = buildApp();
    const first = (await login(app)).body;
    const second = await request(app).post("/api/auth/refresh").send({ refreshToken: first.refreshToken });
    expect(second.status).toBe(200);
    expect(second.body.refreshToken).not.toBe(first.refreshToken);

    const replay = await request(app).post("/api/auth/refresh").send({ refreshToken: first.refreshToken });
    expect(replay.status).toBe(401);
    // the newest token in that family is now revoked too
    const afterReplay = await request(app).post("/api/auth/refresh").send({ refreshToken: second.body.refreshToken });
    expect(afterReplay.status).toBe(401);
  });

  it("rejects unknown and expired refresh tokens", async () => {
    const { app } = buildApp({ REFRESH_TOKEN_TTL_DAYS: "-1" });
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: "x".repeat(30) })).status).toBe(401);
    const s = (await login(app)).body;
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
  });

  it("logout revokes the session", async () => {
    const { app } = buildApp();
    const s = (await login(app)).body;
    expect((await request(app).post("/api/auth/logout").send({ refreshToken: s.refreshToken })).status).toBe(204);
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
  });

  it("logout-all revokes every session of the user", async () => {
    const { app } = buildApp();
    const a = (await login(app)).body;
    const b = (await login(app)).body;
    const res = await request(app).post("/api/auth/logout-all").set("Authorization", `Bearer ${a.accessToken}`);
    expect(res.status).toBe(204);
    for (const s of [a, b]) {
      expect((await request(app).post("/api/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
    }
  });
});

describe("profile (/me)", () => {
  it("requires a bearer token", async () => {
    const { app } = buildApp();
    expect((await request(app).get("/api/auth/me")).status).toBe(401);
    expect((await request(app).get("/api/auth/me").set("Authorization", "Bearer garbage")).status).toBe(401);
  });

  it("rejects a token signed with another secret", async () => {
    const a = buildApp();
    const b = buildApp({ JWT_SECRET: "another-secret-another-secret-another-1" });
    const token = (await login(b.app)).body.accessToken;
    expect((await request(a.app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("reads and updates the profile, including resume_id", async () => {
    const { app } = buildApp();
    const { accessToken } = (await login(app)).body;
    const auth = { Authorization: `Bearer ${accessToken}` };

    const me = await request(app).get("/api/auth/me").set(auth);
    expect(me.body.user.email).toBe("alice@jssaten.ac.in");

    const patch = await request(app)
      .patch("/api/auth/me")
      .set(auth)
      .send({ branch: "CSE", graduationYear: 2027, resumeId: "6f1c2d3e-0000-4000-8000-000000000001" });
    expect(patch.status).toBe(200);
    expect(patch.body.user).toMatchObject({ branch: "CSE", graduationYear: 2027, resumeId: "6f1c2d3e-0000-4000-8000-000000000001" });

    const unlink = await request(app).patch("/api/auth/me").set(auth).send({ resumeId: null });
    expect(unlink.body.user.resumeId).toBeNull();
  });

  it("does not allow changing email or role through the profile", async () => {
    const { app } = buildApp();
    const { accessToken } = (await login(app)).body;
    const res = await request(app).patch("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).send({ role: "admin" });
    expect(res.status).toBe(400);
  });

  it("validates fields", async () => {
    const { app } = buildApp();
    const { accessToken } = (await login(app)).body;
    const res = await request(app).patch("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).send({ graduationYear: 1800 });
    expect(res.status).toBe(400);
  });
});

describe("verify endpoint and misc", () => {
  it("/auth/verify returns identity headers for gateways", async () => {
    const { app } = buildApp();
    const { accessToken, user } = (await login(app)).body;
    const res = await request(app).get("/api/auth/verify").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["x-user-id"]).toBe(user.id);
    expect(res.headers["x-user-role"]).toBe("student");
  });

  it("exposes the public google client id", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/auth/config");
    expect(res.body.googleClientId).toBe("client-id.apps.googleusercontent.com");
  });

  it("answers health probes and 404s", async () => {
    const { app } = buildApp();
    expect((await request(app).get("/healthz")).status).toBe(200);
    expect((await request(app).get("/readyz")).status).toBe(200);
    expect((await request(app).get("/nope")).status).toBe(404);
  });
});
