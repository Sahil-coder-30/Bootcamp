import { describe, expect, it } from "vitest";
import { proficiencyToBloom, scoreToCriticality, scoreToDifficulty } from "@/lib/companyData";
import { buildIntelligenceSections } from "@/data/intelligenceData";

describe("company data", () => {
  it("has 22 intelligence sections", () => {
    expect(buildIntelligenceSections()).toHaveLength(22);
  });
  it("never exposes CTC, stipend or selection ratio fields", () => {
    const keys = buildIntelligenceSections().flatMap((s) => s.fields.map((f) => f.key));
    expect(keys.some((k) => /ctc|stipend|selection_ratio/i.test(k))).toBe(false);
  });
  it("maps levels to Bloom, criticality and difficulty", () => {
    expect([2, 4, 6, 8, 10].map(proficiencyToBloom)).toEqual(["CU", "AP", "AS", "EV", "CR"]);
    expect([7, 5, 4].map(scoreToCriticality)).toEqual(["Critical", "Important", "Baseline"]);
    expect([8, 6, 4, 3].map(scoreToDifficulty)).toEqual(["EXPERT", "ADVANCED", "PRO", "BEGINNER"]);
  });
});
