// Runs the shared fixture cases (docs/contract/fixtures) against the backend zod schema.
// The frontend suite runs the same file against its own copy of the rules.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { candidateProfileInputSchema, candidateProfileSchema } from "../src/contract/profile.schema.js";
import { SEED_PROFILES } from "../src/data/seedProfiles/index.js";
import { computeCompleteness } from "../src/lib/profileCompleteness.js";

interface Case {
  name: string;
  set: Record<string, unknown>;
  expect: "ok" | { path: string };
}
const fixtures = JSON.parse(
  readFileSync(new URL("../../docs/contract/fixtures/candidate-profile-cases.json", import.meta.url), "utf8"),
) as { base: Record<string, unknown>; cases: Case[] };

type Bag = Record<string, unknown>;

function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc as Bag | undefined)?.[k], obj);
}

function setPath(obj: Bag, path: string, value: unknown) {
  const keys = path.split(".");
  const last = keys.pop() as string;
  const parent = keys.reduce<Bag>((acc, k) => acc[k] as Bag, obj);
  if (value && typeof value === "object" && "$delete" in value) delete parent[last];
  else if (value && typeof value === "object" && "$copy" in value) {
    parent[last] = structuredClone(getPath(obj, (value as { $copy: string }).$copy));
  } else parent[last] = value;
}

const build = (c: Case) => {
  const p = structuredClone(fixtures.base);
  for (const [path, value] of Object.entries(c.set)) setPath(p, path, value);
  return p;
};

describe("shared CandidateProfile fixture cases", () => {
  it.each(fixtures.cases)("$name", (c) => {
    const result = candidateProfileInputSchema.safeParse(build(c));
    if (c.expect === "ok") {
      expect(result.success, JSON.stringify(result.success ? [] : result.error.issues)).toBe(true);
      return;
    }
    expect(result.success).toBe(false);
    const paths = result.success ? [] : result.error.issues.map((i) => i.path.join("."));
    expect(paths).toContain(c.expect.path);
  });

  it("lower-cases the email", () => {
    const parsed = candidateProfileInputSchema.parse({ ...fixtures.base, email: "ANANYA.RAO@Example.com" });
    expect(parsed.email).toBe("ananya.rao@example.com");
  });
});

describe("seed profiles", () => {
  it.each(SEED_PROFILES.map((p) => [p.name, p] as const))("%s passes the stored-profile schema", (_n, p) => {
    expect(candidateProfileSchema.safeParse(p).success).toBe(true);
  });

  it("have 12 levels each and visibly different level profiles", () => {
    const sig = SEED_PROFILES.map((p) => Object.values(p.skill_levels).map((l) => l.level).join(","));
    expect(new Set(sig).size).toBe(4);
    for (const p of SEED_PROFILES) expect(Object.keys(p.skill_levels)).toHaveLength(12);
  });

  it("use the fixed uuids from the plan", () => {
    expect(SEED_PROFILES.map((p) => p.id)).toEqual([
      "3a000000-0000-4000-8000-000000000001",
      "3a000000-0000-4000-8000-000000000002",
      "3a000000-0000-4000-8000-000000000003",
      "3a000000-0000-4000-8000-000000000004",
    ]);
  });

  it("have fixed completeness scores (the frontend suite asserts the same numbers)", () => {
    const scores = Object.fromEntries(SEED_PROFILES.map((p) => [p.name, computeCompleteness(p).score]));
    expect(scores).toEqual({
      "Ananya Rao": 90,
      "Karthik Subramaniam": 80,
      "Priya Menon": 60,
      "Rohan Verma": 90,
    });
  });
});

describe("computeCompleteness hints", () => {
  const empty = structuredClone(fixtures.base) as unknown as Parameters<typeof computeCompleteness>[0];

  it("scores 0 for nothing and lists the biggest gaps first", () => {
    const blank = {
      ...empty,
      name: "",
      email: "",
      skills: [],
      internships: [],
      projects: [],
      hackathons: [],
      certifications: [],
      preferred_roles: [],
      education_details: [],
      cv_file: null,
      skill_levels: Object.fromEntries(
        Object.keys(empty.skill_levels).map((c) => [c, { level: 1, source: "resume_inferred", confidence: "low", basis: "no evidence" }]),
      ),
    } as unknown as Parameters<typeof computeCompleteness>[0];
    const { score, hints } = computeCompleteness(blank);
    expect(score).toBe(0);
    expect(hints).toHaveLength(8);
    expect(hints[0]?.points).toBe(20);
    expect(hints.find((h) => h.step === "levels")?.text).toBe("Review 12 skill levels that have no evidence");
  });
});
