// companies.service against a fake Supabase client: database reads, seed fallbacks and
// error propagation. No network.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SEED_COMPANIES } from "../src/data/seedCompanies.js";
import { SKILL_TOPICS } from "../src/data/skillTopics.js";

type Result = { data: unknown; error: unknown };
const tables: Record<string, Result> = {};
const calls: { table: string; method: string; args: unknown[] }[] = [];

// Minimal stand-in for the supabase-js query builder: every filter returns the builder,
// awaiting it (or maybeSingle) resolves to the table's configured result.
function builder(table: string) {
  const result = () => tables[table] ?? { data: [], error: null };
  const b: Record<string, unknown> = {};
  for (const method of ["select", "order", "eq", "limit"]) {
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

const service = await import("../src/services/companies.service.js");

beforeEach(() => {
  for (const k of Object.keys(tables)) delete tables[k];
  calls.length = 0;
});

describe("listCompanies", () => {
  it("normalizes database rows, ordered by id", async () => {
    tables["company_json"] = {
      data: [{ company_id: "7", short_json: { name: "Zeta", company_type: "dream" } }],
      error: null,
    };
    const list = await service.listCompanies();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: 7, name: "Zeta", shortName: "Zeta", companyType: "Dream" });
    expect(calls).toContainEqual({ table: "company_json", method: "order", args: ["company_id", { ascending: true }] });
  });

  it("falls back to the seed companies when the table is empty", async () => {
    tables["company_json"] = { data: [], error: null };
    const list = await service.listCompanies();
    expect(list.map((c) => c.id)).toEqual(SEED_COMPANIES.map((c) => c.company_id));
  });

  it("throws the database error", async () => {
    tables["company_json"] = { data: null, error: new Error("permission denied") };
    await expect(service.listCompanies()).rejects.toThrow("permission denied");
  });
});

describe("getCompanyProfile", () => {
  it("merges short_json and full_json, full wins", async () => {
    tables["company_json"] = {
      data: [{ company_id: 9, short_json: { name: "Short", category: "A" }, full_json: { name: "Full" } }],
      error: null,
    };
    const p = await service.getCompanyProfile(9);
    expect(p).toMatchObject({ name: "Full", category: "A" });
    expect(calls).toContainEqual({ table: "company_json", method: "eq", args: ["company_id", 9] });
  });

  it("falls back to the seed profile when the row is missing", async () => {
    tables["company_json"] = { data: [], error: null };
    expect((await service.getCompanyProfile(1))?.short_name).toBe("Accenture");
    expect(await service.getCompanyProfile(9999)).toBeNull();
  });
});

describe("getCompanySkills", () => {
  const master = { data: [{ skill_set_id: 1, skill_set_name: "DSA" }, { skill_set_id: 2, short_name: "OOP" }], error: null };
  const prof = { data: [{ proficiency_level_id: 3, proficiency_name: "Expert" }], error: null };

  it("joins skill levels with names, proficiency and topic ladders", async () => {
    tables["skill_set_master"] = master;
    tables["proficiency_levels"] = prof;
    tables["company_skill_levels"] = {
      data: [
        { company_id: 5, skill_set_id: 2, required_level: 4, required_proficiency_level_id: 3 },
        { company_id: 5, skill_set_id: 1, required_level: 9, required_proficiency_level_id: 3 },
      ],
      error: null,
    };
    tables["skill_set_topics"] = {
      data: [
        { skill_set_id: 1, level_number: 1, topics: "Arrays" },
        { skill_set_id: 1, level_number: 1, topics: "Strings" },
        { skill_set_id: 1, level_number: 3, topics: "Graphs" },
      ],
      error: null,
    };
    const out = await service.getCompanySkills(5);
    // sorted by level, highest first
    expect(out.skills.map((s) => [s.id, s.name, s.level, s.proficiency, s.difficulty])).toEqual([
      [1, "DSA", 9, "Expert", "EXPERT"],
      [2, "OOP", 4, "Expert", "PRO"],
    ]);
    expect(out.topics[1]?.slice(0, 3)).toEqual(["Arrays, Strings", "", "Graphs"]);
    expect(out.topics[1]).toHaveLength(10);
    // skill 2 has no DB topics, so it gets the bundled ladder
    expect(out.skills[1]?.topics).toEqual(SKILL_TOPICS[2]);
  });

  it("builds rows from skill_set_master when the company has no levels", async () => {
    tables["skill_set_master"] = master;
    tables["proficiency_levels"] = prof;
    const out = await service.getCompanySkills(1);
    const seed = SEED_COMPANIES[0]!.skill_levels.find((s) => s.skill_set_id === 1)!;
    expect(out.skills.find((s) => s.id === 1)?.level).toBe(seed.required_level);
    expect(out.skills.find((s) => s.id === 2)?.name).toBe("OOP");
  });

  it("uses seed rows when the database has no skills at all", async () => {
    const out = await service.getCompanySkills(1);
    expect(out.skills).toHaveLength(SEED_COMPANIES[0]!.skill_levels.length);
  });

  it("throws if any of the four queries fails", async () => {
    tables["proficiency_levels"] = { data: null, error: new Error("boom") };
    await expect(service.getCompanySkills(1)).rejects.toThrow("boom");
  });
});
