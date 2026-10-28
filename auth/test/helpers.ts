import type { Strategy } from "passport";
import type { Request } from "express";
import { loadConfig } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { MemoryStore } from "../src/services/memoryStore.js";
import type { GoogleIdentity } from "../src/services/store.js";

export const alice: GoogleIdentity = {
  sub: "google-sub-alice",
  email: "alice@jssaten.ac.in",
  emailVerified: true,
  name: "Alice",
  picture: "https://img/alice.png",
};

const people: Record<string, GoogleIdentity> = {
  alice,
  bob: { sub: "sub-bob", email: "bob@gmail.com", emailVerified: true, name: "Bob" },
  unverified: { ...alice, sub: "sub-u", emailVerified: false },
};

/**
 * Stand-in for passport-google-oauth20. Same contract: first hit redirects to Google
 * (with the state we pass in), the callback hit carries `?code=` and succeeds with a profile.
 */
export const fakeGoogleStrategy = {
  name: "google",
  authenticate(this: Record<string, (...a: unknown[]) => void>, req: Request, options: { state?: string }) {
    const code = req.query["code"];
    if (typeof code === "string" && people[code]) return this["success"]!(people[code]);
    if (typeof code === "string") return this["fail"]!("bad code");
    this["redirect"]!(`https://accounts.google.test/auth?state=${encodeURIComponent(options.state ?? "")}`);
  },
} as unknown as Strategy;

export function buildApp(env: Record<string, string> = {}) {
  const config = loadConfig({
    JWT_SECRET: "test-secret-test-secret-test-secret-123",
    GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
    FRONTEND_URL: "http://app.test",
    ...env,
  });
  const store = new MemoryStore();
  return { app: createApp({ config, store, strategy: fakeGoogleStrategy }), store, config };
}
