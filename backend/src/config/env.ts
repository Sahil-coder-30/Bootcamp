import "dotenv/config";

const read = (key: string): string | undefined => {
  const v = process.env[key]?.trim();
  return v ? v : undefined;
};

export const env = {
  port: Number(read("PORT") ?? 4000),
  /** Comma-separated list of allowed browser origins. */
  corsOrigins: (read("CORS_ORIGINS") ?? "http://localhost:5173").split(",").map((o) => o.trim()),
  supabaseUrl: read("SUPABASE_URL"),
  /** Server-side key. Prefer the service-role key; the anon key also works for read-only tables. */
  supabaseKey: read("SUPABASE_SERVICE_ROLE_KEY") ?? read("SUPABASE_ANON_KEY"),
  /** Base URL of the FastAPI agent service (../agent). */
  agentUrl: (read("AGENT_URL") ?? "http://localhost:8000").replace(/\/$/, ""),
};
