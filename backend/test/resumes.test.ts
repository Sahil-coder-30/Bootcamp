import { describe, it, expect, beforeAll, afterAll } from "vitest";
import type { Server } from "node:http";
import { createApp } from "../src/app.js";

describe("Resume Parsing HTTP Endpoints", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = createApp();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("bad address");
    base = `http://127.0.0.1:${addr.port}/api`;
  });

  afterAll(
    async () =>
      new Promise<void>((resolve) => {
        server?.close(() => resolve());
      }),
  );

  it("GET /api/resumes/sample/ananya returns 200 with complete extraction", async () => {
    const res = await fetch(`${base}/resumes/sample/ananya`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.name).toBe("Ananya Rao");
    expect(body.skills.length).toBeGreaterThan(0);
    expect(Object.keys(body.category_levels)).toHaveLength(12);
    expect(body.category_levels.SYSD).toBeGreaterThanOrEqual(5);
  });

  it("POST /api/resumes/parse with sample_key returns 200", async () => {
    const res = await fetch(`${base}/resumes/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sample_key: "karthik" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.candidate.name).toContain("Karthik");
    expect(body.category_levels.SQL).toBeGreaterThanOrEqual(5);
  });

  it("POST /api/resumes/levels/infer recalculates Bloom levels", async () => {
    const sampleRes = await fetch(`${base}/resumes/sample/rohan`);
    const extraction = await sampleRes.json();

    const res = await fetch(`${base}/resumes/levels/infer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ extraction }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.category_levels).toBeDefined();
    expect(Object.keys(body.category_levels)).toHaveLength(12);
  });
});
