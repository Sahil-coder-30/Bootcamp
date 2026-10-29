import axios from "axios";
import { clearSession, readSession, writeSession } from "@/lib/authStorage";

// Shared Axios instance for every feature service. All data comes from the backend
// service (../backend); the frontend never talks to Supabase directly.
// Dev: Vite proxies /api to the backend. Prod: set VITE_API_URL to the backend origin.
const API_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

let onSessionLost: () => void = () => {};
/** The store registers this so the UI drops the user when a refresh fails for good. */
export function setSessionLostHandler(fn: () => void): void {
  onSessionLost = fn;
}

apiClient.interceptors.request.use((config) => {
  const session = readSession();
  if (session && !config.headers.has("Authorization")) {
    config.headers.set("Authorization", `Bearer ${session.accessToken}`);
  }
  return config;
});

// One refresh at a time: parallel 401s all wait for the same rotation.
let refreshing: Promise<string> | null = null;

function refreshAccessToken(): Promise<string> {
  refreshing ??= (async () => {
    const session = readSession();
    if (!session) throw new Error("No session");
    try {
      // Bare axios: this call must not go through the interceptors below.
      const { data } = await axios.post<{ accessToken: string; refreshToken: string }>(
        `${API_URL}/api/auth/refresh`,
        { refreshToken: session.refreshToken },
      );
      writeSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      return data.accessToken;
    } catch (err) {
      clearSession();
      onSessionLost();
      throw err;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

apiClient.interceptors.response.use(undefined, async (error: unknown) => {
  if (!axios.isAxiosError(error) || error.response?.status !== 401 || !error.config) throw error;
  const url = error.config.url ?? "";
  const retried = (error.config as { _retried?: boolean })._retried;
  if (retried || url.startsWith("/auth/") || !readSession()) throw error;
  (error.config as { _retried?: boolean })._retried = true;
  try {
    const token = await refreshAccessToken();
    error.config.headers.set("Authorization", `Bearer ${token}`);
    return apiClient.request(error.config);
  } catch {
    throw error;
  }
});

/** Turns an Axios/network failure into a readable message for slices. */
export function toErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
