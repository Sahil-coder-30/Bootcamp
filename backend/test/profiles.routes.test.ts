// HTTP contract of /api/profiles: status codes, ETag/Location headers, error bodies.
// PROFILES_STORE=memory (vitest.config.ts) keeps this off any real database.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

// Never touch a real database from these tests, even when a local .env configures one.
vi.mock("../src/services/supabase.service.js", () => ({ supabase: null, isSupabaseConfigured: false }));

import { createApp } from "../src/app.js";
import { SEED_PROFILES } from "../src/data/seedProfiles/index.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/profiles`;
});
afterAll(() => {
  server.close();
});

const ANANYA = "3a000000-0000-4000-8000-000000000001";
const { id: _i, version: _v, updated_at: _u, ...ananyaInput } = structuredClone(SEED_PROFILES[0]!);

const send = (path: string, method: string, body?: unknown, headers: Record<string, string> = {}) =>
  fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...headers },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });

const fresh = (n: string) => ({ ...ananyaInput, name: `Route Test ${n}`, email: `route.${n}@example.com` });

describe("GET /api/profiles", () => {
  it("lists the 4 seed profiles as summaries", async () => {
    const res = await send("", "GET");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { items: { name: string; levels: object }[]; next_cursor: string | null };
    expect(body.items.map((i) => i.name)).toEqual(expect.arrayContaining(["Ananya Rao", "Priya Menon"]));
    expect(Object.keys(body.items[0]!.levels)).toHaveLength(12);
  });

  it("validates query params", async () => {
    expect((await send("?limit=0", "GET")).status).toBe(400);
    expect((await send("?limit=101", "GET")).status).toBe(400);
    expect((await send("?cursor=nonsense", "GET")).status).toBe(400);
    expect((await send("?limit=2", "GET")).status).toBe(200);
  });

  it("looks up by email", async () => {
    const res = await send("?email=ANANYA.RAO@example.com", "GET");
    expect(((await res.json()) as { items: unknown[] }).items).toHaveLength(1);
  });
});

describe("GET /api/profiles/:id", () => {
  it("returns the profile with an ETag, and 304 when unchanged", async () => {
    const res = await send(`/${ANANYA}`, "GET");
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"1"');
    expect(await res.json()).toMatchObject({ id: ANANYA, name: "Ananya Rao", version: 1 });
    const again = await send(`/${ANANYA}`, "GET", undefined, { "If-None-Match": '"1"' });
    expect(again.status).toBe(304);
  });

  it("is 404 for an unknown id", async () => {
    expect((await send("/3a000000-0000-4000-8000-0000000000ff", "GET")).status).toBe(404);
  });
});

describe("POST /api/profiles", () => {
  it("creates with 201, ETag and Location", async () => {
    const res = await send("", "POST", fresh("create"));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: string; version: number };
    expect(res.headers.get("etag")).toBe('"1"');
    expect(res.headers.get("location")).toBe(`/api/profiles/${body.id}`);
    expect(body.version).toBe(1);
  });

  it("accepts a profile read from the API (server fields are ignored)", async () => {
    const read = (await (await send(`/${ANANYA}`, "GET")).json()) as Record<string, unknown>;
    const res = await send("", "POST", { ...read, name: "Echo Test", email: "echo.test@example.com" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { id: string }).id).not.toBe(ANANYA);
  });

  it("409 for a duplicate email, case-insensitively, with existing_profile_id", async () => {
    const res = await send("", "POST", { ...fresh("dup"), email: "ANANYA.RAO@example.com" });
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "A profile with this email already exists",
      existing_profile_id: ANANYA,
    });
  });

  it("400 with path-level issues", async () => {
    const bad = { ...fresh("bad"), internships: [{ title: "Intern", org: "Acme", start: "2025-08", end: "2025-07" }] };
    const res = await send("", "POST", bad);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: { path: string; message: string }[] };
    expect(body.error).toBe("Validation failed");
    expect(body.issues).toContainEqual({ path: "internships.0.end", message: "End is before start" });
  });

  it("400 when skill_levels is missing", async () => {
    const { skill_levels: _s, ...noLevels } = fresh("nolevels");
    const res = await send("", "POST", noLevels);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { issues: { path: string }[] }).issues.map((i) => i.path)).toContain("skill_levels");
  });

  it("records X-Change-Source and rejects unknown values", async () => {
    const ok = await send("", "POST", fresh("src"), { "X-Change-Source": "json_import" });
    const id = ((await ok.json()) as { id: string }).id;
    const hist = (await (await send(`/${id}/versions`, "GET")).json()) as { items: { change_source: string }[] };
    expect(hist.items[0]?.change_source).toBe("json_import");
    expect((await send("", "POST", fresh("src2"), { "X-Change-Source": "magic" })).status).toBe(400);
  });
});

describe("PUT /api/profiles/:id", () => {
  async function created(n: string) {
    return (await (await send("", "POST", fresh(n))).json()) as { id: string; version: number };
  }

  it("428 without If-Match", async () => {
    const { id } = await created("put428");
    const res = await send(`/${id}`, "PUT", fresh("put428"));
    expect(res.status).toBe(428);
  });

  it("updates with If-Match and bumps the version and ETag", async () => {
    const { id } = await created("put200");
    const res = await send(`/${id}`, "PUT", { ...fresh("put200"), name: "Renamed Person" }, { "If-Match": '"1"' });
    expect(res.status).toBe(200);
    expect(res.headers.get("etag")).toBe('"2"');
    expect(await res.json()).toMatchObject({ name: "Renamed Person", version: 2 });
  });

  it("412 with the current profile when the version is stale", async () => {
    const { id } = await created("put412");
    await send(`/${id}`, "PUT", { ...fresh("put412"), name: "First Writer" }, { "If-Match": '"1"' });
    const res = await send(`/${id}`, "PUT", { ...fresh("put412"), name: "Second Writer" }, { "If-Match": '"1"' });
    expect(res.status).toBe(412);
    const body = (await res.json()) as { current_version: number; current: { name: string } };
    expect(body).toMatchObject({ current_version: 2, current: { name: "First Writer" } });
  });

  it("accepts an unquoted version and rejects a malformed one", async () => {
    const { id } = await created("putfmt");
    expect((await send(`/${id}`, "PUT", fresh("putfmt"), { "If-Match": "abc" })).status).toBe(400);
    expect((await send(`/${id}`, "PUT", fresh("putfmt"), { "If-Match": "1" })).status).toBe(200);
  });

  it("404 for an unknown id", async () => {
    const res = await send("/3a000000-0000-4000-8000-0000000000ff", "PUT", fresh("none"), { "If-Match": '"1"' });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/profiles/from-resume", () => {
  it("is not captured by /:id and returns the draft envelope", async () => {
    const res = await send("/from-resume", "POST", { resume_extraction_id: "e1000000-0000-4000-8000-000000000001" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(Object.keys(body).sort()).toEqual(["diff", "draft", "existing_profile_id", "provenance", "warnings"]);
    expect(body["existing_profile_id"]).toBe(ANANYA);
  });

  it("400 for a bad body, 404 for an unknown extraction", async () => {
    expect((await send("/from-resume", "POST", { resume_extraction_id: "nope" })).status).toBe(400);
    const res = await send("/from-resume", "POST", { resume_extraction_id: "e1000000-0000-4000-8000-0000000000ff" });
    expect(res.status).toBe(404);
  });
});

describe("versions, cv-url and delete", () => {
  it("lists history, 404 cv-url without a CV, and deletes with 204", async () => {
    const { id } = (await (await send("", "POST", fresh("life"))).json()) as { id: string };
    expect(((await (await send(`/${id}/versions`, "GET")).json()) as { items: unknown[] }).items).toHaveLength(1);
    expect((await send(`/${id}/cv-url`, "GET")).status).toBe(404);
    expect((await send(`/${id}`, "DELETE")).status).toBe(204);
    expect((await send(`/${id}`, "GET")).status).toBe(404);
  });
});

describe("GET /api/profiles/calibration/:code", () => {
  it("returns the topics for levels L-1..L+1 (bundled ladder without a database)", async () => {
    const res = await send("/calibration/dsa?level=5", "GET");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { code: string; levels: { level: number; topics: string[] }[]; source: string };
    expect(body.code).toBe("DSA");
    expect(body.levels.map((l) => l.level)).toEqual([4, 5, 6]);
    expect(body.levels.every((l) => l.topics.length > 0)).toBe(true);
  });

  it("clamps the window at the ends of the scale", async () => {
    const low = (await (await send("/calibration/DSA?level=1", "GET")).json()) as { levels: { level: number }[] };
    expect(low.levels.map((l) => l.level)).toEqual([1, 2]);
    const high = (await (await send("/calibration/DSA?level=10", "GET")).json()) as { levels: { level: number }[] };
    expect(high.levels.map((l) => l.level)).toEqual([9, 10]);
  });

  it("reports source 'none' for a category without a ladder, and validates input", async () => {
    const cod = (await (await send("/calibration/COD?level=5", "GET")).json()) as { source: string };
    expect(cod.source).toBe("none");
    expect((await send("/calibration/XYZ", "GET")).status).toBe(400);
    expect((await send("/calibration/DSA?level=11", "GET")).status).toBe(400);
  });
});
