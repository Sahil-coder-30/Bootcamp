/**
 * flow.api.ts
 * Guided flow glue: resume extraction -> saved candidate profile (POST /api/flow/profile).
 * The other steps reuse the feature services of Roles 1, 2, 4 and 5.
 */

import { apiClient } from "@/services/apiClient";
import type { ResumeExtraction } from "@/features/resume/service/resume.api";

export interface FlowProfile {
  profile_id: string;
  created: boolean;
  warnings: string[];
  profile: {
    id: string;
    name: string;
    email: string;
    version: number;
    skills: { skill_name: string }[];
    skill_levels: Record<string, { level: number }>;
  };
}

export async function saveFlowProfileAPI(
  extraction: ResumeExtraction,
  meta?: {
    email?: string | undefined;
    userId?: string | undefined;
    profileId?: string | undefined;
  },
): Promise<FlowProfile> {
  const { data } = await apiClient.post<FlowProfile>("/flow/profile", {
    extraction,
    email: meta?.email,
    user_id: meta?.userId,
    profile_id: meta?.profileId,
  });
  return data;
}
