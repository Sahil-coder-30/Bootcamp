import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

const SAMPLE_PAYLOADS: Record<string, any> = {
  ananya: {
    candidate: { name: "Ananya Rao", email: "ananya.rao@example.com", links: [] },
    role: "Systems / Software Engineer",
    skills: [
      { skill_name: "Go", category_code: "COD", confidence: "high", evidence: "Kafka in Go" },
      { skill_name: "Distributed Systems", category_code: "SYSD", confidence: "high", evidence: "Raft" },
    ],
    category_levels: {
      COD: 7, DSA: 7, APTI: 6, COMM: 5, OOD: 6, AI: 4,
      SQL: 4, SYSD: 6, CLOUD: 5, SWE: 6, NETW: 6, OS: 7,
    },
    category_level_details: {},
  },
  karthik: {
    candidate: { name: "Karthik Subramaniam", email: "karthik@example.com", links: [] },
    role: "Data / Backend Engineer",
    skills: [
      { skill_name: "SQL", category_code: "SQL", confidence: "high", evidence: "Postgres indexing" },
    ],
    category_levels: {
      COD: 5, DSA: 4, APTI: 7, COMM: 6, OOD: 3, AI: 6,
      SQL: 7, SYSD: 3, CLOUD: 3, SWE: 4, NETW: 2, OS: 2,
    },
    category_level_details: {},
  },
  rohan: {
    candidate: { name: "Rohan Verma", email: "rohan@example.com", links: [] },
    role: "Systems / Core Engineer",
    skills: [
      { skill_name: "Rust", category_code: "COD", confidence: "high", evidence: "ShardDB" },
    ],
    category_levels: {
      COD: 8, DSA: 8, APTI: 7, COMM: 7, OOD: 6, AI: 7,
      SQL: 6, SYSD: 7, CLOUD: 6, SWE: 6, NETW: 5, OS: 7,
    },
    category_level_details: {},
  },
};

describe("Resume Parsing HTTP Endpoints", () => {
  let appServer: Server;
  let agentServer: Server;
  let base: string;

  const readBody = (req: IncomingMessage) =>
    new Promise<unknown>((resolve) => {
      let data = "";
      req.on("data", (c) => (data += c));
      req.on("end", () => resolve(data ? JSON.parse(data) : undefined));
    });

  const listen = (server: Server) =>
    new Promise<number>((resolve) =>
      server.listen(0, "127.0.0.1", () => resolve((server.address() as AddressInfo).port)),
    );

  beforeAll(async () => {
    agentServer = createServer(async (req, res) => {
      const body = (await readBody(req)) as any;
      const url = req.url ?? "";

      res.writeHead(200, { "Content-Type": "application/json" });

      if (url.startsWith("/extract/resume/sample/")) {
        const key = url.split("/").pop()?.toLowerCase() || "ananya";
        const sample = SAMPLE_PAYLOADS[key] || SAMPLE_PAYLOADS["ananya"];
        return res.end(JSON.stringify(sample));
      }

      if (url === "/extract/resume/json") {
        const key = (body?.sample_key || "ananya").toLowerCase();
        const sample = SAMPLE_PAYLOADS[key] || SAMPLE_PAYLOADS["ananya"];
        return res.end(JSON.stringify(sample));
      }

      if (url === "/levels/infer") {
        const extraction = body?.extraction;
        return res.end(
          JSON.stringify({
            category_levels: extraction?.category_levels || SAMPLE_PAYLOADS["ananya"].category_levels,
            category_level_details: extraction?.category_level_details || {},
            latency_ms: 1.2,
          }),
        );
      }

      res.end(JSON.stringify({}));
    });

    const agentPort = await listen(agentServer);
    process.env["AGENT_URL"] = `http://127.0.0.1:${agentPort}`;

    vi.resetModules();
    const { createApp } = await import("../src/app.js");
    appServer = createApp().listen(0);
    await new Promise<void>((resolve) => appServer.once("listening", () => resolve()));
    const addr = appServer.address() as AddressInfo;
    base = `http://127.0.0.1:${addr.port}/api`;
  });

  afterAll(() => {
    appServer?.close();
    agentServer?.close();
  });

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
