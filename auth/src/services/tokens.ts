import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { AuthConfig } from "../config/env.js";
import type { Role, User } from "./store.js";

export interface AccessClaims {
  sub: string;
  email: string;
  role: Role;
}

const key = (cfg: AuthConfig) => new TextEncoder().encode(cfg.jwtSecret);

export async function signAccessToken(cfg: AuthConfig, user: Pick<User, "id" | "email" | "role">): Promise<string> {
  return new SignJWT({ email: user.email, role: user.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(user.id)
    .setIssuer(cfg.jwtIssuer)
    .setAudience(cfg.jwtAudience)
    .setIssuedAt()
    .setExpirationTime(`${cfg.accessTtlSeconds}s`)
    .sign(key(cfg));
}

export async function verifyAccessToken(cfg: AuthConfig, token: string): Promise<AccessClaims> {
  const { payload } = await jwtVerify(token, key(cfg), {
    issuer: cfg.jwtIssuer,
    audience: cfg.jwtAudience,
    algorithms: ["HS256"],
  });
  if (!payload.sub || typeof payload["email"] !== "string") throw new Error("Malformed token");
  return { sub: payload.sub, email: payload["email"], role: payload["role"] === "admin" ? "admin" : "student" };
}

/** Refresh tokens are opaque random strings; only their SHA-256 is stored. */
export function newRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
