import request from "supertest";
import { describe, expect, it } from "vitest";
import { buildApp } from "./helpers.js";

/** Runs the whole browser flow: /google -> (Google) -> /google/callback. Returns the final redirect. */
async function oauth(app: ReturnType<typeof buildApp>["app"], person = "alice", redirect?: string) {
  const start = await request(app).get("/api/auth/google").query(redirect ? { redirect } : {});
  expect(start.status).toBe(302);
  const state = new URL(start.headers["location"]!).searchParams.get("state")!;
  const cookie = (start.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
  const cb = await request(app).get("/api/auth/google/callback").query({ code: person, state }).set("Cookie", cookie);
  return { start, cb, state, cookie };
}

/** Pulls tokens out of the `#accessToken=..` fragment the SPA receives. */
function sessionFrom(location: string) {
  const url = new URL(location);
  const p = new URLSearchParams(url.hash.slice(1));
  return { url, accessToken: p.get("accessToken")!, refreshToken: p.get("refreshToken")!, redirect: p.get("redirect")! };
}

async function login(app: ReturnType<typeof buildApp>["app"], person = "alice") {
  const { cb } = await oauth(app, person);
  const s = sessionFrom(cb.headers["location"]!);
  const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${s.accessToken}`);
  return { accessToken: s.accessToken, refreshToken: s.refreshToken, user: me.body.user };
}

describe("google login (passport)", () => {
  it("redirects to Google, sets a nonce cookie and carries a signed state", async () => {
    const { app } = buildApp();
    const res = await request(app).get("/api/auth/google");
    expect(res.status).toBe(302);
    expect(res.headers["location"]).toMatch(/^https:\/\/accounts\.google\.test\/auth\?state=/);
    const cookie = String(res.headers["set-cookie"]);
    expect(cookie).toMatch(/oauth_nonce=.+HttpOnly/);
    expect(cookie).toMatch(/SameSite=Lax/);
  });

  it("answers 503 when Google is not configured", async () => {
    const { app } = buildApp({ GOOGLE_CLIENT_ID: "" });
    expect((await request(app).get("/api/auth/google")).status).toBe(503);
  });

  it("completes the flow, creates the user and hands tokens to the frontend", async () => {
    const { app } = buildApp();
    const { cb } = await oauth(app, "alice", "/talent-check");
    expect(cb.status).toBe(302);
    const s = sessionFrom(cb.headers["location"]!);
    expect(s.url.origin + s.url.pathname).toBe("http://app.test/auth/callback");
    expect(s.redirect).toBe("/talent-check");
    expect(s.accessToken.split(".")).toHaveLength(3);
    expect(s.refreshToken.length).toBeGreaterThan(40);
    // tokens travel in the fragment, never in the query string (not logged, not sent to servers)
    expect(s.url.search).toBe("");
    expect(String(cb.headers["set-cookie"])).toMatch(/oauth_nonce=;/);

    const me = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${s.accessToken}`);
    expect(me.body.user).toMatchObject({ email: "alice@jssaten.ac.in", role: "student", resumeId: null });
  });

  it("reuses the same user on the second login", async () => {
    const { app } = buildApp();
    const a = await login(app);
    const b = await login(app);
    expect(b.user.id).toBe(a.user.id);
  });

  it("never redirects to another site after login", async () => {
    const { app } = buildApp();
    for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com"]) {
      const { cb } = await oauth(app, "alice", bad);
      expect(sessionFrom(cb.headers["location"]!).redirect).toBe("/");
    }
  });

  it("rejects a callback without the nonce cookie or with a forged state", async () => {
    const { app } = buildApp();
    const { state } = await oauth(app);
    const noCookie = await request(app).get("/api/auth/google/callback").query({ code: "alice", state });
    expect(noCookie.headers["location"]).toMatch(/^http:\/\/app\.test\/login\?error=/);

    const forged = await request(app).get("/api/auth/google/callback").query({ code: "alice", state: "x.y.z" });
    expect(forged.headers["location"]).toMatch(/\/login\?error=/);

    const other = buildApp({ JWT_SECRET: "another-secret-another-secret-another-1" });
    const foreign = (await oauth(other.app)).state;
    const wrongKey = await request(app).get("/api/auth/google/callback").query({ code: "alice", state: foreign });
    expect(wrongKey.headers["location"]).toMatch(/\/login\?error=/);
  });

  it("reports a cancelled consent screen and a failed Google exchange", async () => {
    const { app } = buildApp();
    const cancelled = await request(app).get("/api/auth/google/callback").query({ error: "access_denied" });
    expect(new URL(cancelled.headers["location"]!).searchParams.get("error")).toMatch(/cancelled/);
    const { start } = await oauth(app);
    const state = new URL(start.headers["location"]!).searchParams.get("state")!;
    const cookie = (start.headers["set-cookie"] as unknown as string[]).map((c) => c.split(";")[0]).join("; ");
    const bad = await request(app).get("/api/auth/google/callback").query({ code: "nobody", state }).set("Cookie", cookie);
    expect(bad.headers["location"]).toMatch(/\/login\?error=/);
  });

  it("rejects an unverified email and enforces ALLOWED_EMAIL_DOMAINS", async () => {
    const { app } = buildApp();
    expect((await oauth(app, "unverified")).cb.headers["location"]).toMatch(/\/login\?error=/);

    const limited = buildApp({ ALLOWED_EMAIL_DOMAINS: "jssaten.ac.in" }).app;
    expect((await oauth(limited, "alice")).cb.headers["location"]).toMatch(/\/auth\/callback#/);
    const denied = (await oauth(limited, "bob")).cb.headers["location"]!;
    expect(new URL(denied).searchParams.get("error")).toMatch(/limited to: jssaten\.ac\.in/);
  });

  it("gives admin role to ADMIN_EMAILS", async () => {
    const { app } = buildApp({ ADMIN_EMAILS: "alice@jssaten.ac.in" });
    expect((await login(app)).user.role).toBe("admin");
  });
});

describe("refresh tokens", () => {
  it("rotates the refresh token and the old one stops working (reuse revokes the family)", async () => {
    const { app } = buildApp();
    const first = (await login(app));
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
    const s = (await login(app));
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
  });

  it("logout revokes the session", async () => {
    const { app } = buildApp();
    const s = (await login(app));
    expect((await request(app).post("/api/auth/logout").send({ refreshToken: s.refreshToken })).status).toBe(204);
    expect((await request(app).post("/api/auth/refresh").send({ refreshToken: s.refreshToken })).status).toBe(401);
  });

  it("logout-all revokes every session of the user", async () => {
    const { app } = buildApp();
    const a = (await login(app));
    const b = (await login(app));
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
    const token = (await login(b.app)).accessToken;
    expect((await request(a.app).get("/api/auth/me").set("Authorization", `Bearer ${token}`)).status).toBe(401);
  });

  it("reads and updates the profile, including resume_id", async () => {
    const { app } = buildApp();
    const { accessToken } = (await login(app));
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
    const { accessToken } = (await login(app));
    const res = await request(app).patch("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).send({ role: "admin" });
    expect(res.status).toBe(400);
  });

  it("validates fields", async () => {
    const { app } = buildApp();
    const { accessToken } = (await login(app));
    const res = await request(app).patch("/api/auth/me").set("Authorization", `Bearer ${accessToken}`).send({ graduationYear: 1800 });
    expect(res.status).toBe(400);
  });
});

describe("verify endpoint and misc", () => {
  it("/auth/verify returns identity headers for gateways", async () => {
    const { app } = buildApp();
    const { accessToken, user } = (await login(app));
    const res = await request(app).get("/api/auth/verify").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.headers["x-user-id"]).toBe(user.id);
    expect(res.headers["x-user-role"]).toBe("student");
  });

  it("answers health probes and 404s", async () => {
    const { app } = buildApp();
    expect((await request(app).get("/healthz")).status).toBe(200);
    expect((await request(app).get("/readyz")).status).toBe(200);
    expect((await request(app).get("/nope")).status).toBe(404);
  });
});
