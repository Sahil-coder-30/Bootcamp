// Storage for candidate profiles behind one interface. Supabase when configured, otherwise an
// in-memory store seeded from src/data/seedProfiles (same fallback idea as companies.service).
import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type {
  CandidateProfile,
  CandidateProfileInput,
  ChangeSource,
  ListQuery,
} from "../contract/profile.schema.js";
import { SEED_PROFILES } from "../data/seedProfiles/index.js";
import { computeCompleteness } from "../lib/profileCompleteness.js";
import { supabase } from "./supabase.service.js";

export interface ProfileRow {
  id: string;
  email: string;
  profile: CandidateProfile;
  version: number;
  resume_extraction_id: string | null;
  completeness: number;
  change_source: ChangeSource;
  created_at: string;
  updated_at: string;
}

export interface ProfileVersionRow {
  profile_id: string;
  version: number;
  profile: CandidateProfile;
  change_source: ChangeSource;
  created_at: string;
}

export interface NewProfileRow {
  id?: string;
  email: string;
  profile: CandidateProfileInput;
  resume_extraction_id: string | null;
  completeness: number;
  change_source: ChangeSource;
}

export type ProfilePatch = Omit<NewProfileRow, "id">;

export interface ProfilesRepo {
  list(q: ListQuery): Promise<{ rows: ProfileRow[]; nextCursor: string | null }>;
  findById(id: string): Promise<ProfileRow | null>;
  findByEmail(email: string): Promise<ProfileRow | null>;
  insert(row: NewProfileRow): Promise<ProfileRow>;
  /** Atomic: only updates when the stored version still equals `expected`; null otherwise. */
  updateIfVersion(id: string, expected: number, patch: ProfilePatch): Promise<ProfileRow | null>;
  versions(id: string): Promise<ProfileVersionRow[]>;
  remove(id: string): Promise<boolean>;
}

/** Another profile already owns this email. */
export class DuplicateEmailError extends Error {
  constructor(public existingId: string | null) {
    super("A profile with this email already exists");
  }
}

interface Cursor {
  u: string;
  i: string;
}

export const encodeCursor = (c: Cursor) => Buffer.from(JSON.stringify(c)).toString("base64url");

export function decodeCursor(raw: string): Cursor {
  try {
    const c = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as Partial<Cursor>;
    if (typeof c.u === "string" && typeof c.i === "string") return { u: c.u, i: c.i };
  } catch {
    // fall through
  }
  throw new HttpError(400, "Invalid cursor");
}

// Keep history bounded, like the database trigger does.
const MAX_VERSIONS = 20;

/** The stored JSON always carries the server-owned fields, like the DB trigger guarantees. */
const synced = (
  profile: CandidateProfileInput | CandidateProfile,
  id: string,
  version: number,
  updatedAt: string,
  email: string,
): CandidateProfile => ({ ...profile, id, version, updated_at: updatedAt, email }) as CandidateProfile;

export function createMemoryRepo(seed: CandidateProfile[] = SEED_PROFILES): ProfilesRepo {
  const rows = new Map<string, ProfileRow>();
  const history = new Map<string, ProfileVersionRow[]>();

  const snapshot = (row: ProfileRow) => {
    const list = history.get(row.id) ?? [];
    list.push({
      profile_id: row.id,
      version: row.version,
      profile: structuredClone(row.profile),
      change_source: row.change_source,
      created_at: row.updated_at,
    });
    history.set(row.id, list.slice(-MAX_VERSIONS));
  };

  const put = (row: ProfileRow) => {
    rows.set(row.id, row);
    snapshot(row);
    return structuredClone(row);
  };

  for (const p of seed) {
    const id = p.id as string;
    const now = p.updated_at ?? new Date().toISOString();
    put({
      id,
      email: p.email,
      profile: structuredClone(p),
      version: p.version ?? 1,
      resume_extraction_id: p.resume_extraction_id ?? null,
      completeness: computeCompleteness(p).score,
      change_source: "seed",
      created_at: now,
      updated_at: now,
    });
  }

  return {
    async list({ limit, cursor, q, email }) {
      let all = [...rows.values()].sort(
        (a, b) => b.updated_at.localeCompare(a.updated_at) || b.id.localeCompare(a.id),
      );
      if (email) all = all.filter((r) => r.email === email);
      if (q) all = all.filter((r) => r.profile.name.toLowerCase().includes(q.toLowerCase()));
      if (cursor) {
        const c = decodeCursor(cursor);
        all = all.filter((r) => r.updated_at < c.u || (r.updated_at === c.u && r.id < c.i));
      }
      const page = all.slice(0, limit + 1);
      const hasMore = page.length > limit;
      const out = page.slice(0, limit);
      const last = out[out.length - 1];
      return {
        rows: out.map((r) => structuredClone(r)),
        nextCursor: hasMore && last ? encodeCursor({ u: last.updated_at, i: last.id }) : null,
      };
    },

    async findById(id) {
      const aliasMap: Record<string, string> = {
        "6f1c-ananya": "3a000000-0000-4000-8000-000000000001",
        "6f1c-karthik": "3a000000-0000-4000-8000-000000000002",
        "6f1c-priya": "3a000000-0000-4000-8000-000000000003",
        "6f1c-rohan": "3a000000-0000-4000-8000-000000000004",
      };
      const resolvedId = aliasMap[id] ?? id;
      let r = rows.get(resolvedId);
      if (!r && id.includes("@")) {
        r = [...rows.values()].find((x) => x.email.toLowerCase() === id.toLowerCase());
      }
      return r ? structuredClone(r) : null;
    },

    async findByEmail(email) {
      const r = [...rows.values()].find((x) => x.email.toLowerCase() === email.toLowerCase());
      return r ? structuredClone(r) : null;
    },

    async insert(row) {
      const dup = [...rows.values()].find((x) => x.email === row.email);
      if (dup) throw new DuplicateEmailError(dup.id);
      const id = row.id ?? randomUUID();
      const now = new Date().toISOString();
      return put({
        id,
        email: row.email,
        profile: synced(row.profile, id, 1, now, row.email),
        version: 1,
        resume_extraction_id: row.resume_extraction_id,
        completeness: row.completeness,
        change_source: row.change_source,
        created_at: now,
        updated_at: now,
      });
    },

    async updateIfVersion(id, expected, patch) {
      const cur = rows.get(id);
      if (!cur || cur.version !== expected) return null;
      const dup = [...rows.values()].find((x) => x.email === patch.email && x.id !== id);
      if (dup) throw new DuplicateEmailError(dup.id);
      const now = new Date().toISOString();
      const version = expected + 1;
      return put({
        ...cur,
        email: patch.email,
        profile: synced(patch.profile, id, version, now, patch.email),
        version,
        resume_extraction_id: patch.resume_extraction_id,
        completeness: patch.completeness,
        change_source: patch.change_source,
        updated_at: now,
      });
    },

    async versions(id) {
      return structuredClone(history.get(id) ?? []).sort((a, b) => b.version - a.version);
    },

    async remove(id) {
      history.delete(id);
      return rows.delete(id);
    },
  };
}

// Postgres unique_violation, as surfaced by supabase-js.
const UNIQUE_VIOLATION = "23505";

export function createSupabaseRepo(): ProfilesRepo {
  const db = () => {
    if (!supabase) throw new HttpError(503, "Supabase is not configured");
    return supabase;
  };

  const toRow = (r: Record<string, unknown>): ProfileRow => ({
    id: String(r["id"]),
    email: String(r["email"]),
    profile: r["profile"] as CandidateProfile,
    version: Number(r["version"]),
    resume_extraction_id: (r["resume_extraction_id"] as string | null) ?? null,
    completeness: Number(r["completeness"] ?? 0),
    change_source: (r["change_source"] as ChangeSource) ?? "form",
    created_at: String(r["created_at"]),
    updated_at: String(r["updated_at"]),
  });

  const fields = (p: ProfilePatch) => ({
    email: p.email,
    name: p.profile.name,
    profile: p.profile,
    resume_extraction_id: p.resume_extraction_id,
    completeness: p.completeness,
    change_source: p.change_source,
  });

  return {
    async list({ limit, cursor, q, email }) {
      let query = db().from("candidate_profiles").select("*");
      if (email) query = query.eq("email", email);
      if (q) query = query.ilike("name", `%${q.replace(/[%_,()]/g, " ")}%`);
      if (cursor) {
        const c = decodeCursor(cursor);
        query = query.or(`updated_at.lt.${c.u},and(updated_at.eq.${c.u},id.lt.${c.i})`);
      }
      const { data, error } = await query
        .order("updated_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limit + 1);
      if (error) throw error;
      const all = (data ?? []).map(toRow);
      const out = all.slice(0, limit);
      const last = out[out.length - 1];
      return {
        rows: out,
        nextCursor: all.length > limit && last ? encodeCursor({ u: last.updated_at, i: last.id }) : null,
      };
    },

    async findById(id) {
      if (id.includes("@")) {
        return this.findByEmail(id);
      }
      let { data, error } = await db().from("candidate_profiles").select("*").eq("id", id).maybeSingle();
      if (!data && !error && /^[0-9a-f-]{36}$/i.test(id)) {
        // Also check if id is a user_id
        const byUser = await db().from("candidate_profiles").select("*").eq("user_id", id).maybeSingle();
        if (byUser.data) data = byUser.data;
      }
      if (error) throw error;
      return data ? toRow(data) : null;
    },

    async findByEmail(email) {
      const { data, error } = await db().from("candidate_profiles").select("*").ilike("email", email).maybeSingle();
      if (error) throw error;
      return data ? toRow(data) : null;
    },

    async insert(row) {
      const { data, error } = await db()
        .from("candidate_profiles")
        .insert({ ...(row.id ? { id: row.id } : {}), ...fields(row) })
        .select()
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) {
          const existing = await this.findByEmail(row.email);
          throw new DuplicateEmailError(existing?.id ?? null);
        }
        throw error;
      }
      return toRow(data);
    },

    async updateIfVersion(id, expected, patch) {
      // The `where version = expected` is the lock: no read-modify-write race.
      const { data, error } = await db()
        .from("candidate_profiles")
        .update({ ...fields(patch), version: expected + 1 })
        .eq("id", id)
        .eq("version", expected)
        .select()
        .maybeSingle();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) throw new DuplicateEmailError(null);
        throw error;
      }
      return data ? toRow(data) : null;
    },

    async versions(id) {
      const { data, error } = await db()
        .from("candidate_profile_versions")
        .select("*")
        .eq("profile_id", id)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ProfileVersionRow[];
    },

    async remove(id) {
      const { data, error } = await db().from("candidate_profiles").delete().eq("id", id).select("id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  };
}

export function getProfilesRepo(): ProfilesRepo {
  return supabase && env.profilesStore !== "memory" ? createSupabaseRepo() : createMemoryRepo();
}
