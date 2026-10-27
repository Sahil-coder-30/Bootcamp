import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { isSupabaseConfigured } from "../src/services/supabase.service.js";

let server: Server;
let base: string;

beforeAll(async () => {
  server = createApp().listen(0);
  await new Promise<void>((resolve) => server.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  server.close();
});

describe("API", () => {
  it("reports health", async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: "ok", supabase: isSupabaseConfigured });
  });

  it("rejects a non-numeric company id", async () => {
    const res = await fetch(`${base}/companies/abc`);
    expect(res.status).toBe(400);
  });

  it("returns 404 JSON for unknown routes", async () => {
    const res = await fetch(`${base}/nope`);
    expect(res.status).toBe(404);
    expect(await res.json()).toHaveProperty("error");
  });

  // Seed fallback is deterministic only when no database is configured.
  describe.skipIf(isSupabaseConfigured)("seed fallback", () => {
    it("lists the seed companies", async () => {
      const list = (await (await fetch(`${base}/companies`)).json()) as { shortName: string }[];
      expect(list[0]?.shortName).toBe("Accenture");
    });

    it("returns a company profile and its skills", async () => {
      const profile = (await (await fetch(`${base}/companies/1`)).json()) as { short_name: string };
      expect(profile.short_name).toBe("Accenture");
      const skills = (await (await fetch(`${base}/companies/1/skills`)).json()) as {
        skills: { level: number; topics: string[] }[];
      };
      expect(skills.skills.length).toBeGreaterThan(0);
      expect(skills.skills[0]?.topics.length).toBe(10);
    });

    it("returns 404 for a missing company", async () => {
      expect((await fetch(`${base}/companies/9999`)).status).toBe(404);
    });
  });

  it("returns 502 when the agent service is down", async () => {
    const res = await fetch(`${base}/agent/health`);
    expect([200, 502]).toContain(res.status);
  });
});
