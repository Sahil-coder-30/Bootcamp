// /api/telegram: the link-code endpoint and the webhook mount point.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Never touch a real database, and never start the real bot, even with a local .env.
vi.mock("../src/services/supabase.service.js", () => ({ supabase: null, isSupabaseConfigured: false }));

const state = vi.hoisted(() => ({ username: undefined as string | undefined }));
vi.mock("../src/bot/index.js", async () => {
  const { createMemoryLinkStore } = await import("../src/bot/linkStore.js");
  const store = createMemoryLinkStore();
  return {
    botUsername: () => state.username,
    getTelegramLinkStore: () => store,
    // webhook mode is off in this test: pass through to the 404 handler
    telegramWebhook: (_req: unknown, _res: unknown, next: () => void) => next(),
  };
});

import { createApp } from "../src/app.js";
import { getTelegramLinkStore } from "../src/bot/index.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => {
  server.close();
});
beforeEach(() => {
  state.username = "placeintel_test_bot";
});

const ANANYA = "3a000000-0000-4000-8000-000000000001";
const post = (path: string, body?: unknown) =>
  fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

describe("GET /api/telegram/status", () => {
  it("says the bot is on, with its username", async () => {
    const res = await fetch(`${base}/api/telegram/status`);
    expect(await res.json()).toEqual({ enabled: true, username: "placeintel_test_bot" });
  });

  it("says it is off when the bot is not running", async () => {
    state.username = undefined;
    const res = await fetch(`${base}/api/telegram/status`);
    expect(await res.json()).toEqual({ enabled: false, username: null });
  });
});

describe("POST /api/telegram/link-code", () => {
  it("returns a one-time code and a t.me deep link for an existing profile", async () => {
    const res = await post("/api/telegram/link-code", { profile_id: ANANYA });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { code: string; url: string; expires_at: string };
    expect(body.code).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(body.url).toBe(`https://t.me/placeintel_test_bot?start=${body.code}`);
    expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now());
    // the code really is redeemable, once, and links that profile
    expect(await getTelegramLinkStore().redeem(body.code, 321)).toBe(ANANYA);
    expect(await getTelegramLinkStore().redeem(body.code, 322)).toBeNull();
  });

  it("is 404 for a profile that does not exist", async () => {
    const res = await post("/api/telegram/link-code", { profile_id: "3a000000-0000-4000-8000-0000000000ff" });
    expect(res.status).toBe(404);
  });

  it("is 400 without a profile_id", async () => {
    const res = await post("/api/telegram/link-code", {});
    expect(res.status).toBe(400);
    expect(((await res.json()) as { issues: { path: string }[] }).issues[0]?.path).toBe("profile_id");
  });

  it("is 503 with a clear message when the bot is not running", async () => {
    state.username = undefined;
    const res = await post("/api/telegram/link-code", { profile_id: ANANYA });
    expect(res.status).toBe(503);
    expect(((await res.json()) as { error: string }).error).toMatch(/TELEGRAM_BOT_TOKEN/);
  });
});

describe("POST /telegram/webhook", () => {
  it("is a plain 404 while webhook mode is off", async () => {
    expect((await post("/telegram/webhook", { update_id: 1 })).status).toBe(404);
  });
});
