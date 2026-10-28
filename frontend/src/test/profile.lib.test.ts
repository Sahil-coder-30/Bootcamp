import ananyaRaw from "../../../backend/src/data/seedProfiles/ananya-rao.json?raw";
import { bloomOf } from "@/lib/categories";
import {
  applyDiffDecisions,
  decisionFor,
  describePath,
  levelChanges,
  summarizeDiff,
  summarizeValue,
} from "@/features/profile/lib/diff";
import { blankValues, formatEducation, fromFormValues } from "@/features/profile/lib/formMapping";
import { computeCompleteness } from "@/features/profile/lib/completeness";
import { isReviewable } from "@/features/profile/lib/provenance";
import { bandOf, levelText } from "@/features/profile/lib/rubric";
import type { ProfileValues } from "@/features/profile/lib/schema";
import type { DiffEntry } from "@/features/profile/lib/types";
import { toBar } from "@/features/profile/Hooks/useCompanyBarOverlay";
import { suggestLevel } from "@/features/profile/Hooks/useCalibration";
import { validateCv, cvPathFor } from "@/features/profile/Hooks/useCvUpload";
import { toBlocks } from "@/features/profile/components/JsonPanel";
import { changedFields } from "@/features/profile/components/ConflictDialog";
import { flattenErrors, stepOfPath } from "@/features/profile/components/ProfileBuilder";

const seed = () => JSON.parse(ananyaRaw) as ProfileValues;
const clone = <T>(v: T): T => structuredClone(v);

const entry = (over: Partial<DiffEntry> & Pick<DiffEntry, "path" | "kind">): DiffEntry => ({
  current: null,
  incoming: null,
  default: "accept",
  reason: "",
  ...over,
});

describe("applyDiffDecisions", () => {
  it("returns the merged draft untouched when every entry keeps its default", () => {
    const base = seed();
    const merged = clone(base);
    merged.skill_levels.COD = { ...merged.skill_levels.COD, level: 8 };
    const diff = [entry({ path: "skill_levels.COD", kind: "update", current: 7, incoming: 8 })];
    expect(applyDiffDecisions(base, merged, diff, {})).toEqual(merged);
  });

  it("skipping an added item removes it, highest index first so the others stay put", () => {
    const base = seed();
    const merged = clone(base);
    const n = base.skills.length;
    merged.skills.push(
      { skill_name: "Rust", category_code: "COD", evidence: "a", confidence: "high" },
      { skill_name: "Terraform", category_code: "CLOUD", evidence: "b", confidence: "high" },
      { skill_name: "gRPC", category_code: "SYSD", evidence: "c", confidence: "medium" },
    );
    const diff = [n, n + 1, n + 2].map((i) => entry({ path: `skills.${i}`, kind: "add" }));
    const out = applyDiffDecisions(base, merged, diff, {
      [`skills.${n}`]: "keep",
      [`skills.${n + 2}`]: "keep",
    });
    expect(out.skills.map((s) => s.skill_name).slice(n)).toEqual(["Terraform"]);
  });

  it("keeping mine on an update restores the saved value", () => {
    const base = seed();
    const merged = clone(base);
    merged.skill_levels.COD = { ...merged.skill_levels.COD, level: 9 };
    const diff = [entry({ path: "skill_levels.COD", kind: "update", current: 7, incoming: 9 })];
    expect(
      applyDiffDecisions(base, merged, diff, { "skill_levels.COD": "keep" }).skill_levels.COD.level,
    ).toBe(7);
  });

  it("accepting a conflict takes the resume's value", () => {
    const base = seed();
    const diff = [
      entry({
        path: "name",
        kind: "conflict",
        default: "keep",
        current: "Ananya Rao",
        incoming: "A. Rao",
      }),
    ];
    expect(applyDiffDecisions(base, clone(base), diff, { name: "accept" }).name).toBe("A. Rao");
    expect(applyDiffDecisions(base, clone(base), diff, {}).name).toBe("Ananya Rao");
  });

  it("accepting an info row switches a self-set level to the resume's value", () => {
    const base = seed();
    base.skill_levels.SYSD = {
      level: 4,
      source: "self",
      confidence: "medium",
      basis: "mine",
      inferred_level: 6,
    };
    const merged = clone(base);
    merged.skill_levels.SYSD = { ...merged.skill_levels.SYSD, inferred_level: 7 };
    const diff = [
      entry({ path: "skill_levels.SYSD", kind: "info", default: "keep", current: 4, incoming: 7 }),
    ];
    const kept = applyDiffDecisions(base, merged, diff, {});
    expect(kept.skill_levels.SYSD).toMatchObject({ level: 4, source: "self", inferred_level: 7 });
    const taken = applyDiffDecisions(base, merged, diff, { "skill_levels.SYSD": "accept" });
    expect(taken.skill_levels.SYSD).toMatchObject({
      level: 7,
      source: "resume_inferred",
      inferred_level: 7,
    });
  });

  it("does not mutate its inputs", () => {
    const base = seed();
    const merged = clone(base);
    merged.internships.push({ title: "Intern", org: "New Co", highlights: [] });
    const before = [clone(base), clone(merged)];
    applyDiffDecisions(base, merged, [entry({ path: "internships.1", kind: "add" })], {
      "internships.1": "keep",
    });
    expect([base, merged]).toEqual(before);
  });

  it("decisionFor falls back to the entry's default", () => {
    const e = entry({ path: "x", kind: "conflict", default: "keep" });
    expect(decisionFor(e, {})).toBe("keep");
    expect(decisionFor(e, { x: "accept" })).toBe("accept");
  });
});

describe("diff wording", () => {
  it("summarises like the demo script", () => {
    const diff = [
      entry({ path: "internships.1", kind: "add" }),
      entry({ path: "skills.14", kind: "add" }),
      entry({ path: "skills.15", kind: "add" }),
      entry({ path: "skills.16", kind: "add" }),
      entry({ path: "skill_levels.COD", kind: "update", current: 6, incoming: 7 }),
      entry({ path: "skill_levels.SYSD", kind: "info", default: "keep", current: 4, incoming: 6 }),
    ];
    expect(summarizeDiff(diff)).toBe(
      "1 new internship, 3 new skills, COD 6 to 7, your self-rated SYSD kept",
    );
    expect(summarizeDiff([])).toBe("No changes");
    expect(summarizeDiff([entry({ path: "name", kind: "conflict", default: "keep" })])).toBe(
      "1 conflict",
    );
  });

  it("describes paths and values", () => {
    expect(describePath("internships.2")).toBe("Internship 3");
    expect(describePath("skill_levels.COD")).toBe("COD level");
    expect(describePath("preferred_roles.0")).toBe("Target role 1");
    expect(summarizeValue({ title: "SDE Intern", org: "Acme" })).toBe("SDE Intern at Acme");
    expect(summarizeValue({ skill_name: "Go" })).toBe("Go");
    expect(summarizeValue(["a", "b"])).toBe("2 items");
    expect(summarizeValue("")).toBe("empty");
    expect(summarizeValue(7)).toBe("7");
  });

  it("lists level changes between two versions", () => {
    const older = seed();
    const newer = clone(older);
    newer.skill_levels.DSA = { ...newer.skill_levels.DSA, level: 9, source: "self" };
    expect(levelChanges(older, newer)).toEqual([
      { code: "DSA", from: 7, to: 9, fromSource: "resume_inferred", toSource: "self" },
    ]);
    expect(levelChanges(older, older)).toEqual([]);
  });
});

describe("form mapping and completeness", () => {
  it("formatEducation matches the backend", () => {
    expect(
      formatEducation([
        { degree: "Diploma", institution: "Old", year: "2022", score: "" },
        { degree: "B.Tech", institution: "XYZ", year: "2026", score: "8.7 CGPA" },
      ]),
    ).toBe("B.Tech, XYZ, 2026, 8.7 CGPA");
  });

  it("fromFormValues derives education, drops server fields and blank optional inputs", () => {
    const v = seed();
    v.education = "typed by hand";
    v.phone = "";
    v.education_details = [{ degree: "BCA", institution: "PQR", year: "2026", score: "" }];
    v.internships = [{ title: "Intern", org: "Acme", start: "", end: "", highlights: [] }];
    const out = fromFormValues(v);
    expect(out.education).toBe("BCA, PQR, 2026");
    expect(out).not.toHaveProperty("id");
    expect(out).not.toHaveProperty("version");
    expect(out).not.toHaveProperty("phone");
    expect(out.education_details[0]).not.toHaveProperty("score");
    expect(out.internships[0]).toEqual({ title: "Intern", org: "Acme", end: null, highlights: [] });
  });

  it("keeps a typed education string when there are no education details", () => {
    const v = seed();
    v.education = "typed by hand";
    v.education_details = [];
    expect(fromFormValues(v).education).toBe("typed by hand");
  });

  it("a blank profile scores 0 and lists the biggest gaps first", () => {
    const { score, hints } = computeCompleteness(blankValues());
    expect(score).toBe(0);
    expect(hints).toHaveLength(8);
    expect(hints[0]?.points).toBe(20);
    expect(hints.find((h) => h.step === "levels")?.text).toBe(
      "Review 12 skill levels that have no evidence",
    );
  });

  it("blank values hold exactly 12 levels at 1 / low / no evidence", () => {
    const levels = Object.values(blankValues().skill_levels);
    expect(levels).toHaveLength(12);
    expect(
      levels.every((l) => l.level === 1 && l.confidence === "low" && l.basis === "no evidence"),
    ).toBe(true);
  });
});

describe("small helpers", () => {
  it("rubric and Bloom bands", () => {
    expect(bloomOf(6)).toBe("AS");
    expect(bandOf(7).bloom).toBe("EV");
    expect(levelText(6)).toBe("Level 6, Analysis and Synthesis");
  });

  it("isReviewable picks the fields the form shows chips on", () => {
    for (const p of [
      "name",
      "internships.0.org",
      "skills.3.skill_name",
      "preferred_roles.0",
      "education_details.0.year",
    ]) {
      expect(isReviewable(p), p).toBe(true);
    }
    for (const p of ["internships.0.highlights.0", "skills.3.evidence", "links.0", "education"]) {
      expect(isReviewable(p), p).toBe(false);
    }
  });

  it("toBar needs all 12 categories", () => {
    const rows = [
      "COD",
      "DSA",
      "APTI",
      "COMM",
      "OOD",
      "AI",
      "SQL",
      "SYSD",
      "CLOUD",
      "SWE",
      "NETW",
      "OS",
    ].map((c, i) => ({
      company_id: 4,
      company_name: "Google",
      skill_set_id: i + 1,
      category_code: c,
      required_level: i + 1 > 10 ? 10.4 : i + 1,
    }));
    expect(toBar(rows)?.COD).toBe(1);
    expect(toBar(rows)?.OS).toBe(10);
    expect(toBar(rows.slice(1))).toBeNull();
  });

  it("validateCv accepts pdf/docx up to 5 MB only", () => {
    const f = (name: string, type: string, size = 100) =>
      new File([new Uint8Array(size)], name, { type });
    expect(validateCv(f("cv.pdf", "application/pdf"))).toBeNull();
    expect(validateCv(f("cv.docx", ""))).toBeNull();
    expect(validateCv(f("cv.txt", "text/plain"))).toMatch(/PDF or Word/);
    expect(validateCv(f("cv.pdf", "image/png"))).toMatch(/not supported/);
    expect(validateCv(f("cv.pdf", "application/pdf", 5 * 1024 * 1024 + 1))).toMatch(/5 MB/);
    expect(validateCv(f("cv.pdf", "application/pdf", 0))).toMatch(/empty/);
    expect(cvPathFor({ document_id: "d", sha256: "abc" }, f("My CV.DOCX", ""))).toBe(
      "resume/abc.docx",
    );
    expect(
      cvPathFor({ document_id: "d", sha256: "abc", storage_path: "resume/x.pdf" }, f("a.pdf", "")),
    ).toBe("resume/x.pdf");
  });

  it("flattenErrors and stepOfPath point errors at the right tab", () => {
    const errors = {
      name: { type: "too_small", message: "Name must be at least 2 characters", ref: {} },
      internships: [{ end: { type: "custom", message: "End is before start" } }],
      skill_levels: { COD: { level: { type: "too_big", message: "too big" } } },
    } as unknown as Parameters<typeof flattenErrors>[0];
    expect(flattenErrors(errors).map((e) => e.path)).toEqual([
      "name",
      "internships.0.end",
      "skill_levels.COD.level",
    ]);
    expect(
      [
        "name",
        "education_details.0.year",
        "internships.0.end",
        "hackathons.0.name",
        "skills.1.skill_name",
        "skill_levels.COD",
        "cv_file",
      ].map(stepOfPath),
    ).toEqual(["basics", "education", "experience", "achievements", "skills", "levels", "start"]);
  });

  it("toBlocks styles the brief fields and our additions separately", () => {
    const blocks = toBlocks(JSON.stringify({ name: "A", phone: "1", skills: [] }, null, 2));
    expect(blocks.filter((b) => b.key).map((b) => b.key)).toEqual(["name", "phone", "skills"]);
  });

  it("changedFields lists top-level differences only", () => {
    const local = seed();
    const server = { ...clone(local), id: "x", version: 2, updated_at: "now" };
    expect(changedFields(server, local)).toEqual([]);
    local.name = "Changed";
    local.preferred_roles = ["Other Role"];
    expect(changedFields(server, local)).toEqual(["name", "preferred_roles"]);
  });
});

describe("suggestLevel", () => {
  const levels = [
    { level: 4, topics: ["a", "b", "c", "d", "e"] },
    { level: 5, topics: ["f", "g", "h", "i", "j"] },
    { level: 6, topics: ["k", "l"] },
  ];
  const tick = (...keys: string[]) => new Set(keys);

  it("suggests one below the window when nothing is ticked", () => {
    expect(suggestLevel(levels, tick())).toBe(3);
  });

  it("needs 60% of a level, counted from the bottom of the window", () => {
    expect(suggestLevel(levels, tick("4:0", "4:1", "4:2"))).toBe(4);
    expect(suggestLevel(levels, tick("4:0", "4:1", "4:2", "5:0", "5:1", "5:2"))).toBe(5);
    expect(suggestLevel(levels, tick("4:0", "4:1", "4:2", "5:0", "5:1", "5:2", "6:0", "6:1"))).toBe(
      6,
    );
  });

  it("a ticked higher level does not count when a lower one is short", () => {
    expect(suggestLevel(levels, tick("4:0", "5:0", "5:1", "5:2", "5:3", "5:4"))).toBe(3);
  });

  it("handles an empty window and clamps at level 1", () => {
    expect(suggestLevel([], tick())).toBe(1);
    expect(suggestLevel([{ level: 1, topics: ["a"] }], tick())).toBe(1);
  });
});
