import axios from "axios";

// Shared Axios instance for every feature service. All data comes from the backend
// service (../backend); the frontend never talks to Supabase directly.
// Dev: Vite proxies /api to the backend. Prod: set VITE_API_URL to the backend origin.
const API_URL = ((import.meta.env["VITE_API_URL"] as string | undefined) ?? "").replace(/\/$/, "");

export const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { "Content-Type": "application/json" },
});

/** Turns an Axios/network failure into a readable message for slices. */
export function toErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as { error?: string } | undefined;
    return body?.error ?? err.message ?? fallback;
  }
  return err instanceof Error ? err.message : fallback;
}
