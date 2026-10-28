/**
 * jd.api.ts
 * Pure Axios API service for Role 1: JD Analytics.
 */

import { apiClient } from "@/services/apiClient";

export interface JdSkill {
  skill_name: string;
  category_code: string;
  evidence: string;
  confidence: "high" | "medium" | "low";
  canonical_id?: string | null;
  level_hint?: number | null;
  requirement?: "must" | "nice" | null;
  section?: string | null;
  evidence_span?: { start: number; end: number; page?: number } | null;
}

export interface ExtractedSkillList {
  source_type: "jd";
  source_file: string;
  company: string | null;
  role: string | null;
  skills: JdSkill[];
  document_id: string | null;
  company_id: number | null;
  category_levels: Record<string, number>;
  jd_id?: string | null;
  extraction_id?: string | null;
  meta: {
    prompt_version: string;
    model: string;
    cached?: boolean;
    degraded?: boolean;
    latency_ms?: number;
    warnings?: string[];
    seniority?: string;
    location?: string | null;
    level_basis?: Record<string, string>;
    dropped?: { skill_name: string; reason: string }[];
    baseline_ids?: string[];
    baseline_missed?: string[];
    [key: string]: unknown;
  };
}

export interface DocumentSection {
  kind: string;
  label: string;
  requirement_hint: "must" | "nice" | null;
  start?: number;
  end?: number;
}

export interface UploadedDocument {
  document_id: string;
  sha256: string;
  cached: boolean;
  kind: "jd" | "resume";
  file_name: string;
  page_count: number;
  char_count: number;
  sections: DocumentSection[];
  warnings: string[];
}

export interface JdSummary {
  jd_id: string;
  document_id: string;
  file_name: string | null;
  company_id: number | null;
  company_name: string | null;
  role: string | null;
  location: string | null;
  skill_count: number;
  must_count: number;
  top_categories: string[];
  prompt_version: string | null;
  is_sample: boolean;
  created_at: string;
  updated_at: string;
}

export interface JdDetail {
  jd_id: string;
  extraction: ExtractedSkillList;
  document: {
    document_id: string;
    file_name: string;
    text: string;
    sections: DocumentSection[];
    page_count: number;
  };
}

export async function uploadDocumentAPI(
  file: File,
  kind: "jd" | "resume" = "jd",
): Promise<UploadedDocument> {
  const form = new FormData();
  form.append("kind", kind);
  form.append("file", file);
  const { data } = await apiClient.post<UploadedDocument>("/documents", form, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export async function extractJdAPI(body: {
  document_id: string;
  company_id?: number;
  role?: string;
  force?: boolean;
}): Promise<ExtractedSkillList> {
  // LLM extraction takes 5-60 s on a cache miss.
  const { data } = await apiClient.post<ExtractedSkillList>("/jds/extract", body, {
    timeout: 300_000,
  });
  return data;
}

export async function listJdsAPI(): Promise<JdSummary[]> {
  const { data } = await apiClient.get<JdSummary[]>("/jds");
  return data;
}

export async function getJdAPI(jdId: string): Promise<JdDetail> {
  const { data } = await apiClient.get<JdDetail>(`/jds/${jdId}`);
  return data;
}
