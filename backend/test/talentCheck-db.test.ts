import { beforeEach, describe, expect, it, vi } from "vitest";

type Result = { data: unknown; error: unknown };
const tables: Record<string, Result> = {};
const calls: { table: string; method: string; args: unknown[] }[] = [];

function builder(table: string) {
  const result = () => tables[table] ?? { data: [], error: null };
  const b: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "limit", "upsert"]) {
    b[method] = (...args: unknown[]) => {
      calls.push({ table, method, args });
      return b;
    };
  }
  b["maybeSingle"] = async () => {
    const r = result();
    return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
  };
  b["then"] = (resolve: (r: Result) => unknown) => Promise.resolve(result()).then(resolve);
  return b;
}

vi.mock("../src/services/supabase.service.js", () => ({
  isSupabaseConfigured: true,
  supabase: { from: (table: string) => builder(table) },
}));

vi.mock("../src/services/agent.service.js", () => ({
  callAgent: vi.fn(async (path: string) => {
    if (path.includes("batch")) {
      return { companies: [], profiles: [], cells: [], scoring_version: "tc-1.0" };
    }
    return {
      company: "Google LLC",
      company_id: 4,
      profile_id: "db-cand",
      readiness_score: 85,
      verdict: "ready",
      scoring_version: "tc-1.0",
      skillset_gap: [],
      explanation: "DB check",
      blocking_gaps: [],
      meta: {},
    };
  }),
}));

const barSvc = await import("../src/services/companyBar.service.js");
const tcSvc = await import("../src/services/talentCheck.service.js");

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  calls.length = 0;
});

describe("Talent Check with Supabase configured", () => {
  it("loads candidate profile from candidate_profiles table", async () => {
    tables["candidate_profiles"] = {
      data: [
        {
          id: "db-cand",
          version: 2,
          profile: {
            name: "DB Candidate",
            email: "db@example.com",
            skill_levels: { COD: 8, DSA: 8 },
          },
        },
      ],
      error: null,
    };

    const p = await tcSvc.getProfile("db-cand");
    expect(p.id).toBe("db-cand");
    expect(p.name).toBe("DB Candidate");
    expect(p.version).toBe(2);
    expect(p.skill_levels["COD"]).toBe(8);
  });

  it("loads topic ladders from v_skill_topics", async () => {
    tables["v_skill_topics"] = {
      data: [
        { skill_set_id: 1, level_number: 1, topics: "Syntax â€“ basics" },
        { skill_set_id: 1, level_number: 2, topics: "Functions" },
      ],
      error: null,
    };

    const ladder = await barSvc.getTopicLadder();
    expect(ladder["COD"]).toBeDefined();
    expect(ladder["COD"]?.["1"]).toBe("Syntax – basics");
    expect(ladder["COD"]?.["2"]).toBe("Functions");
  });

  it("returns cached talent_checks record when present in database", async () => {
    tables["talent_checks"] = {
      data: [
        {
          result: {
            company: "Google LLC",
            company_id: 4,
            readiness_score: 90,
            verdict: "ready",
            scoring_version: "tc-1.0",
          },
          readiness_score: 90,
          verdict: "ready",
          scoring_version: "tc-1.0",
          bar_source: "db",
        },
      ],
      error: null,
    };

    const res = await tcSvc.runTalentCheck({
      profileId: "db-cand",
      companyId: 4,
    });

    expect(res.readiness_score).toBe(90);
    expect(res.meta?.cached).toBe(true);
    expect(res.meta?.bar_source).toBe("db");
  });

  it("computes and persists talent check to database when not cached", async () => {
    tables["talent_checks"] = { data: [], error: null };

    const res = await tcSvc.runTalentCheck({
      profileId: "6f1c-ananya",
      companyId: 4,
      persist: true,
    });

    expect(res.readiness_score).toBe(85);
    expect(calls).toContainEqual(
      expect.objectContaining({ table: "talent_checks", method: "upsert" }),
    );
  });

  it("lists talent checks from database", async () => {
    tables["talent_checks"] = {
      data: [
        {
          id: "check-1",
          profile_id: "6f1c-ananya",
          company_id: 4,
          readiness_score: 85,
          verdict: "ready",
          scoring_version: "tc-1.0",
          bar_source: "snapshot",
          created_at: "2026-10-28T00:00:00Z",
        },
      ],
      error: null,
    };

    const list = await tcSvc.listTalentChecks("6f1c-ananya");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe("check-1");
  });
});
