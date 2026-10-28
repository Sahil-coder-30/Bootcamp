import { describe, expect, it } from "vitest";
import type { CandidateProfileInput } from "../src/contract/profile.schema.js";
import { EXTRACTION_FIXTURES } from "../src/data/extractionFixtures/index.js";
import { SEED_PROFILES } from "../src/data/seedProfiles/index.js";
import { mapExtractionToDraft } from "../src/lib/profileMapping.js";
import { mergeProfiles, norm, type StoredShape } from "../src/lib/profileMerge.js";

const clone = <T>(v: T): T => structuredClone(v);
const seed = (name: string) => clone(SEED_PROFILES.find((p) => p.name === name) as unknown as StoredShape);
const draftOf = (id: string): CandidateProfileInput => {
  const fx = EXTRACTION_FIXTURES.find((f) => f.id === id)!;
  return mapExtractionToDraft(fx.result, fx.id, "resume/new.pdf").draft;
};

const ANANYA_V1 = "e1000000-0000-4000-8000-000000000001";
const ANANYA_V2 = "e1000000-0000-4000-8000-000000000003";

describe("norm", () => {
  it("strips accents, case and punctuation", () => {
    expect(norm("  Café—Déjà Vu!! ")).toBe("cafe deja vu");
    expect(norm("C++ / Rust")).toBe("c rust");
  });
});

describe("mergeProfiles", () => {
  it("never changes a self-set level, but records the resume value and an info row", () => {
    const existing = seed("Ananya Rao");
    existing.skill_levels.SYSD = { level: 4, source: "self", confidence: "medium", basis: "Adjusted by candidate", inferred_level: 6 };
    const { merged, diff } = mergeProfiles(existing, draftOf(ANANYA_V2));
    expect(merged.skill_levels.SYSD.level).toBe(4);
    expect(merged.skill_levels.SYSD.source).toBe("self");
    expect(merged.skill_levels.SYSD.inferred_level).toBe(7);
    expect(diff.find((d) => d.path === "skill_levels.SYSD")).toMatchObject({ kind: "info", default: "keep", incoming: 7 });
  });

  it("replaces resume_inferred levels with the newer inference", () => {
    const { merged, diff } = mergeProfiles(seed("Ananya Rao"), draftOf(ANANYA_V2));
    expect(merged.skill_levels.COD.level).toBe(8);
    expect(diff.find((d) => d.path === "skill_levels.COD")).toMatchObject({ kind: "update", default: "accept" });
  });

  it("adds new internships and skills and never loses existing items", () => {
    const existing = seed("Ananya Rao");
    const { merged, diff } = mergeProfiles(existing, draftOf(ANANYA_V2));
    expect(merged.internships).toHaveLength(existing.internships.length + 1);
    expect(merged.internships.at(-1)?.org).toBe("Bolt Cloud");
    expect(merged.skills.length).toBe(existing.skills.length + 3);
    for (const s of existing.skills) expect(merged.skills.some((m) => m.skill_name === s.skill_name)).toBe(true);
    expect(diff.filter((d) => d.kind === "add").map((d) => d.path)).toContain(`internships.${existing.internships.length}`);
  });

  it("matches by identity key and only fills empty sub-fields", () => {
    const existing = seed("Ananya Rao");
    existing.internships = [{ title: "SDE Intern", org: "ACME  systems!", highlights: [] }];
    const { merged, diff } = mergeProfiles(existing, draftOf(ANANYA_V1));
    expect(merged.internships).toHaveLength(1);
    expect(merged.internships[0]).toMatchObject({ title: "SDE Intern", org: "ACME  systems!", start: "2025-05" });
    expect(diff.find((d) => d.path === "internships.0")?.kind).toBe("update");
  });

  it("never overwrites a typed value: a different name or email is a conflict that defaults to keep", () => {
    const existing = seed("Ananya Rao");
    existing.name = "Ananya R.";
    existing.email = "ananya@work.example";
    const { merged, diff } = mergeProfiles(existing, draftOf(ANANYA_V1));
    expect(merged.name).toBe("Ananya R.");
    expect(merged.email).toBe("ananya@work.example");
    expect(diff.filter((d) => d.kind === "conflict").map((d) => [d.path, d.default])).toEqual([
      ["name", "keep"],
      ["email", "keep"],
    ]);
  });

  it("fills an empty phone from the resume", () => {
    const existing = seed("Ananya Rao");
    delete existing.phone;
    const { merged, diff } = mergeProfiles(existing, draftOf(ANANYA_V1));
    expect(merged.phone).toBe("+91 98765 43210");
    expect(diff.find((d) => d.path === "phone")?.kind).toBe("update");
  });

  it("keeps the existing role order and appends new roles up to 5", () => {
    const existing = seed("Ananya Rao");
    const incoming = draftOf(ANANYA_V1);
    incoming.preferred_roles = ["software engineer", "Data Scientist"];
    const { merged } = mergeProfiles(existing, incoming);
    expect(merged.preferred_roles).toEqual(["Software Engineer", "Data Scientist"]);
    existing.preferred_roles = ["a1", "b2", "c3", "d4", "e5"];
    expect(mergeProfiles(existing, incoming).merged.preferred_roles).toHaveLength(5);
  });

  it("replaces cv_file and resume_extraction_id with the newest CV", () => {
    const { merged, diff } = mergeProfiles(seed("Ananya Rao"), draftOf(ANANYA_V2));
    expect(merged.cv_file).toBe("resume/new.pdf");
    expect(merged.resume_extraction_id).toBe(ANANYA_V2);
    expect(diff.map((d) => d.path)).toEqual(expect.arrayContaining(["cv_file", "resume_extraction_id"]));
  });

  it("recomputes the display education only when education_details changed", () => {
    const existing = seed("Ananya Rao");
    existing.education = "typed by hand";
    expect(mergeProfiles(existing, draftOf(ANANYA_V1)).merged.education).toBe("typed by hand");
    const noDetails = { ...existing, education_details: [] };
    const out = mergeProfiles(noDetails, draftOf(ANANYA_V1)).merged;
    expect(out.education).toContain("B.Tech CSE");
  });

  it("does not mutate its inputs", () => {
    const existing = seed("Ananya Rao");
    const incoming = draftOf(ANANYA_V2);
    const before = [clone(existing), clone(incoming)];
    mergeProfiles(existing, incoming);
    expect([existing, incoming]).toEqual(before);
  });

  it("is idempotent: importing the same resume again gives an empty diff", () => {
    for (const id of [ANANYA_V1, ANANYA_V2]) {
      const first = mergeProfiles(seed("Ananya Rao"), draftOf(id));
      const second = mergeProfiles(first.merged, draftOf(id));
      expect(second.diff, id).toEqual([]);
      expect(second.merged).toEqual(first.merged);
    }
  });

  it("is idempotent with self-set levels too", () => {
    const existing = seed("Ananya Rao");
    existing.skill_levels.DSA = { level: 3, source: "self", confidence: "medium", basis: "mine", inferred_level: 5 };
    const first = mergeProfiles(existing, draftOf(ANANYA_V2));
    expect(mergeProfiles(first.merged, draftOf(ANANYA_V2)).diff).toEqual([]);
  });
});
