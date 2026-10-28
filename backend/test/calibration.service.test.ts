// The database branch of the calibration ladder, against a fake Supabase query builder.
import { beforeEach, describe, expect, it, vi } from "vitest";

let rows: { level_number: number; topics: string }[] = [];
let failWith: unknown = null;
const calls: { method: string; args: unknown[] }[] = [];

function builder() {
  const b: Record<string, unknown> = {};
  for (const method of ["select", "eq", "in", "order"]) {
    b[method] = (...args: unknown[]) => {
      calls.push({ method, args });
      return b;
    };
  }
  b["then"] = (resolve: (r: unknown) => unknown) =>
    Promise.resolve({ data: failWith ? null : rows, error: failWith }).then(resolve);
  return b;
}

vi.mock("../src/services/supabase.service.js", () => ({
  supabase: { from: () => builder() },
  isSupabaseConfigured: true,
}));

import { getCalibration } from "../src/services/calibration.service.js";

beforeEach(() => {
  rows = [];
  failWith = null;
  calls.length = 0;
});

describe("getCalibration (database)", () => {
  it("groups topics by level for the contract skill_set_id", async () => {
    rows = [
      { level_number: 4, topics: "Joins" },
      { level_number: 4, topics: "Aggregates" },
      { level_number: 5, topics: "Indexes" },
      { level_number: 6, topics: "  " },
    ];
    const out = await getCalibration("SQL", 5);
    expect(out.source).toBe("database");
    expect(out.levels).toEqual([
      { level: 4, topics: ["Joins", "Aggregates"] },
      { level: 5, topics: ["Indexes"] },
      { level: 6, topics: [] },
    ]);
    expect(calls).toContainEqual({ method: "eq", args: ["skill_set_id", 7] });
    expect(calls).toContainEqual({ method: "in", args: ["level_number", [4, 5, 6]] });
  });

  it("falls back to the bundled ladder when the table has no rows", async () => {
    const out = await getCalibration("DSA", 3);
    expect(out.source).toBe("seed");
    expect(out.levels.map((l) => l.level)).toEqual([2, 3, 4]);
    expect(out.levels.every((l) => l.topics.length === 1)).toBe(true);
  });

  it("propagates database errors", async () => {
    failWith = new Error("db down");
    await expect(getCalibration("SQL", 5)).rejects.toThrow("db down");
  });
});
