// API-facing types for the profile feature (backend/src/contract/profile.schema.ts).
import type { Code } from "@/lib/categories";
import type { ProfileValues } from "./schema";

export type { Code, ProfileValues };

/** A profile as the server returns it: server-owned fields are always present. */
export type StoredProfile = ProfileValues & { id: string; version: number; updated_at: string };

export type Confidence = "high" | "medium" | "low";

export interface Provenance {
  source: "resume";
  extraction_id: string;
  confidence: Confidence;
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
  draft: ProfileValues;
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

export interface ProfileList {
  items: ProfileSummary[];
  next_cursor: string | null;
}

export type ChangeSource = "form" | "resume_import" | "json_import" | "seed" | "calibration";

export interface ProfileVersion {
  profile_id: string;
  version: number;
  profile: StoredProfile;
  change_source: ChangeSource;
  created_at: string;
}

/** A row of Role 4's `GET /api/companies/:id/skill-bar` (view `v_company_skill_bar`). */
export interface CompanyBarRow {
  company_id: number;
  company_name: string;
  skill_set_id: number;
  category_code: string;
  required_level: number;
  bloom_code?: string;
}

export type ReviewState = "pending" | "accepted" | "rejected" | "edited";
export type DiffDecision = "accept" | "keep";
