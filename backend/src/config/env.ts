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
  /**
   * HS256 secret shared with the auth service (../auth). Without it, bearer tokens are not
   * verified and no request is authenticated.
   */
  jwtSecret: read("JWT_SECRET"),
  jwtIssuer: read("JWT_ISSUER") ?? "placeintel-auth",
  jwtAudience: read("JWT_AUDIENCE") ?? "placeintel",
  /** true = protected routes (talent-check) answer 401 without a valid token. Off by default so the demo stays open. */
  authRequired: read("AUTH_REQUIRED") === "true",
  agentUrl: (read("AGENT_URL") ?? "http://localhost:8000").replace(/\/$/, ""),
  /** Base URL of the resume parsing service (../resume). */
  resumeUrl: (read("RESUME_URL") ?? "http://localhost:8100").replace(/\/$/, ""),
  /** Optional shared secret, sent as X-Resume-Key when the resume service has RESUME_API_KEY set. */
  resumeApiKey: read("RESUME_API_KEY"),
};
