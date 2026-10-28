import { apiClient } from "@/services/apiClient";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture: string | null;
  role: "student" | "admin";
  phone: string | null;
  college: string | null;
  branch: string | null;
  graduationYear: number | null;
  /** id of the user's resume in the resume service (null until they upload one). */
  resumeId: string | null;
  candidateProfileId: string | null;
}

export interface SessionResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUser;
}

export type ProfilePatch = Partial<
  Pick<AuthUser, "name" | "phone" | "college" | "branch" | "graduationYear" | "resumeId">
>;

export const getAuthConfigAPI = async (): Promise<{ googleClientId: string | null }> =>
  (await apiClient.get<{ googleClientId: string | null }>("/auth/config")).data;

export const googleLoginAPI = async (credential: string): Promise<SessionResponse> =>
  (await apiClient.post<SessionResponse>("/auth/google", { credential })).data;

export const getMeAPI = async (): Promise<AuthUser> =>
  (await apiClient.get<{ user: AuthUser }>("/auth/me")).data.user;

export const updateMeAPI = async (patch: ProfilePatch): Promise<AuthUser> =>
  (await apiClient.patch<{ user: AuthUser }>("/auth/me", patch)).data.user;

export const logoutAPI = async (refreshToken: string): Promise<void> => {
  await apiClient.post("/auth/logout", { refreshToken });
};
