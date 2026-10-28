import { describe, expect, it } from "vitest";
import { loadConfig } from "../src/config/env.js";
import { hashToken, newRefreshToken, signAccessToken, verifyAccessToken } from "../src/services/tokens.js";
import { createGoogleVerifier } from "../src/services/google.js";

describe("config", () => {
  it("refuses a production start without a strong JWT_SECRET", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow(/JWT_SECRET/);
    expect(() => loadConfig({ JWT_SECRET: "short" })).toThrow(/JWT_SECRET/);
  });

  it("parses lists and defaults", () => {
    const c = loadConfig({ JWT_SECRET: "x".repeat(40), ALLOWED_EMAIL_DOMAINS: "A.com, b.com", ADMIN_EMAILS: "Me@A.com" });
    expect(c.allowedEmailDomains).toEqual(["a.com", "b.com"]);
    expect(c.adminEmails).toEqual(["me@a.com"]);
    expect(c.port).toBe(4100);
    expect(c.accessTtlSeconds).toBe(900);
  });
});

describe("tokens", () => {
  const cfg = loadConfig({ JWT_SECRET: "y".repeat(40) });

  it("round-trips access claims and rejects wrong audience", async () => {
    const t = await signAccessToken(cfg, { id: "u1", email: "a@b.c", role: "admin" });
    expect(await verifyAccessToken(cfg, t)).toEqual({ sub: "u1", email: "a@b.c", role: "admin" });
    const other = loadConfig({ JWT_SECRET: "y".repeat(40), JWT_AUDIENCE: "someone-else" });
    await expect(verifyAccessToken(other, t)).rejects.toThrow();
  });

  it("hashes refresh tokens deterministically", () => {
    const { token, hash } = newRefreshToken();
    expect(hashToken(token)).toBe(hash);
    expect(newRefreshToken().token).not.toBe(token);
  });
});

describe("google verifier without config", () => {
  it("answers 503 when GOOGLE_CLIENT_ID is missing", async () => {
    const g = createGoogleVerifier(loadConfig({ JWT_SECRET: "z".repeat(40) }));
    await expect(g.verifyIdToken("abc")).rejects.toMatchObject({ status: 503 });
  });
  it("answers 503 for the code flow without a client secret", async () => {
    const g = createGoogleVerifier(loadConfig({ JWT_SECRET: "z".repeat(40), GOOGLE_CLIENT_ID: "id" }));
    await expect(g.exchangeCode("c", "http://x")).rejects.toMatchObject({ status: 503 });
  });
});
