// Backend side of the auth service: bearer tokens signed by ../auth are verified here.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { SignJWT } from "jose";

const SECRET = "test-secret-test-secret-test-secret-123";
vi.hoisted(() => {
  process.env["JWT_SECRET"] = "test-secret-test-secret-test-secret-123";
});

import { createApp } from "../src/app.js";
import { userHeaders, verifyBearer } from "../src/middlewares/auth.js";

const sign = (opts: { secret?: string; aud?: string; exp?: string } = {}) =>
  new SignJWT({ email: "a@b.c", role: "student" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("user-1")
    .setIssuer("placeintel-auth")
    .setAudience(opts.aud ?? "placeintel")
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "5m")
    .sign(new TextEncoder().encode(opts.secret ?? SECRET));

let server: Server;
let origin: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
});

describe("bearer verification", () => {
  it("/api/whoami needs a token", async () => {
    expect((await fetch(`${origin}/api/whoami`)).status).toBe(401);
  });

  it("accepts a valid token", async () => {
    const res = await fetch(`${origin}/api/whoami`, { headers: { Authorization: `Bearer ${await sign()}` } });
    expect(res.status).toBe(200);
    expect((await res.json()).user).toEqual({ id: "user-1", email: "a@b.c", role: "student" });
  });

  it.each([
    ["wrong secret", () => sign({ secret: "another-secret-another-secret-another-1" })],
    ["wrong audience", () => sign({ aud: "other" })],
    ["expired", () => sign({ exp: "-1m" })],
  ])("rejects a token with %s, even on public routes", async (_name, make) => {
    const res = await fetch(`${origin}/api/health`, { headers: { Authorization: `Bearer ${await make()}` } });
    expect(res.status).toBe(401);
  });

  it("keeps public routes open without a token", async () => {
    expect((await fetch(`${origin}/api/health`)).status).toBe(200);
  });

  it("verifyBearer and userHeaders", async () => {
    const user = await verifyBearer(await sign());
    expect(userHeaders({ user } as never)).toEqual({ "X-User-Id": "user-1", "X-User-Email": "a@b.c", "X-User-Role": "student" });
    expect(userHeaders({} as never)).toEqual({});
  });
});
