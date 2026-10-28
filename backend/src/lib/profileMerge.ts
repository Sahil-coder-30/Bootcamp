// Re-import merge (plan 3.4). Invariants: nothing the candidate typed is deleted or silently
// overwritten, and importing the same resume twice gives an empty diff.
import {
  CODES,
  type CandidateProfileInput,
  type DiffEntry,
  type Skill,
} from "../contract/profile.schema.js";
import { formatEducation } from "./profileMapping.js";
import { norm } from "./text.js";

export { norm };

export type StoredShape = CandidateProfileInput & { id?: string; version?: number; updated_at?: string };

const CONFIDENCE_RANK = { high: 2, medium: 1, low: 0 } as const;
const MAX_EVIDENCE = 200;
const MAX_ROLES = 5;

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Fills only the empty sub-fields of `cur` from `inc`; null when nothing changed. */
function fillEmpty<T extends object>(cur: T, inc: T): T | null {
  const out: Record<string, unknown> = { ...(cur as Record<string, unknown>) };
  let changed = false;
  for (const [k, v] of Object.entries(inc as Record<string, unknown>)) {
    if (isEmpty(out[k]) && !isEmpty(v)) {
      out[k] = v;
      changed = true;
    }
  }
  return changed ? (out as T) : null;
}

function mergeList<T extends object>(
  path: string,
  existing: T[],
  incoming: T[],
  key: (item: T) => string,
  label: string,
  diff: DiffEntry[],
  fill: (cur: T, inc: T) => T | null = fillEmpty,
): T[] {
  const result = [...existing];
  for (const inc of incoming) {
    const k = key(inc);
    const i = result.findIndex((r) => key(r) === k);
    if (i === -1) {
      result.push(inc);
      diff.push({
        path: `${path}.${result.length - 1}`,
        kind: "add",
        current: null,
        incoming: inc,
        default: "accept",
        reason: `New ${label} found in resume`,
      });
      continue;
    }
    const filled = fill(result[i] as T, inc);
    if (filled) {
      diff.push({
        path: `${path}.${i}`,
        kind: "update",
        current: result[i],
        incoming: filled,
        default: "accept",
        reason: `Resume adds details to your ${label}`,
      });
      result[i] = filled;
    }
  }
  return result;
}

function fillSkill(cur: Skill, inc: Skill): Skill | null {
  const confidence = CONFIDENCE_RANK[inc.confidence] > CONFIDENCE_RANK[cur.confidence] ? inc.confidence : cur.confidence;
  const evidence = (inc.evidence.length > cur.evidence.length ? inc.evidence : cur.evidence).slice(0, MAX_EVIDENCE);
  if (confidence === cur.confidence && evidence === cur.evidence) return null;
  return { ...cur, confidence, evidence };
}

export function mergeProfiles(
  existing: StoredShape,
  incoming: CandidateProfileInput,
): { merged: StoredShape; diff: DiffEntry[] } {
  const diff: DiffEntry[] = [];
  const merged: StoredShape = structuredClone(existing);

  for (const field of ["name", "email", "phone"] as const) {
    const cur = (existing[field] ?? "").trim();
    const inc = (incoming[field] ?? "").trim();
    if (!inc) continue;
    if (!cur) {
      merged[field] = inc;
      diff.push({ path: field, kind: "update", current: cur, incoming: inc, default: "accept", reason: `Resume has your ${field}` });
    } else if (cur.toLowerCase() !== inc.toLowerCase()) {
      diff.push({
        path: field,
        kind: "conflict",
        current: cur,
        incoming: inc,
        default: "keep",
        reason: `Resume has a different ${field}; yours is kept`,
      });
    }
  }

  const before = diff.length;
  merged.education_details = mergeList(
    "education_details",
    existing.education_details,
    incoming.education_details,
    (e) => norm(e.degree) + "|" + norm(e.institution ?? ""),
    "education entry",
    diff,
  );
  // The display string is derived; only recompute it when the details actually changed.
  if (diff.length > before && merged.education_details.length > 0) {
    merged.education = formatEducation(merged.education_details);
  }

  merged.internships = mergeList(
    "internships",
    existing.internships,
    incoming.internships,
    (x) => norm(x.org) + "|" + norm(x.title),
    "internship",
    diff,
  );
  merged.projects = mergeList("projects", existing.projects, incoming.projects, (p) => norm(p.name), "project", diff);
  merged.hackathons = mergeList(
    "hackathons",
    existing.hackathons,
    incoming.hackathons,
    (h) => norm(h.name) + "|" + (h.year ?? ""),
    "hackathon",
    diff,
  );
  merged.certifications = mergeList(
    "certifications",
    existing.certifications,
    incoming.certifications,
    (c) => norm(c.name) + "|" + norm(c.issuer ?? ""),
    "certification",
    diff,
  );
  merged.skills = mergeList(
    "skills",
    existing.skills,
    incoming.skills,
    (s) => s.canonical_id ?? norm(s.skill_name),
    "skill",
    diff,
    fillSkill,
  );

  const roles = [...existing.preferred_roles];
  for (const role of incoming.preferred_roles) {
    if (roles.length >= MAX_ROLES || roles.some((r) => r.toLowerCase() === role.toLowerCase())) continue;
    roles.push(role);
    diff.push({
      path: `preferred_roles.${roles.length - 1}`,
      kind: "add",
      current: null,
      incoming: role,
      default: "accept",
      reason: "Target role found in resume",
    });
  }
  merged.preferred_roles = roles;

  for (const code of CODES) {
    const cur = existing.skill_levels[code];
    const inc = incoming.skill_levels[code];
    const noEvidence = inc.confidence === "low" && inc.basis === "no evidence";
    if (cur.source === "self" || cur.source === "assessed") {
      // The candidate's own number is never changed; we only keep the resume's value for the ghost marker.
      if (noEvidence || inc.level === (cur.inferred_level ?? null)) continue;
      merged.skill_levels[code] = { ...cur, inferred_level: inc.level };
      diff.push({
        path: `skill_levels.${code}`,
        kind: "info",
        current: cur.level,
        incoming: inc.level,
        default: "keep",
        reason: `Resume now suggests ${inc.level}; you set ${cur.level} yourself`,
      });
    } else if (
      cur.level !== inc.level ||
      cur.basis !== inc.basis ||
      cur.confidence !== inc.confidence ||
      (cur.inferred_level ?? null) !== (inc.inferred_level ?? null)
    ) {
      merged.skill_levels[code] = { ...inc };
      diff.push({
        path: `skill_levels.${code}`,
        kind: "update",
        current: cur.level,
        incoming: inc.level,
        default: "accept",
        reason: `Level re-inferred from the newer resume (${cur.level} to ${inc.level})`,
      });
    }
  }

  for (const field of ["cv_file", "resume_extraction_id"] as const) {
    const inc = incoming[field];
    if (inc && inc !== existing[field]) {
      merged[field] = inc;
      diff.push({
        path: field,
        kind: "update",
        current: existing[field] ?? null,
        incoming: inc,
        default: "accept",
        reason: "The newest CV replaces the previous one",
      });
    }
  }

  return { merged, diff };
}
