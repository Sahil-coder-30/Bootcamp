// Frontend copy of the CandidateProfile rules (backend/src/contract/profile.schema.ts).
// Both run docs/contract/fixtures/candidate-profile-cases.json so they cannot drift.
import { z } from "zod";
import { CATEGORY_CODES, CODES, type Code } from "@/lib/categories";

export const SCHEMA_VERSION = "1.0";

/** Accents stripped, lower-cased, punctuation collapsed (same as backend/src/lib/text.ts). */
export function norm(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const currentYear = () => new Date().getFullYear();

const yearString = (maxYear: () => number, minYear = 1990) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d{4}$/.test(v), "Use a 4-digit year")
    .refine(
      (v) => v === "" || (Number(v) >= minYear && Number(v) <= maxYear()),
      () => ({ message: `Year must be between ${minYear} and ${maxYear()}` }),
    );

const yearMonth = z
  .string()
  .trim()
  .refine((v) => v === "" || /^\d{4}-(0[1-9]|1[0-2])$/.test(v), "Use YYYY-MM");

export const skillSchema = z
  .object({
    skill_name: z.string().trim().min(1, "Skill name is required").max(60),
    category_code: z.enum(CATEGORY_CODES),
    evidence: z.string().trim().min(1, "Evidence is required").max(200),
    confidence: z.enum(["high", "medium", "low"]),
    canonical_id: z.string().nullish(),
    level_hint: z.number().int().min(1).max(10).nullish(),
    requirement: z.enum(["must", "nice"]).nullish(),
    section: z.string().nullish(),
  })
  .passthrough();

const educationDetailSchema = z.object({
  degree: z.string().trim().min(1, "Degree is required").max(120),
  institution: z.string().trim().max(160),
  year: yearString(() => currentYear() + 6).optional(),
  score: z.string().trim().max(40).optional(),
});

const internshipSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  org: z.string().trim().min(1, "Organisation is required").max(160),
  start: yearMonth.optional(),
  end: yearMonth.nullable().optional(),
  highlights: z.array(z.string().trim().max(300)),
});

const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(600).optional(),
  skills: z.array(z.string().trim().max(60)),
  link: z.string().trim().max(300).optional(),
});

const hackathonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  result: z.string().trim().max(120).optional(),
  year: yearString(currentYear).optional(),
});

const certificationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  issuer: z.string().trim().max(120).optional(),
  year: yearString(currentYear).optional(),
});

export const skillLevelSchema = z.object({
  level: z.number().int().min(1).max(10),
  source: z.enum(["resume_inferred", "self", "assessed"]),
  confidence: z.enum(["high", "medium", "low"]),
  basis: z.string().max(200),
  inferred_level: z.number().int().min(1).max(10).nullable().optional(),
});

const skillLevelsSchema = z
  .object(
    Object.fromEntries(CODES.map((c) => [c, skillLevelSchema])) as Record<
      Code,
      typeof skillLevelSchema
    >,
  )
  .strict();

const profileObject = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    education: z.string().trim().max(400),
    skills: z.array(skillSchema),
    hackathons: z.array(hackathonSchema),
    internships: z.array(internshipSchema),
    certifications: z.array(certificationSchema),
    preferred_roles: z.array(z.string().trim().min(2).max(60)).max(5),
    cv_file: z.string().max(300).nullable(),
    id: z.string().uuid().optional(),
    version: z.number().int().min(1).optional(),
    phone: z.string().trim().max(30).optional(),
    links: z.array(z.string().trim().max(300)).max(10).optional(),
    education_details: z.array(educationDetailSchema),
    projects: z.array(projectSchema),
    skill_levels: skillLevelsSchema,
    resume_extraction_id: z.string().uuid().nullable().optional(),
    schema_version: z.literal(SCHEMA_VERSION),
    updated_at: z.string().optional(),
  })
  .strict();

type Shape = z.infer<typeof profileObject>;

function rules(p: Shape, ctx: z.RefinementCtx) {
  p.internships.forEach((it, i) => {
    if (it.start && it.end && it.end < it.start) {
      ctx.addIssue({
        code: "custom",
        path: ["internships", i, "end"],
        message: "End is before start",
      });
    }
  });
  const seenSkills = new Set<string>();
  p.skills.forEach((s, i) => {
    const key = s.canonical_id ?? norm(s.skill_name);
    if (seenSkills.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["skills", i, "skill_name"],
        message: "Duplicate skill",
      });
    }
    seenSkills.add(key);
  });
  const seenRoles = new Set<string>();
  p.preferred_roles.forEach((r, i) => {
    const key = r.toLowerCase();
    if (seenRoles.has(key)) {
      ctx.addIssue({ code: "custom", path: ["preferred_roles", i], message: "Duplicate role" });
    }
    seenRoles.add(key);
  });
}

/** What the form holds and what Save sends (server-owned fields are optional). */
export const profileFormSchema = profileObject.superRefine(rules);

export type ProfileValues = z.infer<typeof profileFormSchema>;
export type Skill = ProfileValues["skills"][number];
export type SkillLevel = ProfileValues["skill_levels"][Code];
export type SkillLevels = ProfileValues["skill_levels"];
export type Internship = ProfileValues["internships"][number];
export type EducationDetail = ProfileValues["education_details"][number];

const SERVER_FIELDS = ["id", "version", "updated_at"] as const;

/** JSON import: missing sections default to empty, server-owned fields are dropped. */
export const profileImportSchema = z.preprocess((raw) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const o: Record<string, unknown> = { ...(raw as Record<string, unknown>) };
  for (const k of SERVER_FIELDS) delete o[k];
  for (const k of [
    "skills",
    "hackathons",
    "internships",
    "certifications",
    "preferred_roles",
    "education_details",
    "projects",
  ]) {
    o[k] ??= [];
  }
  o["education"] ??= "";
  o["cv_file"] ??= null;
  o["schema_version"] ??= SCHEMA_VERSION;
  return o;
}, profileFormSchema);

export interface Issue {
  path: string;
  message: string;
}

export const toIssues = (err: z.ZodError): Issue[] =>
  err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
