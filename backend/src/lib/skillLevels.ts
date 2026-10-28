// Builds the 12 `skill_levels` from a resume's inferred category levels (plan 3.5).
import { CODES, type Code, type Skill, type SkillLevel, type SkillLevels } from "../contract/profile.schema.js";

export { CODES };

export type Bloom = "CU" | "AP" | "AS" | "EV" | "CR";

/** Bloom band for a 1-10 level: 1-2 CU, 3-4 AP, 5-6 AS, 7-8 EV, 9-10 CR. */
export function bloomOf(level: number): Bloom {
  const bands: Bloom[] = ["CU", "AP", "AS", "EV", "CR"];
  const i = Math.min(4, Math.max(0, Math.ceil(Math.min(10, Math.max(1, level)) / 2) - 1));
  return bands[i] as Bloom;
}

const clampLevel = (n: number) => Math.min(10, Math.max(1, Math.round(n)));

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 } as const;

const SECTION_LABEL: Record<string, string> = {
  projects: "projects",
  experience: "internship",
  skills: "skills list",
  education: "coursework",
  certifications: "certifications",
  hackathons: "hackathons",
};

const NO_EVIDENCE: Omit<SkillLevel, "inferred_level"> = {
  level: 1,
  source: "resume_inferred",
  confidence: "low",
  basis: "no evidence",
};

const MAX_BASIS = 200;
const MAX_NAMES = 4;

function basisFor(skills: Skill[]): string {
  const ordered = [...skills].sort((a, b) => CONFIDENCE_RANK[b.confidence] - CONFIDENCE_RANK[a.confidence]);
  const names = ordered.slice(0, MAX_NAMES).map((s) => s.skill_name);
  const more = ordered.length - names.length;
  const where = [...new Set(skills.map((s) => SECTION_LABEL[s.section ?? ""] ?? "resume"))];
  const label = `${skills.length} skill${skills.length === 1 ? "" : "s"} (${names.join(", ")}${more > 0 ? ` +${more} more` : ""})`;
  return `${label} in ${where.join(" + ")}`.slice(0, MAX_BASIS);
}

/**
 * Always returns exactly the 12 codes, in contract order. A category with no inferred
 * value or no skill gets level 1 / low / "no evidence" (the scale has no 0).
 */
export function buildSkillLevels(
  categoryLevels: Partial<Record<Code, number>> | undefined,
  skills: Skill[],
): SkillLevels {
  const out = {} as SkillLevels;
  for (const code of CODES) {
    const raw = categoryLevels?.[code];
    const inCategory = skills.filter((s) => s.category_code === code);
    if (typeof raw !== "number" || !Number.isFinite(raw) || inCategory.length === 0) {
      out[code] = { ...NO_EVIDENCE, inferred_level: NO_EVIDENCE.level };
      continue;
    }
    const level = clampLevel(raw);
    const strong = inCategory.some(
      (s) => s.confidence === "high" && (s.section === "projects" || s.section === "experience"),
    );
    out[code] = {
      level,
      source: "resume_inferred",
      confidence: strong ? "high" : "medium",
      basis: basisFor(inCategory),
      inferred_level: level,
    };
  }
  return out;
}
