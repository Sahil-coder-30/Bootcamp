import { describe, expect, it } from "vitest";
import { CODES, type Skill } from "../src/contract/profile.schema.js";
import { bloomOf, buildSkillLevels } from "../src/lib/skillLevels.js";

const skill = (over: Partial<Skill> = {}): Skill => ({
  skill_name: "Go",
  category_code: "COD",
  evidence: "Built a service in Go",
  confidence: "medium",
  section: "skills",
  ...over,
});

describe("bloomOf", () => {
  it("maps levels to Bloom bands", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(bloomOf)).toEqual([
      "CU", "CU", "AP", "AP", "AS", "AS", "EV", "EV", "CR", "CR",
    ]);
  });
});

describe("buildSkillLevels", () => {
  it("always returns the 12 codes in contract order, never OTHER", () => {
    const out = buildSkillLevels({ COD: 6 }, [skill({ skill_name: "Rust", category_code: "OTHER" })]);
    expect(Object.keys(out)).toEqual([...CODES]);
    expect(out).not.toHaveProperty("OTHER");
  });

  it("gives a missing category 1 / low / 'no evidence'", () => {
    const out = buildSkillLevels({}, []);
    for (const code of CODES) {
      expect(out[code]).toMatchObject({ level: 1, confidence: "low", basis: "no evidence", source: "resume_inferred" });
    }
  });

  it("treats a level with no skill in that category as no evidence", () => {
    expect(buildSkillLevels({ DSA: 8 }, [skill()]).DSA.basis).toBe("no evidence");
  });

  it("clamps and rounds levels", () => {
    const skills = (["COD", "DSA", "SQL"] as const).map((c) => skill({ category_code: c }));
    const out = buildSkillLevels({ COD: 0, DSA: 11, SQL: 5.6 }, skills);
    expect([out.COD.level, out.DSA.level, out.SQL.level]).toEqual([1, 10, 6]);
  });

  it("is high only with a high-confidence skill from projects or experience", () => {
    const strong = buildSkillLevels({ COD: 6 }, [skill({ confidence: "high", section: "projects" })]);
    const listed = buildSkillLevels({ COD: 6 }, [skill({ confidence: "high", section: "skills" })]);
    expect(strong.COD.confidence).toBe("high");
    expect(listed.COD.confidence).toBe("medium");
  });

  it("keeps the resume value in inferred_level", () => {
    expect(buildSkillLevels({ COD: 6 }, [skill()]).COD.inferred_level).toBe(6);
  });

  it("writes a deterministic basis of at most 200 chars", () => {
    const names = ["Go", "Python", "Kafka", "Rust", "Zig", "Lua"];
    const skills = names.map((n, i) =>
      skill({ skill_name: n, confidence: i === 0 ? "high" : "medium", section: i % 2 ? "experience" : "projects" }),
    );
    const a = buildSkillLevels({ COD: 6 }, skills).COD.basis;
    expect(a).toBe("6 skills (Go, Python, Kafka, Rust +2 more) in projects + internship");
    expect(buildSkillLevels({ COD: 6 }, skills).COD.basis).toBe(a);
    const long = buildSkillLevels({ COD: 6 }, [skill({ skill_name: "x".repeat(60) })]);
    expect(long.COD.basis.length).toBeLessThanOrEqual(200);
  });
});
