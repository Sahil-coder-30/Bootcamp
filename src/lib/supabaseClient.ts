import { createClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith("postgresql://") || trimmed.startsWith("postgres://")) {
    const match =
      trimmed.match(/@(?:db\.)?([a-z0-9_-]+)\.supabase\.co/i) ||
      trimmed.match(/postgres\.([a-z0-9_-]+):/i);
    if (match?.[1]) {
      return `https://${match[1]}.supabase.co`;
    }
  }
  return trimmed;
}

const rawUrl =
  (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ||
  (import.meta.env["SUPABASE_URL"] as string | undefined);

const supabaseUrl = normalizeSupabaseUrl(rawUrl);

const supabaseAnonKey =
  (import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined) ||
  (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ||
  (import.meta.env["SUPABASE_PUBLISHABLE_KEY"] as string | undefined);

export const isSupabaseConfigured = Boolean(
  typeof supabaseUrl === "string" &&
    supabaseUrl.trim().length > 0 &&
    typeof supabaseAnonKey === "string" &&
    supabaseAnonKey.trim().length > 0,
);

if (!isSupabaseConfigured) {
  console.error(
    "Missing Supabase configuration: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your .env file.",
  );
}

// Using fallback URL/key prevents createClient from throwing at module load time when env vars are missing
export const supabase = createClient(
  supabaseUrl && supabaseUrl.trim().length > 0
    ? supabaseUrl
    : "https://placeholder.supabase.co",
  supabaseAnonKey && supabaseAnonKey.trim().length > 0
    ? supabaseAnonKey
    : "placeholder",
);
