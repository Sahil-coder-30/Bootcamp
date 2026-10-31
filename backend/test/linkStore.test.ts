import { beforeEach, describe, expect, it, vi } from "vitest";

// ---- a fake Supabase query builder, enough for telegram_links / telegram_link_codes -----------
type Result = { data: unknown; error: unknown };
const results: Record<string, Result> = {};
const calls: { table: string; op: string; args: unknown[] }[] = [];

function builder(table: string) {
  let op = "select";
  const b: Record<string, unknown> = {};
  for (const method of ["insert", "delete", "upsert", "select", "eq", "gt"]) {
    b[method] = (...args: unknown[]) => {
      if (["insert", "delete", "upsert"].includes(method)) op = method;
      calls.push({ table, op: method, args });
      return b;
    };
  }
  const resolve = (): Result => results[`${table}.${op}`] ?? { data: null, error: null };
  b["maybeSingle"] = async () => resolve();
  b["then"] = (done: (r: Result) => unknown) => Promise.resolve(resolve()).then(done);
  return b;
}

vi.mock("../src/services/supabase.service.js", () => ({
  supabase: { from: (table: string) => builder(table) },
  isSupabaseConfigured: true,
}));

import { CODE_TTL_MS, createMemoryLinkStore, createSupabaseLinkStore, newCode } from "../src/bot/linkStore.js";

describe("newCode", () => {
  it("is 12 URL-safe characters (fits Telegram's /start payload) and differs each time", () => {
    const codes = new Set(Array.from({ length: 200 }, newCode));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(/^[A-Za-z0-9_-]{12}$/);
  });
});

describe("memory link store", () => {
  it("creates a code that links a chat once", async () => {
    const store = createMemoryLinkStore();
    const { code, expiresAt } = await store.createCode("p1");
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await store.redeem(code, 42)).toBe("p1");
    expect(await store.getProfileId(42)).toBe("p1");
    expect(await store.redeem(code, 43)).toBeNull(); // already used
    expect(await store.getProfileId(43)).toBeNull();
  });

  it("rejects unknown and expired codes, and burns an expired one", async () => {
    let now = 1_000_000;
    const store = createMemoryLinkStore(() => now);
    expect(await store.redeem("nope", 1)).toBeNull();
    const { code } = await store.createCode("p1");
    now += CODE_TTL_MS + 1;
    expect(await store.redeem(code, 1)).toBeNull();
    now -= CODE_TTL_MS + 1;
    expect(await store.redeem(code, 1)).toBeNull(); // gone for good
  });

  it("re-linking a chat replaces its profile; unlink removes it", async () => {
    const store = createMemoryLinkStore();
    await store.redeem((await store.createCode("p1")).code, 7);
    await store.redeem((await store.createCode("p2")).code, 7);
    expect(await store.getProfileId(7)).toBe("p2");
    expect(await store.unlink(7)).toBe(true);
    expect(await store.unlink(7)).toBe(false);
    expect(await store.getProfileId(7)).toBeNull();
  });
});

describe("supabase link store", () => {
  beforeEach(() => {
    for (const k of Object.keys(results)) delete results[k];
    calls.length = 0;
  });

  it("stores a code with an expiry ten minutes out", async () => {
    const { code, expiresAt } = await createSupabaseLinkStore().createCode("p1");
    const insert = calls.find((c) => c.table === "telegram_link_codes" && c.op === "insert")!;
    expect(insert.args[0]).toMatchObject({ code, profile_id: "p1" });
    expect(expiresAt.getTime() - Date.now()).toBeGreaterThan(CODE_TTL_MS - 5_000);
    expect(expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(CODE_TTL_MS);
  });

  it("redeems by deleting the unexpired code, then links the chat", async () => {
    results["telegram_link_codes.delete"] = { data: { profile_id: "p9" }, error: null };
    expect(await createSupabaseLinkStore().redeem("abc", 55)).toBe("p9");
    expect(calls).toContainEqual({ table: "telegram_link_codes", op: "eq", args: ["code", "abc"] });
    expect(calls.some((c) => c.table === "telegram_link_codes" && c.op === "gt" && c.args[0] === "expires_at")).toBe(true);
    const upsert = calls.find((c) => c.table === "telegram_links" && c.op === "upsert")!;
    expect(upsert.args[0]).toEqual({ chat_id: 55, profile_id: "p9" });
    expect(upsert.args[1]).toEqual({ onConflict: "chat_id" });
  });

  it("returns null and links nothing when no code row was deleted", async () => {
    results["telegram_link_codes.delete"] = { data: null, error: null };
    expect(await createSupabaseLinkStore().redeem("abc", 55)).toBeNull();
    expect(calls.some((c) => c.table === "telegram_links")).toBe(false);
  });

  it("looks a chat up and unlinks it", async () => {
    results["telegram_links.select"] = { data: { profile_id: "p3" }, error: null };
    const store = createSupabaseLinkStore();
    expect(await store.getProfileId(5)).toBe("p3");
    results["telegram_links.select"] = { data: null, error: null };
    expect(await store.getProfileId(6)).toBeNull();

    results["telegram_links.delete"] = { data: [{ chat_id: 5 }], error: null };
    expect(await store.unlink(5)).toBe(true);
    results["telegram_links.delete"] = { data: [], error: null };
    expect(await store.unlink(5)).toBe(false);
  });

  it("propagates database errors instead of pretending a link worked", async () => {
    results["telegram_link_codes.insert"] = { data: null, error: new Error("table missing") };
    await expect(createSupabaseLinkStore().createCode("p1")).rejects.toThrow("table missing");
    results["telegram_links.select"] = { data: null, error: new Error("boom") };
    await expect(createSupabaseLinkStore().getProfileId(1)).rejects.toThrow("boom");
  });
});
