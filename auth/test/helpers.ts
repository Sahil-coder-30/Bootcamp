import { loadConfig } from "../src/config/env.js";
import { createApp } from "../src/app.js";
import { MemoryStore } from "../src/services/memoryStore.js";
import { HttpError } from "../src/middlewares/errorHandler.js";
import type { GoogleVerifier } from "../src/services/google.js";
import type { GoogleIdentity } from "../src/services/store.js";

export const alice: GoogleIdentity = {
  sub: "google-sub-alice",
  email: "alice@jssaten.ac.in",
  emailVerified: true,
  name: "Alice",
  picture: "https://img/alice.png",
};

/** Fake Google: credential "good:<email>" verifies, anything else is rejected. */
export const fakeGoogle: GoogleVerifier = {
  async verifyIdToken(token) {
    if (token === "good-alice-credential") return alice;
    if (token === "good-bob-credential") return { sub: "sub-bob", email: "bob@gmail.com", emailVerified: true, name: "Bob" };
    if (token === "unverified-credential") return { ...alice, sub: "sub-u", emailVerified: false };
    throw new HttpError(401, "Invalid Google credential");
  },
  async exchangeCode(code) {
    if (code === "good-code") return alice;
    throw new HttpError(401, "Google rejected the authorization code");
  },
};

export function buildApp(env: Record<string, string> = {}) {
  const config = loadConfig({
    JWT_SECRET: "test-secret-test-secret-test-secret-123",
    GOOGLE_CLIENT_ID: "client-id.apps.googleusercontent.com",
    ...env,
  });
  const store = new MemoryStore();
  return { app: createApp({ config, store, google: fakeGoogle }), store, config };
}
