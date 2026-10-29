/**
 * skillMatch.api.ts
 * Pure Axios API service for Role 5: Skill Matching.
 */

import { apiClient } from "@/services/apiClient";

export type MatchMethod = "exact" | "alias" | "implied" | "fuzzy" | "semantic" | "llm" | "category";
export type MatchBand = "strong" | "good" | "weak";
export type GapType = "missing" | "partial";
export type GapEffort = "quick_win" | "big_gap";

export interface MatchedSkill {
  jd_skill: string;
  candidate_skill: string;
  category_code: string;
  method: MatchMethod;
  similarity: number;
  requirement: "must" | "nice";
  evidence: string;
  credit: number;
  jd_evidence?: string | null;
  relation?: string | null;
  reason?: string | null;
}

export interface MissingSkill {
  skill_name: string;
  category_code: string;
  requirement: "must" | "nice";
  why_it_matters: string;
  closest_candidate_skill?: string | null;
  learn_next?: string | null;
  gap_type: GapType;
  effort: GapEffort;
  impact_points: number;
  priority: number;
  jd_evidence?: string | null;
  section?: string | null;
  candidate_level?: number | null;
  required_level?: number | null;
}

export interface ScoreBreakdown {
  must_coverage: number;
  nice_coverage: number;
  level_fit: number;
  raw_score: number;
  cap: number;
  cap_reason?: string | null;
  weights: {
    must: number;
    nice: number;
    level: number;
  };
}

export interface SkillMatchMeta {
  taxonomy_version: string;
  prompt_version: string;
  stage_counts: Record<string, number>;
  llm_calls: number;
  llm_pairs: number;
  latency_ms: number;
  cached: boolean;
  warnings: string[];
}

export interface SkillMatchResult {
  jd_source_file: string;
  match_score: number;
  match_band: MatchBand;
  jd_id?: string | null;
  profile_id?: string | null;
  profile_version?: number | null;
  matched_skills: MatchedSkill[];
  missing_skills: MissingSkill[];
  category_coverage: Record<string, number>;
  score_breakdown: ScoreBreakdown;
  matching_version: string;
  meta: SkillMatchMeta;
}

export interface BatchCell {
  profile_id: string;
  jd_id: string;
  match_score: number;
  band: MatchBand;
  must_coverage: number;
  top_missing: string[];
  skill_match_id?: string | null;
}

export interface SkillMatchMatrix {
  matching_version: string;
  profiles: Array<{ id: string; name: string }>;
  jds: Array<{ id: string; company: string; role: string; source_file: string }>;
  cells: BatchCell[];
  best_jd_by_profile: Record<string, string>;
  best_candidate_by_jd: Record<string, string>;
  meta?: Record<string, unknown>;
}

export async function runSkillMatchAPI(body: {
  profile_id: string;
  jd_id: string;
  refresh?: boolean;
}): Promise<SkillMatchResult> {
  const { data } = await apiClient.post<SkillMatchResult>("/skill-match", body);
  return data;
}

export async function getSkillMatchMatrixAPI(params?: {
  profile_ids?: string;
  jd_ids?: string;
  refresh?: boolean;
}): Promise<SkillMatchMatrix> {
  const { data } = await apiClient.get<SkillMatchMatrix>("/skill-match/matrix", {
    params,
  });
  return data;
}
