// ResumeExtraction -> draft CandidateProfile + provenance (plan 3.3).
import type {
  CandidateProfileInput,
  EducationDetail,
  Provenance,
  ProvenanceMap,
  ResumeExtraction,
  Skill,
} from "../contract/profile.schema.js";
import { SCHEMA_VERSION } from "../contract/profile.schema.js";
import { buildSkillLevels } from "./skillLevels.js";
import { norm } from "./text.js";

const MAX_EVIDENCE = 200;
const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 } as const;

/** Most recent education entry as `"<degree>, <institution>, <year>, <score>"`, empty parts skipped. */
export function formatEducation(details: EducationDetail[]): string {
  if (details.length === 0) return "";
  const latest = details.reduce((best, d) => (Number(d.year ?? 0) > Number(best.year ?? 0) ? d : best));
  return [latest.degree, latest.institution, latest.year, latest.score]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(", ");
}

/** Dedupe by `canonical_id ?? norm(name)`: keep the higher confidence and the longer evidence. */
export function dedupeSkills(skills: Skill[]): Skill[] {
  const byKey = new Map<string, Skill>();
  for (const s of skills) {
    const key = s.canonical_id ?? norm(s.skill_name);
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, { ...s, evidence: s.evidence.slice(0, MAX_EVIDENCE) });
      continue;
    }
    const best = CONFIDENCE_RANK[s.confidence] > CONFIDENCE_RANK[prev.confidence] ? s : prev;
    const evidence = (s.evidence.length > prev.evidence.length ? s.evidence : prev.evidence).slice(0, MAX_EVIDENCE);
    byKey.set(key, { ...best, evidence });
  }
  return [...byKey.values()];
}

const INTERN_LIKE = /intern|trainee|apprentice/i;

type Section = "candidate" | "education" | "experience" | "projects" | "hackathons" | "certifications";

const SECTION_OF: Record<string, Section> = {
  name: "candidate",
  email: "candidate",
  phone: "candidate",
  links: "candidate",
  education: "education",
  education_details: "education",
  internships: "experience",
  projects: "projects",
  hackathons: "hackathons",
  certifications: "certifications",
};

function leaves(value: unknown, path: string, out: [string, string][]) {
  if (Array.isArray(value)) {
    value.forEach((v, i) => leaves(v, `${path}.${i}`, out));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) leaves(v, `${path}.${k}`, out);
  } else if (value !== null && value !== undefined && String(value).trim() !== "") {
    out.push([path, String(value)]);
  }
}

export function mapExtractionToDraft(
  ex: ResumeExtraction,
  extractionId: string,
  cvPath: string | null,
): { draft: CandidateProfileInput; provenance: ProvenanceMap; warnings: string[] } {
  const warnings: string[] = [];
  const cand = ex.candidate ?? {};

  const education_details = (ex.education ?? []).map((e) => ({
    degree: e.degree,
    institution: e.institution ?? "",
    ...(e.year ? { year: e.year } : {}),
    ...(e.score ? { score: e.score } : {}),
  }));

  const internships = (ex.experience ?? []).map((x) => {
    if (!INTERN_LIKE.test(x.title)) warnings.push(`'${x.title}' kept under internships`);
    return {
      title: x.title,
      org: x.org,
      ...(x.start ? { start: x.start } : {}),
      ...(x.end !== undefined ? { end: x.end } : {}),
      highlights: x.highlights ?? [],
    };
  });

  const skills = dedupeSkills(ex.skills ?? []);

  const draft: CandidateProfileInput = {
    name: (cand.name ?? "").trim(),
    email: (cand.email ?? "").trim().toLowerCase(),
    education: formatEducation(education_details),
    skills,
    hackathons: ex.hackathons ?? [],
    internships,
    certifications: ex.certifications ?? [],
    preferred_roles: ex.role ? [ex.role] : [],
    cv_file: cvPath,
    education_details,
    projects: (ex.projects ?? []).map((p) => ({ ...p, skills: p.skills ?? [] })),
    skill_levels: buildSkillLevels(ex.category_levels, skills),
    resume_extraction_id: extractionId,
    schema_version: SCHEMA_VERSION,
    ...(cand.phone ? { phone: cand.phone } : {}),
    ...(cand.links?.length ? { links: cand.links } : {}),
  };

  const provenance: ProvenanceMap = {};
  const mapped: Record<string, unknown> = {
    name: draft.name,
    email: draft.email,
    phone: draft.phone,
    links: draft.links,
    education: draft.education,
    education_details: draft.education_details,
    internships: draft.internships,
    projects: draft.projects,
    hackathons: draft.hackathons,
    certifications: draft.certifications,
    skills: draft.skills,
    preferred_roles: draft.preferred_roles,
  };
  for (const [root, value] of Object.entries(mapped)) {
    const found: [string, string][] = [];
    leaves(value, root, found);
    for (const [path, text] of found) {
      let entry: Provenance;
      if (root === "skills") {
        const skill = draft.skills[Number(path.split(".")[1])];
        entry = {
          source: "resume",
          extraction_id: extractionId,
          confidence: skill?.confidence ?? "medium",
          evidence: (skill?.evidence ?? text).slice(0, MAX_EVIDENCE),
        };
      } else {
        const section = SECTION_OF[root];
        entry = {
          source: "resume",
          extraction_id: extractionId,
          confidence: (section && ex.field_confidence?.[section]) || "medium",
          evidence: text.slice(0, MAX_EVIDENCE),
        };
      }
      provenance[path] = entry;
    }
  }

  return { draft, provenance, warnings };
}
