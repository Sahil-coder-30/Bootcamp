// /api/flow/profile: parsed resume -> saved profile that Skill Match / Talent Check can look up by id.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("../src/services/supabase.service.js", () => ({ supabase: null, isSupabaseConfigured: false }));

import { createApp } from "../src/app.js";
import { FALLBACK_SAMPLES } from "../src/services/resumes.service.js";
import { getProfile } from "../src/services/talentCheck.service.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api/flow`;
});
afterAll(() => {
  server.close();
});

const post = (body: unknown) =>
  fetch(`${base}/profile`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

describe("POST /api/flow/profile", () => {
  it("creates a profile from a resume extraction, then refreshes it by email", async () => {
    const first = await post({ extraction: FALLBACK_SAMPLES.karthik });
    expect(first.status).toBe(200);
    const a = await first.json();
    expect(a.created).toBe(true);
    expect(a.profile.name).toBe("Karthik Subramaniam");
    expect(a.profile.skill_levels.SQL.level).toBe(7);

    const second = await (await post({ extraction: FALLBACK_SAMPLES.karthik })).json();
    expect(second.created).toBe(false);
    expect(second.profile_id).toBe(a.profile_id);
    expect(second.profile.version).toBe(2);
  });

  it("makes the saved profile visible to Talent Check / Skill Match", async () => {
    const saved = await (await post({ extraction: FALLBACK_SAMPLES.rohan })).json();
    const p = await getProfile(saved.profile_id);
    expect(p.name).toBe("Rohan Verma");
    expect((p as any).skills.length).toBeGreaterThan(0);
    expect(p.id).toBe(saved.profile_id);
  });

  it("rejects a missing extraction", async () => {
    expect((await post({})).status).toBe(422);
  });
});
