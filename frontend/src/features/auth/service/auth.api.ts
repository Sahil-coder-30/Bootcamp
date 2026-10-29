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

export type ProfilePatch = Partial<
  Pick<
    AuthUser,
    "name" | "phone" | "college" | "branch" | "graduationYear" | "resumeId" | "candidateProfileId"
  >
>;

/** Where the browser goes to start Google sign-in (full-page redirect, handled by the auth service). */
export const googleLoginUrl = (redirect: string): string => {
  const base = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(/\/$/, "");
  return `${base}/api/auth/google?redirect=${encodeURIComponent(redirect)}`;
};

export const getMeAPI = async (): Promise<AuthUser> =>
  (await apiClient.get<{ user: AuthUser }>("/auth/me")).data.user;

export const updateMeAPI = async (patch: ProfilePatch): Promise<AuthUser> =>
  (await apiClient.patch<{ user: AuthUser }>("/auth/me", patch)).data.user;

export const logoutAPI = async (refreshToken: string): Promise<void> => {
  await apiClient.post("/auth/logout", { refreshToken });
};
