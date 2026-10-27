import { afterAll, beforeAll, describe, it, expect } from "vitest";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createApp } from "../src/app.js";
import { getCompanyBar, resolveCompanyId } from "../src/services/companyBar.service.js";

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

describe("Talent Check Company Skill Bar & Resolver", () => {
  it("resolves canonical company aliases accurately", async () => {
    const google = await resolveCompanyId("Google LLC");
    expect(google).not.toBeNull();
    expect(google?.company_id).toBe(4);

    const msft = await resolveCompanyId("Microsoft Corporation");
    expect(msft).not.toBeNull();
    expect(msft?.company_id).toBe(78);

    const ofss = await resolveCompanyId("Oracle Financial Services Software");
    expect(ofss).not.toBeNull();
    expect(ofss?.company_id).toBe(24);
  });

  it("fetches company skill bar with 12 normalized rows", async () => {
    const bar = await getCompanyBar(4); // Google LLC
    expect(bar.company_id).toBe(4);
    expect(bar.rows.length).toBe(12);

    const cod = bar.rows.find((r) => r.category_code === "COD");
    expect(cod).toBeDefined();
    expect(cod?.required_level).toBe(8);
    expect(cod?.bloom_code).toBe("EV");
    expect(cod?.raw_bloom_code).toBe("CR");
    expect(cod?.bloom_mismatch).toBe(true); // Data-quality anomaly flagged
  });

  it("serves GET /api/companies/:id/skill-bar via HTTP", async () => {
    const res = await fetch(`${base}/companies/4/skill-bar`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company_id).toBe(4);
    expect(body.rows).toBeInstanceOf(Array);
    expect(body.rows.length).toBe(12);
  });

  it("returns 404 for unknown company skill bar", async () => {
    const res = await fetch(`${base}/companies/99999/skill-bar`);
    expect(res.status).toBe(404);
  });
});
