import { afterAll, beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";

vi.mock("../src/services/supabase.service.js", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

interface SeenCall {
  method: string;
  url: string;
  body: unknown;
}

let agentServer: Server;
let appServer: Server;
let base: string;
let seenCalls: SeenCall[] = [];

let agentReply: (req: SeenCall) => { status: number; body: unknown } = (req) => {
  if (req.url.includes("skill-match/batch")) {
    return {
      status: 200,
      body: {
        matching_version: "sm-1.0",
        profiles: [{ id: "6f1c-ananya", name: "Ananya Rao" }],
        jds: [{ id: "b2f4-google-swe", company: "Google LLC", role: "Software Engineer" }],
        cells: [
          {
            profile_id: "6f1c-ananya",
            jd_id: "b2f4-google-swe",
            match_score: 75,
            band: "strong",
            must_coverage: 0.8,
            top_missing: ["Kubernetes"],
          },
        ],
        best_jd_by_profile: { "6f1c-ananya": "b2f4-google-swe" },
        best_candidate_by_jd: { "b2f4-google-swe": "6f1c-ananya" },
        meta: {},
      },
    };
  }

  return {
    status: 200,
    body: {
      jd_source_file: "google_swe.pdf",
      match_score: 71,
      match_band: "good",
      jd_id: "b2f4-google-swe",
      profile_id: "6f1c-ananya",
      matched_skills: [
        {
          jd_skill: "Distributed systems",
          candidate_skill: "Kafka event pipeline",
          category_code: "SYSD",
          method: "llm",
          similarity: 0.82,
          requirement: "must",
          evidence: "Built Kafka pipeline",
          credit: 0.9,
          reason: "Event streaming at scale is core distributed systems",
        },
      ],
      missing_skills: [
        {
          skill_name: "Kubernetes",
          category_code: "CLOUD",
          requirement: "must",
          why_it_matters: "Must have under requirements. Closing it adds about 8 points.",
          closest_candidate_skill: "Docker",
          learn_next: "Pods, Deployments, Services",
          gap_type: "missing",
          effort: "quick_win",
          impact_points: 8,
          priority: 1,
        },
      ],
      category_coverage: { COD: 1.0, SYSD: 0.72, CLOUD: 0.13 },
      score_breakdown: {
        must_coverage: 0.713,
        nice_coverage: 0.485,
        level_fit: 0.943,
        raw_score: 71.3,
        cap: 90,
        cap_reason: "1 must-have skill missing",
      },
      matching_version: "sm-1.0",
      meta: {},
    },
  };
};

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
    const call = { method: req.method ?? "", url: req.url ?? "", body: await readBody(req) };
    seenCalls.push(call);
    const { status, body } = agentReply(call);
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  });

  const agentPort = await listen(agentServer);
  process.env["AGENT_URL"] = `http://127.0.0.1:${agentPort}`;

  vi.resetModules();
  const { createApp } = await import("../src/app.js");

  appServer = createApp().listen(0);
  await new Promise<void>((resolve) => appServer.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(appServer.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  appServer?.close();
  agentServer?.close();
});

beforeEach(() => {
  seenCalls = [];
});

describe("Skill Match API Routes", () => {
  it("POST /api/skill-match rejects missing payload with 400", async () => {
    const res = await fetch(`${base}/skill-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("POST /api/skill-match calls agent and returns SkillMatchResult", async () => {
    const res = await fetch(`${base}/skill-match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profile_id: "6f1c-ananya",
        jd_id: "b2f4-google-swe",
      }),
    });

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.match_score).toBe(71);
    expect(json.matching_version).toBe("sm-1.0");
    expect(json.missing_skills).toHaveLength(1);
    expect(json.missing_skills[0].skill_name).toBe("Kubernetes");
  });

  it("GET /api/skill-match/matrix returns batch grid", async () => {
    const res = await fetch(
      `${base}/skill-match/matrix?profile_ids=6f1c-ananya&jd_ids=b2f4-google-swe`
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.matching_version).toBe("sm-1.0");
    expect(json.cells).toHaveLength(1);
    expect(json.cells[0].match_score).toBe(75);
    expect(json.best_jd_by_profile["6f1c-ananya"]).toBe("b2f4-google-swe");
  });
});
