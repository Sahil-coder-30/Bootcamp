// CandidateProfile contract (docs/00-shared-contract.md 3.4 + 9, docs/role-3 plan 6.2).
// Base shape and business rules live in one place; the frontend keeps a copy of the same
// rules (frontend/src/features/profile/lib/schema.ts) and both run the shared fixtures.
import { z } from "zod";
import { norm } from "../lib/text.js";

export const CODES = [
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
] as const;
export type Code = (typeof CODES)[number];

export const CATEGORY_CODES = [...CODES, "OTHER"] as const;

export const SCHEMA_VERSION = "1.0";

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
  // v1.1 adds evidence_span and alt_group; unknown keys must survive a round trip.
  .passthrough();
export type Skill = z.infer<typeof skillSchema>;

export const educationDetailSchema = z.object({
  degree: z.string().trim().min(1, "Degree is required").max(120),
  institution: z.string().trim().max(160).default(""),
  year: yearString(() => currentYear() + 6).optional(),
  score: z.string().trim().max(40).optional(),
});
export type EducationDetail = z.infer<typeof educationDetailSchema>;

export const internshipSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  org: z.string().trim().min(1, "Organisation is required").max(160),
  start: yearMonth.optional(),
  end: yearMonth.nullable().optional(),
  highlights: z.array(z.string().trim().max(300)).default([]),
});
export type Internship = z.infer<typeof internshipSchema>;

export const projectSchema = z.object({
  name: z.string().trim().min(1, "Project name is required").max(120),
  description: z.string().trim().max(600).optional(),
  skills: z.array(z.string().trim().max(60)).default([]),
  link: z.string().trim().max(300).optional(),
});
export type Project = z.infer<typeof projectSchema>;

export const hackathonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  result: z.string().trim().max(120).optional(),
  year: yearString(currentYear).optional(),
});
export type Hackathon = z.infer<typeof hackathonSchema>;

export const certificationSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  issuer: z.string().trim().max(120).optional(),
  year: yearString(currentYear).optional(),
});
export type Certification = z.infer<typeof certificationSchema>;

export const skillLevelSchema = z.object({
  level: z.number().int().min(1).max(10),
  source: z.enum(["resume_inferred", "self", "assessed"]),
  confidence: z.enum(["high", "medium", "low"]),
  basis: z.string().max(200),
  inferred_level: z.number().int().min(1).max(10).nullable().optional(),
});
export type SkillLevel = z.infer<typeof skillLevelSchema>;

export const skillLevelsSchema = z
  .object(
    Object.fromEntries(CODES.map((c) => [c, skillLevelSchema])) as Record<Code, typeof skillLevelSchema>,
  )
  .strict();
export type SkillLevels = Record<Code, SkillLevel>;

const profileObject = z
  .object({
    // Brief fields.
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().toLowerCase().email("Enter a valid email"),
    education: z.string().trim().max(400).default(""),
    skills: z.array(skillSchema).default([]),
    hackathons: z.array(hackathonSchema).default([]),
    internships: z.array(internshipSchema).default([]),
    certifications: z.array(certificationSchema).default([]),
    preferred_roles: z.array(z.string().trim().min(2).max(60)).max(5).default([]),
    cv_file: z.string().max(300).nullable().default(null),
    // Role 3 additions.
    id: z.string().uuid().optional(),
    version: z.number().int().min(1).optional(),
    phone: z.string().trim().max(30).optional(),
    links: z.array(z.string().trim().max(300)).max(10).optional(),
    education_details: z.array(educationDetailSchema).default([]),
    projects: z.array(projectSchema).default([]),
    skill_levels: skillLevelsSchema,
    resume_extraction_id: z.string().uuid().nullable().optional(),
    schema_version: z.literal(SCHEMA_VERSION).default(SCHEMA_VERSION),
    updated_at: z.string().optional(),
  })
  .strict();

type ProfileShape = z.infer<typeof profileObject>;

/** Business rules that the generated base shape cannot express. */
function rules(p: ProfileShape, ctx: z.RefinementCtx) {
  p.internships.forEach((it, i) => {
    if (it.start && it.end && it.end < it.start) {
      ctx.addIssue({ code: "custom", path: ["internships", i, "end"], message: "End is before start" });
    }
  });

  const seenSkills = new Set<string>();
  p.skills.forEach((s, i) => {
    const key = s.canonical_id ?? norm(s.skill_name);
    if (seenSkills.has(key)) {
      ctx.addIssue({ code: "custom", path: ["skills", i, "skill_name"], message: "Duplicate skill" });
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

/** A stored profile: server fields (`id`, `version`, `updated_at`) allowed. */
export const candidateProfileSchema = profileObject.superRefine(rules);

/** What clients send to POST/PUT: the same shape without the server-set fields. */
export const candidateProfileInputSchema = profileObject
  .omit({ id: true, version: true, updated_at: true })
  .superRefine(rules);

export type CandidateProfile = z.infer<typeof candidateProfileSchema>;
export type CandidateProfileInput = z.infer<typeof candidateProfileInputSchema>;

export const fromResumeBodySchema = z.object({
  resume_extraction_id: z.string().uuid("resume_extraction_id must be a uuid"),
  profile_id: z.string().uuid().optional(),
});

export const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().max(400).optional(),
  q: z.string().trim().max(100).optional(),
  email: z.string().trim().toLowerCase().max(200).optional(),
});
export type ListQuery = z.infer<typeof listQuerySchema>;

export type ChangeSource = "form" | "resume_import" | "json_import" | "seed" | "calibration";
export const CHANGE_SOURCES: readonly ChangeSource[] = [
  "form",
  "resume_import",
  "json_import",
  "seed",
  "calibration",
];

/** Role 2 output (contract 3.3) as read back from `extractions.result`. */
export interface ResumeExtraction {
  source_type: "jd" | "resume";
  source_file: string;
  company?: string | null;
  role?: string | null;
  skills: Skill[];
  document_id?: string;
  category_levels?: Partial<Record<Code, number>>;
  candidate?: { name?: string; email?: string; phone?: string; links?: string[] };
  education?: { degree: string; institution?: string; year?: string; score?: string }[];
  experience?: {
    title: string;
    org: string;
    start?: string;
    end?: string | null;
    highlights?: string[];
    skills?: string[];
  }[];
  projects?: Project[];
  hackathons?: Hackathon[];
  certifications?: Certification[];
  field_confidence?: Record<string, "high" | "medium" | "low">;
}

export interface Provenance {
  source: "resume";
  extraction_id: string;
  confidence: "high" | "medium" | "low";
  evidence: string;
}
export type ProvenanceMap = Record<string, Provenance>;

export interface DiffEntry {
  path: string;
  kind: "add" | "update" | "conflict" | "info";
  current: unknown;
  incoming: unknown;
  default: "accept" | "keep";
  reason: string;
}

export interface ProfileDraft {
  draft: CandidateProfileInput & { id?: string };
  provenance: ProvenanceMap;
  diff: DiffEntry[] | null;
  existing_profile_id: string | null;
  warnings: string[];
}

export interface ProfileSummary {
  id: string;
  name: string;
  email: string;
  preferred_roles: string[];
  levels: Record<Code, number>;
  completeness: number;
  version: number;
  updated_at: string;
}
