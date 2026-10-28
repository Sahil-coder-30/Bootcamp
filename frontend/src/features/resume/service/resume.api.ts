/**
 * resume.api.ts
 * Pure Axios API service for Role 2: Resume Parsing.
 */

import { apiClient } from "@/services/apiClient";

export interface ResumeContact {
  name: string;
  email?: string | null;
  phone?: string | null;
  links: string[];
}

export interface Skill {
  skill_name: string;
  category_code: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  canonical_id?: string | null;
  level_hint?: number | null;
  section?: string | null;
}

export interface EducationEntry {
  degree: string;
  institution: string;
  year?: string | null;
  score?: string | null;
}

export interface ExperienceEntry {
  title: string;
  org: string;
  kind: "internship" | "job" | "freelance" | "other";
  start?: string | null;
  end?: string | null;
  highlights: string[];
  skills: string[];
}

export interface ProjectEntry {
  name: string;
  description: string;
  skills: string[];
  link?: string | null;
}

export interface HackathonEntry {
  name: string;
  result?: string | null;
  year?: string | null;
}

export interface CertificationEntry {
  name: string;
  issuer?: string | null;
  year?: string | null;
}

export interface CategoryLevelDetail {
  level: number;
  bloom: string;
  confidence: "high" | "medium" | "low";
  points: number;
  basis: string;
  capped_by?: string | null;
  evidence_refs: string[];
}

export interface ResumeExtraction {
  source_type: "resume";
  source_file: string;
  company: null;
  role?: string | null;
  document_id?: string | null;
  extraction_id?: string | null;
  existing_profile_id?: string | null;
  candidate: ResumeContact;
  skills: Skill[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  projects: ProjectEntry[];
  hackathons: HackathonEntry[];
  certifications: CertificationEntry[];
  category_levels: Record<string, number>;
  category_level_details: Record<string, CategoryLevelDetail>;
  field_confidence: Record<string, "high" | "medium" | "low">;
  meta: {
    schema_version?: string;
    prompt_version?: string;
    levels_version?: string;
    doc_sha256?: string;
    latency_ms?: number;
    llm_calls?: number;
    cached?: boolean;
    pii_redacted?: boolean;
    grounding_rate?: number;
    layout?: string;
    sections_found?: string[];
    warnings?: string[];
  };
}

export interface InferLevelsResponse {
  category_levels: Record<string, number>;
  category_level_details: Record<string, CategoryLevelDetail>;
  latency_ms: number;
}

export const parseResumeAPI = async (payload: {
  content_b64?: string;
  file_name?: string;
  mime?: string;
  sample_key?: string;
}): Promise<ResumeExtraction> => {
  const response = await apiClient.post<ResumeExtraction>("/resumes/parse", payload);
  return response.data;
};

export const getSampleResumeAPI = async (candidateKey: string): Promise<ResumeExtraction> => {
  const response = await apiClient.get<ResumeExtraction>(
    `/resumes/sample/${encodeURIComponent(candidateKey)}`,
  );
  return response.data;
};

export const inferLevelsAPI = async (
  extraction: ResumeExtraction,
): Promise<InferLevelsResponse> => {
  const response = await apiClient.post<InferLevelsResponse>("/resumes/levels/infer", {
    extraction,
  });
  return response.data;
};
