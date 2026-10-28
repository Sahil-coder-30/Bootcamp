// Form values <-> the contract object. The form uses the contract shape directly, so these are
// near-identity; the only derived field is `education` (the brief's display string).
import { CODES } from "@/lib/categories";
import {
  SCHEMA_VERSION,
  type EducationDetail,
  type ProfileValues,
  type SkillLevels,
} from "./schema";

/** Most recent entry as "<degree>, <institution>, <year>, <score>", empty parts skipped. */
export function formatEducation(details: EducationDetail[]): string {
  if (details.length === 0) return "";
  const latest = details.reduce((best, d) =>
    Number(d.year ?? 0) > Number(best.year ?? 0) ? d : best,
  );
  return [latest.degree, latest.institution, latest.year, latest.score]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** 12 levels at 1 / low / "no evidence": what a blank profile (or a resume with no signal) gets. */
export function blankSkillLevels(): SkillLevels {
  return Object.fromEntries(
    CODES.map((c) => [
      c,
      {
        level: 1,
        source: "resume_inferred",
        confidence: "low",
        basis: "no evidence",
        inferred_level: 1,
      },
    ]),
  ) as SkillLevels;
}

export function blankValues(): ProfileValues {
  return {
    name: "",
    email: "",
    education: "",
    skills: [],
    hackathons: [],
    internships: [],
    certifications: [],
    preferred_roles: [],
    cv_file: null,
    education_details: [],
    projects: [],
    skill_levels: blankSkillLevels(),
    resume_extraction_id: null,
    schema_version: SCHEMA_VERSION,
  };
}

/** Form values for a stored profile or an imported/draft object. */
export function toFormValues(p: ProfileValues): ProfileValues {
  return structuredClone(p);
}

const SERVER_FIELDS = ["id", "version", "updated_at"] as const;

const dropEmpty = <T extends Record<string, unknown>>(obj: T, keys: string[]): T => {
  const out: Record<string, unknown> = { ...obj };
  for (const k of keys) if (out[k] === "") delete out[k];
  return out as T;
};

/**
 * The payload Save sends and the JSON panel shows: no server-owned fields, `education` derived
 * from `education_details`, blank optional inputs removed, an empty internship end meaning "ongoing".
 */
export function fromFormValues(values: ProfileValues): ProfileValues {
  const v = structuredClone(values) as Record<string, unknown>;
  for (const k of SERVER_FIELDS) delete v[k];
  const out = v as unknown as ProfileValues;

  if (out.education_details.length > 0) out.education = formatEducation(out.education_details);
  out.education_details = out.education_details.map((e) => dropEmpty(e, ["year", "score"]));
  out.internships = out.internships.map((i) => {
    const cleaned = dropEmpty(i, ["start"]);
    return cleaned.end === "" ? { ...cleaned, end: null } : cleaned;
  });
  out.projects = out.projects.map((p) => dropEmpty(p, ["description", "link"]));
  out.hackathons = out.hackathons.map((h) => dropEmpty(h, ["result", "year"]));
  out.certifications = out.certifications.map((c) => dropEmpty(c, ["issuer", "year"]));
  if (out.phone === "") delete (out as { phone?: string }).phone;
  if (out.links && out.links.length === 0) delete (out as { links?: string[] }).links;
  return out;
}
