// Profile endpoints. Pure Axios: returns `data`, never touches Redux.
import { apiClient } from "@/services/apiClient";
import type { Code } from "@/lib/categories";
import type {
  ChangeSource,
  CompanyBarRow,
  ProfileDraft,
  ProfileList,
  ProfileValues,
  ProfileVersion,
  StoredProfile,
} from "../lib/types";

export interface ListParams {
  q?: string;
  limit?: number;
  cursor?: string | null;
  email?: string;
}

export const listProfilesAPI = async (params: ListParams = {}): Promise<ProfileList> => {
  const query = Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ""),
  );
  const res = await apiClient.get<ProfileList>("/profiles", { params: query });
  return res.data;
};

/** The version comes from the body (always present); the ETag header is only a fallback. */
export const getProfileAPI = async (
  id: string,
): Promise<{ profile: StoredProfile; version: number }> => {
  const res = await apiClient.get<StoredProfile>(`/profiles/${id}`);
  const header = /(\d+)/.exec(String(res.headers["etag"] ?? ""))?.[1];
  return { profile: res.data, version: res.data.version ?? Number(header ?? 1) };
};

const sourceHeader = (source?: ChangeSource) => (source ? { "X-Change-Source": source } : {});

export const createProfileAPI = async (
  p: ProfileValues,
  source?: ChangeSource,
): Promise<StoredProfile> => {
  const res = await apiClient.post<StoredProfile>("/profiles", p, {
    headers: { ...sourceHeader(source) },
  });
  return res.data;
};

export const updateProfileAPI = async (
  id: string,
  version: number,
  p: ProfileValues,
  source?: ChangeSource,
): Promise<StoredProfile> => {
  const res = await apiClient.put<StoredProfile>(`/profiles/${id}`, p, {
    headers: { "If-Match": `"${version}"`, ...sourceHeader(source) },
  });
  return res.data;
};

export const deleteProfileAPI = async (id: string): Promise<void> => {
  await apiClient.delete(`/profiles/${id}`);
};

export const draftFromResumeAPI = async (body: {
  resume_extraction_id: string;
  profile_id?: string;
}): Promise<ProfileDraft> => {
  const res = await apiClient.post<ProfileDraft>("/profiles/from-resume", body);
  return res.data;
};

export const getProfileVersionsAPI = async (id: string): Promise<ProfileVersion[]> => {
  const res = await apiClient.get<{ items: ProfileVersion[] }>(`/profiles/${id}/versions`);
  return res.data.items;
};

export const getCvUrlAPI = async (id: string): Promise<{ url: string; expires_in: number }> => {
  const res = await apiClient.get<{ url: string; expires_in: number }>(`/profiles/${id}/cv-url`);
  return res.data;
};

// ---- Role 1 / Role 2 routes used by the Start step -------------------------------------------

export interface UploadedDocument {
  document_id: string;
  sha256: string;
  cached?: boolean;
  storage_path?: string;
}

export const uploadCvAPI = async (
  file: File,
  onProgress?: (percent: number) => void,
): Promise<UploadedDocument> => {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", "resume");
  const res = await apiClient.post<UploadedDocument>("/documents", form, {
    // Let the browser set the multipart boundary.
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100));
    },
  });
  return res.data;
};

/** Role 2: parse a stored resume. The result carries `extraction_id` (contract v1.1). */
export const parseResumeAPI = async (documentId: string): Promise<{ extraction_id: string }> => {
  const res = await apiClient.post<{ extraction_id: string }>("/resumes/parse", {
    document_id: documentId,
  });
  return res.data;
};

// ---- Read-only inputs from other roles -------------------------------------------------------

/** Role 4: a company's bar, used only to draw the faint markers on the sliders. */
export const getCompanySkillBarAPI = async (companyId: number): Promise<CompanyBarRow[]> => {
  const res = await apiClient.get<CompanyBarRow[]>(`/companies/${companyId}/skill-bar`);
  return res.data;
};

/** Role 1's saved JD list, only to suggest target roles. Tolerates `[...]` or `{ items: [...] }`. */
export const listJdRolesAPI = async (): Promise<string[]> => {
  const res = await apiClient.get<unknown>("/jds");
  const data = res.data as { items?: unknown } | unknown[];
  const rows = Array.isArray(data) ? data : Array.isArray(data.items) ? data.items : [];
  const roles = rows
    .map((r) => (r as { role?: unknown } | null)?.role)
    .filter((r): r is string => typeof r === "string" && r.trim().length > 0);
  return [...new Set(roles.map((r) => r.trim()))];
};

export interface Calibration {
  code: Code;
  level: number;
  /** Topics for levels L-1..L+1 (clamped to 1-10), each a checklist item. */
  levels: { level: number; topics: string[] }[];
  source: "database" | "seed" | "none";
}

export const getCalibrationAPI = async (code: Code, level: number): Promise<Calibration> => {
  const res = await apiClient.get<Calibration>(`/profiles/calibration/${code}`, {
    params: { level },
  });
  return res.data;
};

export type { Code };
