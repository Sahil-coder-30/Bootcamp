// Applies the candidate's accept/keep decisions to the merged draft the backend produced.
// The backend merge already applied every entry's default; we only undo or flip the ones the
// candidate decided differently, so no merge logic lives in the browser.
import type { DiffDecision, DiffEntry } from "./types";
import type { ProfileValues } from "./schema";

type Bag = Record<string, unknown>;

export function getPath(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, k) => (acc as Bag | undefined)?.[k], obj);
}

export function setPath(obj: Bag, path: string, value: unknown): void {
  const keys = path.split(".");
  const last = keys.pop() as string;
  const parent = keys.reduce<Bag>((acc, k) => acc[k] as Bag, obj);
  parent[last] = value;
}

/** `{ path: "internships.2" }` -> ["internships", 2]; null when the path is not a list item. */
function listItem(path: string): [string, number] | null {
  const m = /^(.*)\.(\d+)$/.exec(path);
  return m ? [m[1] as string, Number(m[2])] : null;
}

/** The decision for an entry: the candidate's choice, else the backend's default. */
export const decisionFor = (e: DiffEntry, decisions: Record<string, DiffDecision>): DiffDecision =>
  decisions[e.path] ?? e.default;

/**
 * @param base      the existing profile (what `keep` restores)
 * @param merged    the backend's merged draft (every default already applied)
 * @param diff      the entries the backend produced
 * @param decisions the candidate's choices, by path; missing means the entry's default
 */
export function applyDiffDecisions(
  base: ProfileValues,
  merged: ProfileValues,
  diff: DiffEntry[],
  decisions: Record<string, DiffDecision>,
): ProfileValues {
  const out = structuredClone(merged) as unknown as Bag;
  const removals: [string, number][] = [];

  for (const e of diff) {
    const decision = decisionFor(e, decisions);
    if (decision === e.default) continue;

    if (decision === "keep") {
      // The default was accept: undo it.
      const item = listItem(e.path);
      if (e.kind === "add" && item) removals.push(item);
      else setPath(out, e.path, structuredClone(getPath(base, e.path)));
    } else if (e.kind === "info" || e.kind === "conflict") {
      // The default was keep: take the resume's value instead.
      const lvl = /^skill_levels\.(\w+)$/.exec(e.path);
      if (lvl) {
        const cur = getPath(out, e.path) as Bag;
        setPath(out, e.path, {
          ...cur,
          level: e.incoming,
          source: "resume_inferred",
          basis: "Accepted from the newer resume",
          inferred_level: e.incoming,
        });
      } else {
        setPath(out, e.path, e.incoming);
      }
    }
  }

  // Remove rejected additions from the highest index down so earlier removals do not shift later ones.
  removals
    .sort((a, b) => (a[0] === b[0] ? b[1] - a[1] : a[0].localeCompare(b[0])))
    .forEach(([listPath, index]) => (getPath(out, listPath) as unknown[]).splice(index, 1));

  return out as unknown as ProfileValues;
}

export const diffCounts = (diff: DiffEntry[]) => ({
  add: diff.filter((d) => d.kind === "add").length,
  update: diff.filter((d) => d.kind === "update").length,
  conflict: diff.filter((d) => d.kind === "conflict").length,
  info: diff.filter((d) => d.kind === "info").length,
});

const LIST_LABEL: Record<string, [string, string]> = {
  education_details: ["education entry", "education entries"],
  internships: ["internship", "internships"],
  projects: ["project", "projects"],
  hackathons: ["hackathon", "hackathons"],
  certifications: ["certification", "certifications"],
  skills: ["skill", "skills"],
  preferred_roles: ["target role", "target roles"],
};

/**
 * One-line headline for the re-import dialog, e.g.
 * "1 new internship, 3 new skills, COD 6 to 7, your self-rated SYSD kept".
 */
export function summarizeDiff(diff: DiffEntry[]): string {
  if (diff.length === 0) return "No changes";
  const parts: string[] = [];

  const adds = new Map<string, number>();
  for (const e of diff) {
    if (e.kind !== "add") continue;
    const list = e.path.split(".")[0] as string;
    adds.set(list, (adds.get(list) ?? 0) + 1);
  }
  for (const [list, n] of adds) {
    const [one, many]: [string, string] = LIST_LABEL[list] ?? [list, list];
    parts.push(`${n} new ${n === 1 ? one : many}`);
  }

  for (const e of diff) {
    const lvl = /^skill_levels\.(\w+)$/.exec(e.path);
    if (!lvl) continue;
    if (e.kind === "update") parts.push(`${lvl[1]} ${String(e.current)} to ${String(e.incoming)}`);
    if (e.kind === "info") parts.push(`your self-rated ${lvl[1]} kept`);
  }

  const updates = diff.filter(
    (e) => e.kind === "update" && !e.path.startsWith("skill_levels."),
  ).length;
  if (updates > 0) parts.push(`${updates} detail${updates === 1 ? "" : "s"} filled in`);
  const conflicts = diff.filter((e) => e.kind === "conflict").length;
  if (conflicts > 0) parts.push(`${conflicts} conflict${conflicts === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/** A short human label for a diff value: a name for objects, the text for scalars. */
export function summarizeValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "empty";
  if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return `${v.length} item${v.length === 1 ? "" : "s"}`;
  const o = v as Bag;
  const main = ["skill_name", "name", "title", "degree"]
    .map((k) => o[k])
    .find((x) => typeof x === "string");
  const extra = ["org", "institution", "issuer"]
    .map((k) => o[k])
    .find((x) => typeof x === "string");
  return [main, extra].filter(Boolean).join(" at ") || JSON.stringify(v).slice(0, 60);
}

/** A readable name for a diff path, e.g. "internships.2" -> "Internship 3". */
export function describePath(path: string): string {
  const lvl = /^skill_levels\.(\w+)$/.exec(path);
  if (lvl) return `${lvl[1]} level`;
  const item = /^(\w+)\.(\d+)$/.exec(path);
  if (item) {
    const list = item[1] as string;
    const one = LIST_LABEL[list]?.[0] ?? list;
    return `${one.charAt(0).toUpperCase()}${one.slice(1)} ${Number(item[2]) + 1}`;
  }
  return path.replace(/_/g, " ");
}

export interface LevelChange {
  code: string;
  from: number;
  to: number;
  fromSource: string;
  toSource: string;
}

/** Which of the 12 levels changed between two versions (older -> newer). */
export function levelChanges(older: ProfileValues, newer: ProfileValues): LevelChange[] {
  const out: LevelChange[] = [];
  for (const code of Object.keys(newer.skill_levels) as (keyof ProfileValues["skill_levels"])[]) {
    const a = older.skill_levels[code];
    const b = newer.skill_levels[code];
    if (a.level !== b.level || a.source !== b.source) {
      out.push({ code, from: a.level, to: b.level, fromSource: a.source, toSource: b.source });
    }
  }
  return out;
}
