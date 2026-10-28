import { describe, expect, it } from "vitest";
import { candidateProfileInputSchema, type ResumeExtraction } from "../src/contract/profile.schema.js";
import { EXTRACTION_FIXTURES } from "../src/data/extractionFixtures/index.js";
import { dedupeSkills, formatEducation, mapExtractionToDraft } from "../src/lib/profileMapping.js";

describe("formatEducation", () => {
  it("formats the most recent entry and skips empty parts", () => {
    expect(
      formatEducation([
        { degree: "Diploma", institution: "Old College", year: "2022", score: "" },
        { degree: "B.Tech CSE", institution: "XYZ", year: "2026", score: "8.7 CGPA" },
      ]),
    ).toBe("B.Tech CSE, XYZ, 2026, 8.7 CGPA");
    expect(formatEducation([{ degree: "BCA", institution: "", year: "2026" }])).toBe("BCA, 2026");
    expect(formatEducation([])).toBe("");
  });
});

describe("dedupeSkills", () => {
  it("keeps the higher confidence and the longer evidence", () => {
    const out = dedupeSkills([
      { skill_name: "Python", category_code: "COD", evidence: "short", confidence: "low", canonical_id: "python" },
      { skill_name: "python", category_code: "COD", evidence: "a much longer piece of evidence", confidence: "high", canonical_id: "python" },
      { skill_name: "Go", category_code: "COD", evidence: "go", confidence: "medium" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ confidence: "high", evidence: "a much longer piece of evidence" });
  });

  it("dedupes by normalised name when there is no canonical id", () => {
    const out = dedupeSkills([
      { skill_name: "C++", category_code: "COD", evidence: "a", confidence: "low" },
      { skill_name: "c++", category_code: "COD", evidence: "b", confidence: "low" },
    ]);
    expect(out).toHaveLength(1);
  });
});

describe.each(EXTRACTION_FIXTURES)("mapExtractionToDraft ($result.candidate.name)", (fx) => {
  const { draft, provenance, warnings } = mapExtractionToDraft(fx.result, fx.id, "resume/abc.pdf");

  it("produces a draft that passes the input schema with all 12 skill_levels", () => {
    const parsed = candidateProfileInputSchema.safeParse(draft);
    expect(parsed.success, JSON.stringify(parsed.success ? [] : parsed.error.issues)).toBe(true);
    expect(Object.keys(draft.skill_levels)).toHaveLength(12);
  });

  it("lower-cases the email, links the extraction and CV, and sets the display education", () => {
    expect(draft.email).toBe(draft.email.toLowerCase());
    expect(draft.resume_extraction_id).toBe(fx.id);
    expect(draft.cv_file).toBe("resume/abc.pdf");
    expect(draft.education).toContain(fx.result.education?.[0]?.degree);
  });

  it("has a provenance entry for every non-empty mapped leaf", () => {
    expect(provenance["name"]).toMatchObject({ source: "resume", extraction_id: fx.id });
    expect(provenance["internships.0.org"]).toBeDefined();
    expect(provenance["skills.0.skill_name"]?.evidence).toBe(draft.skills[0]?.evidence);
    expect(provenance["education"]).toBeDefined();
    for (const [path, entry] of Object.entries(provenance)) {
      expect(entry.evidence.length, path).toBeGreaterThan(0);
      expect(entry.evidence.length, path).toBeLessThanOrEqual(200);
    }
  });

  it("uses field_confidence for the section, defaulting to medium", () => {
    expect(provenance["internships.0.title"]?.confidence).toBe(fx.result.field_confidence?.["experience"]);
    expect(provenance["projects.0.name"]?.confidence).toBe("medium");
  });

  it("warns about experience entries that do not look like internships only", () => {
    expect(warnings.every((w) => w.endsWith("kept under internships"))).toBe(true);
  });
});

describe("mapExtractionToDraft edge cases", () => {
  it("copes with an almost empty extraction", () => {
    const ex: ResumeExtraction = { source_type: "resume", source_file: "x.pdf", skills: [] };
    const { draft, provenance, warnings } = mapExtractionToDraft(ex, "e", null);
    expect(draft.name).toBe("");
    expect(draft.cv_file).toBeNull();
    expect(draft.preferred_roles).toEqual([]);
    expect(Object.values(draft.skill_levels).every((l) => l.basis === "no evidence")).toBe(true);
    expect(provenance).toEqual({});
    expect(warnings).toEqual([]);
  });

  it("warns when an experience title is not an internship", () => {
    const ex: ResumeExtraction = {
      source_type: "resume",
      source_file: "x.pdf",
      skills: [],
      role: "Software Engineer",
      experience: [{ title: "Teaching Assistant", org: "College" }],
    };
    const { draft, warnings } = mapExtractionToDraft(ex, "e", null);
    expect(warnings).toEqual(["'Teaching Assistant' kept under internships"]);
    expect(draft.internships).toHaveLength(1);
    expect(draft.preferred_roles).toEqual(["Software Engineer"]);
  });
});
