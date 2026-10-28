import { SignJWT, jwtVerify } from "jose";
import { randomBytes } from "node:crypto";
import type { AuthConfig } from "../config/env.js";

export const NONCE_COOKIE = "oauth_nonce";

const key = (cfg: AuthConfig) => new TextEncoder().encode(cfg.jwtSecret);

/** Only same-site paths are allowed as a post-login target (no open redirect). */
export function safeRedirect(target: unknown): string {
  return typeof target === "string" && target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")
    ? target
    : "/";
}

/**
 * The OAuth `state` is a short-lived signed token holding a random nonce and the page to return to.
 * The same nonce is set as an httpOnly cookie, so the callback only works in the browser that started
 * the login (CSRF protection without server-side sessions).
 */
export async function createState(cfg: AuthConfig, redirect: string): Promise<{ state: string; nonce: string }> {
  const nonce = randomBytes(16).toString("base64url");
  const state = await new SignJWT({ nonce, redirect })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(`${cfg.jwtIssuer}/oauth-state`)
    .setIssuedAt()
    .setExpirationTime("10m")
    .sign(key(cfg));
  return { state, nonce };
}

export async function readState(cfg: AuthConfig, state: string): Promise<{ nonce: string; redirect: string }> {
  const { payload } = await jwtVerify(state, key(cfg), {
    issuer: `${cfg.jwtIssuer}/oauth-state`,
    algorithms: ["HS256"],
  });
  return { nonce: String(payload["nonce"]), redirect: safeRedirect(payload["redirect"]) };
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? "").split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}
