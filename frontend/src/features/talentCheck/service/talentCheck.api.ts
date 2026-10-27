/**
 * talentCheck.api.ts
 * Pure Axios API service for Role 4: Talent Check.
 */

import { apiClient } from "@/services/apiClient";

export interface NextTopic {
  level: number;
  topics: string;
}

export interface GapRow {
  category_code: string;
  required_level: number;
  candidate_level: number;
  gap: boolean;
  shortfall: number;
  required_bloom: string;
  candidate_bloom: string;
  weight: number;
  next_topics: NextTopic[];
  blocking: boolean;
  points_lost: number;
  raw_bloom_code?: string | null;
}

export interface StudyPlanStep {
  category_code: string;
  from_level: number;
  to_level: number;
  hours: number;
  topics?: string | null;
}

export interface StudyPlan {
  steps: StudyPlanStep[];
  total_steps: number;
  total_hours: number;
  summary: string;
}

export interface TalentCheckResult {
  company: string;
  company_id: number;
  profile_id: string;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet";
  top_gaps: string[];
  scoring_version: string;
  skillset_gap: GapRow[];
  explanation: string;
  readiness_range?: { low: number; high: number };
  blocking_gaps: string[];
  levels_covered?: number;
  levels_needed?: number;
  categories_met?: number;
  study_plan?: StudyPlan | null;
  meta?: {
    bar_source?: "db" | "cache" | "snapshot";
    cached?: boolean;
    latency_ms?: number;
    warnings?: string[];
  };
}

export interface CompanyBarRow {
  skill_set_id: number;
  category_code: string;
  skill_set_name: string;
  required_level: number;
  bloom_code: string;
  raw_bloom_code?: string | null;
  bloom_mismatch: boolean;
}

export interface CompanyBar {
  company_id: number;
  company_name: string;
  display_name?: string | null;
  source: "db" | "cache" | "snapshot";
  rows: CompanyBarRow[];
}

export interface MatrixCell {
  profile_id: string;
  company_id: number;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet";
  top_gaps?: string[];
  blocking_count?: number;
}

export interface TalentMatrixResult {
  companies: { company_id: number; company_name: string }[];
  profiles: { id: string; name: string }[];
  cells: MatrixCell[];
  scoring_version: string;
}

export interface RankRow {
  company_id: number;
  company_name: string;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet";
  top_gaps?: string[];
  blocking_count?: number;
}

export interface RunTalentCheckBody {
  profile_id: string;
  company_id: number;
  skill_levels_override?: Record<string, number>;
  persist?: boolean;
}

export const getSkillBarAPI = async (companyId: number): Promise<CompanyBar> => {
  const response = await apiClient.get<CompanyBar>(`/companies/${companyId}/skill-bar`);
  return response.data;
};

export const runTalentCheckAPI = async (body: RunTalentCheckBody): Promise<TalentCheckResult> => {
  const response = await apiClient.post<TalentCheckResult>("/talent-check", body);
  return response.data;
};

export const getTalentMatrixAPI = async (companyIds: number[]): Promise<TalentMatrixResult> => {
  const response = await apiClient.get<TalentMatrixResult>("/talent-check/matrix", {
    params: { company_ids: companyIds.join(",") },
  });
  return response.data;
};

export const getCompanyRankingAPI = async (profileId: string, limit = 10): Promise<RankRow[]> => {
  const response = await apiClient.get<RankRow[]>("/talent-check/rank", {
    params: { profile_id: profileId, limit },
  });
  return response.data;
};

export const listTalentChecksAPI = async (profileId?: string): Promise<any[]> => {
  const response = await apiClient.get<any[]>("/talent-check", {
    params: { profile_id: profileId },
  });
  return response.data;
};
