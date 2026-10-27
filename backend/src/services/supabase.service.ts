import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "../config/env.js";

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[backend] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set: serving bundled seed data only.",
  );
}

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(env.supabaseUrl!, env.supabaseKey!, { auth: { persistSession: false } })
  : null;
