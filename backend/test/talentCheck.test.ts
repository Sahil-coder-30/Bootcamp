import { afterAll, beforeAll, beforeEach, describe, it, expect, vi } from "vitest";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { cleanTopicText } from "../src/lib/textClean.js";
import {
  runTalentCheckSchema,
  matrixQuerySchema,
  rankQuerySchema,
} from "../src/lib/talentCheck.schemas.js";

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
  if (req.url.includes("talent-check/batch")) {
    return {
      status: 200,
      body: { companies: [], profiles: [], cells: [], scoring_version: "tc-1.0" },
    };
  }
  if (req.url.includes("talent-check/rank")) {
    return {
      status: 200,
      body: [
        {
          company_id: 1,
          company_name: "Accenture plc",
          readiness_score: 100,
          verdict: "ready",
          top_gaps: [],
          blocking_count: 0,
        },
      ],
    };
  }
  return {
    status: 200,
    body: {
      company: "Google LLC",
      company_id: 4,
      profile_id: "6f1c-ananya",
      readiness_score: 65,
      verdict: "almost",
      scoring_version: "tc-1.0",
      skillset_gap: [],
      explanation: "Test explanation",
      blocking_gaps: ["CLOUD", "SQL"],
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

let getCompanyBar: typeof import("../src/services/companyBar.service.js").getCompanyBar;
let getAllBars: typeof import("../src/services/companyBar.service.js").getAllBars;
let getTopicLadder: typeof import("../src/services/companyBar.service.js").getTopicLadder;
let resolveCompanyId: typeof import("../src/services/companyBar.service.js").resolveCompanyId;
let getProfile: typeof import("../src/services/talentCheck.service.js").getProfile;
let runTalentCheck: typeof import("../src/services/talentCheck.service.js").runTalentCheck;
let getMatrix: typeof import("../src/services/talentCheck.service.js").getMatrix;
let rankCompanies: typeof import("../src/services/talentCheck.service.js").rankCompanies;
let listTalentChecks: typeof import("../src/services/talentCheck.service.js").listTalentChecks;

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
  const barSvc = await import("../src/services/companyBar.service.js");
  const tcSvc = await import("../src/services/talentCheck.service.js");

  getCompanyBar = barSvc.getCompanyBar;
  getAllBars = barSvc.getAllBars;
  getTopicLadder = barSvc.getTopicLadder;
  resolveCompanyId = barSvc.resolveCompanyId;

  getProfile = tcSvc.getProfile;
  runTalentCheck = tcSvc.runTalentCheck;
  getMatrix = tcSvc.getMatrix;
  rankCompanies = tcSvc.rankCompanies;
  listTalentChecks = tcSvc.listTalentChecks;

  appServer = createApp().listen(0);
  await new Promise<void>((resolve) => appServer.once("listening", () => resolve()));
  base = `http://127.0.0.1:${(appServer.address() as AddressInfo).port}/api`;
});

afterAll(() => {
  appServer.close();
  agentServer.close();
});

beforeEach(() => {
  seenCalls = [];
});

describe("src/lib/textClean.ts", () => {
  it("handles empty and null values gracefully", () => {
    expect(cleanTopicText("")).toBe("");
    expect(cleanTopicText(null as unknown as string)).toBe("");
    expect(cleanTopicText(undefined as unknown as string)).toBe("");
  });

  it("fixes common UTF-8 mojibake characters and collapses whitespace", () => {
    const dirty = "  Topic â€“ Advanced â€™queriesâ€™ and â€œquotedâ€ items  ";
    const cleaned = cleanTopicText(dirty);
    expect(cleaned).toBe('Topic – Advanced \'queries\' and "quoted" items');
  });
});

describe("src/lib/talentCheck.schemas.ts", () => {
  it("validates runTalentCheckSchema with snake_case and camelCase", () => {
    const snake = runTalentCheckSchema.parse({
      profile_id: "6f1c-ananya",
      company_id: 4,
      skill_levels_override: { COD: 8 },
      persist: false,
    });
    expect(snake.profile_id).toBe("6f1c-ananya");
    expect(snake.company_id).toBe(4);
    expect(snake.skill_levels_override).toEqual({ COD: 8 });
    expect(snake.persist).toBe(false);

    const camel = runTalentCheckSchema.parse({
      profileId: "6f1c-rohan",
      companyId: 78,
    });
    expect(camel.profile_id).toBe("6f1c-rohan");
    expect(camel.company_id).toBe(78);
    expect(camel.persist).toBe(true);
  });

  it("rejects runTalentCheckSchema when missing required identifiers", () => {
    const noProfile = runTalentCheckSchema.safeParse({ company_id: 4 });
    expect(noProfile.success).toBe(false);

    const noCompany = runTalentCheckSchema.safeParse({ profile_id: "p1" });
    expect(noCompany.success).toBe(false);
  });

  it("validates matrixQuerySchema with defaults and custom lists", () => {
    const def = matrixQuerySchema.parse({});
    expect(def.company_ids).toEqual([4, 78, 24]);

    const custom = matrixQuerySchema.parse({ company_ids: "4, 78, 24, invalid, -1" });
    expect(custom.company_ids).toEqual([4, 78, 24]);
  });

  it("validates rankQuerySchema with limits and clamps", () => {
    const valid = rankQuerySchema.parse({ profile_id: "ananya", limit: "5" });
    expect(valid.profile_id).toBe("ananya");
    expect(valid.limit).toBe(5);

    const clamped = rankQuerySchema.parse({ profile_id: "ananya", limit: "500" });
    expect(clamped.limit).toBe(115);

    const missing = rankQuerySchema.safeParse({});
    expect(missing.success).toBe(false);
  });
});

describe("src/services/companyBar.service.ts", () => {
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

    const unknown = await resolveCompanyId("NonExistentCorpXYZ");
    expect(unknown).toBeNull();
  });

  it("fetches company skill bar with 12 normalized rows and tests memory caching", async () => {
    const bar1 = await getCompanyBar(4);
    expect(bar1.company_id).toBe(4);
    expect(bar1.rows.length).toBe(12);

    // Second call hits in-memory cache
    const bar2 = await getCompanyBar(4);
    expect(bar2.company_id).toBe(4);
    expect(bar2.source).toBe("cache");
  });

  it("throws 404 for unknown company ID", async () => {
    await expect(getCompanyBar(999999)).rejects.toThrow("No skill bar found for company 999999");
  });

  it("retrieves all bars matrix and topic ladder", async () => {
    const matrix1 = await getAllBars();
    expect(matrix1.company_ids.length).toBeGreaterThanOrEqual(114);
    expect(matrix1.levels.length).toBeGreaterThanOrEqual(114);

    // Cache hit
    const matrix2 = await getAllBars();
    expect(matrix2.company_ids.length).toBe(matrix1.company_ids.length);

    const ladders1 = await getTopicLadder();
    expect(Object.keys(ladders1).length).toBe(12);

    // Cache hit
    const ladders2 = await getTopicLadder();
    expect(Object.keys(ladders2).length).toBe(12);
  });
});

describe("src/services/talentCheck.service.ts", () => {
  it("resolves golden candidate profiles and fallbacks", async () => {
    const ananya = await getProfile("6f1c-ananya");
    expect(ananya.name).toBe("Ananya Rao");
    expect(ananya.skill_levels["COD"]).toBeDefined();

    const partial = await getProfile("karthik");
    expect(partial.name).toBe("Karthik");

    const fallback = await getProfile("unknown-candidate-id");
    expect(fallback.name).toBe("Ananya Rao");
  });

  it("runs talent check orchestrator with agent proxy and overrides", async () => {
    const res = await runTalentCheck({
      profileId: "6f1c-ananya",
      companyId: 4,
      overrides: { CLOUD: 7 },
      persist: false,
    });

    expect(res.company).toBe("Google LLC");
    expect(res.readiness_score).toBe(65);
    expect(seenCalls.length).toBe(1);
    expect(seenCalls[0]?.url).toContain("/talent-check");
  });

  it("runs matrix and rank operations", async () => {
    const matrix = await getMatrix([4, 78]);
    expect(matrix.scoring_version).toBe("tc-1.0");

    const rankings = await rankCompanies("6f1c-ananya", 5);
    expect(rankings).toBeInstanceOf(Array);
    expect(rankings.length).toBe(1);
    expect(rankings[0].company_name).toBe("Accenture plc");
  });

  it("lists talent checks with empty fallback when no supabase", async () => {
    const list = await listTalentChecks("6f1c-ananya");
    if (!process.env["SUPABASE_URL"]) {
      expect(list).toEqual([]);
    } else {
      expect(Array.isArray(list)).toBe(true);
    }
  });
});

describe("Talent Check HTTP Endpoints", () => {
  it("POST /api/talent-check returns 200 with valid payload", async () => {
    const res = await fetch(`${base}/talent-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile_id: "6f1c-ananya", company_id: 4 }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.company).toMatch(/Google LLC/);
    expect(body.readiness_score).toBe(65);
  });

  it("POST /api/talent-check returns 400 for invalid inputs", async () => {
    const res = await fetch(`${base}/talent-check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/talent-check/matrix returns 200", async () => {
    const res = await fetch(`${base}/talent-check/matrix?company_ids=4,78`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.scoring_version).toBe("tc-1.0");
  });

  it("GET /api/talent-check/matrix handles invalid query parameter", async () => {
    const res = await fetch(`${base}/talent-check/matrix?company_ids=`);
    expect(res.status).toBe(200);
  });

  it("GET /api/talent-check/rank returns 200 for valid profile", async () => {
    const res = await fetch(`${base}/talent-check/rank?profile_id=6f1c-ananya&limit=5`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toBeInstanceOf(Array);
  });

  it("GET /api/talent-check/rank returns 400 if profile_id is missing", async () => {
    const res = await fetch(`${base}/talent-check/rank`);
    expect(res.status).toBe(400);
  });

  it("GET /api/talent-check returns list (empty when no supabase)", async () => {
    const res = await fetch(`${base}/talent-check`);
    expect(res.status).toBe(200);
    const body = await res.json();
    if (!process.env["SUPABASE_URL"]) {
      expect(body).toEqual([]);
    } else {
      expect(Array.isArray(body)).toBe(true);
    }
  });

  it("GET /api/companies/:id/skill-bar serves 200 and 404 appropriately", async () => {
    const res200 = await fetch(`${base}/companies/4/skill-bar`);
    expect(res200.status).toBe(200);

    const res404 = await fetch(`${base}/companies/999999/skill-bar`);
    expect(res404.status).toBe(404);
  });
});
