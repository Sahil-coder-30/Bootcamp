import "dotenv/config";

export interface AuthConfig {
  port: number;
  corsOrigins: string[];
  databaseUrl?: string;
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  accessTtlSeconds: number;
  refreshTtlDays: number;
  googleClientId?: string;
  googleClientSecret?: string;
  /** Must match an "Authorized redirect URI" in the Google OAuth client. */
  googleCallbackUrl: string;
  /** Where the browser lands after Google sign-in (tokens are appended as a URL fragment). */
  frontendUrl: string;
  /** Optional comma-separated allow-list, e.g. "jssaten.ac.in". Empty means any Google account. */
  allowedEmailDomains: string[];
  adminEmails: string[];
  autoMigrate: boolean;
  production: boolean;
}

const DEV_SECRET = "dev-only-secret-change-me-dev-only-secret";

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AuthConfig {
  const read = (key: string): string | undefined => {
    const v = source[key]?.trim();
    return v ? v : undefined;
  };
  const list = (key: string, fallback = ""): string[] =>
    (read(key) ?? fallback)
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  const production = read("NODE_ENV") === "production";
  const jwtSecret = read("JWT_SECRET") ?? (production ? undefined : DEV_SECRET);
  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters long");
  }
  return {
    port: Number(read("PORT") ?? 4100),
    corsOrigins: (read("CORS_ORIGINS") ?? "http://localhost:5173").split(",").map((o) => o.trim()),
    databaseUrl: read("DATABASE_URL"),
    jwtSecret,
    jwtIssuer: read("JWT_ISSUER") ?? "placeintel-auth",
    jwtAudience: read("JWT_AUDIENCE") ?? "placeintel",
    accessTtlSeconds: Number(read("ACCESS_TOKEN_TTL_SECONDS") ?? 900),
    refreshTtlDays: Number(read("REFRESH_TOKEN_TTL_DAYS") ?? 30),
    googleClientId: read("GOOGLE_CLIENT_ID"),
    googleClientSecret: read("GOOGLE_CLIENT_SECRET"),
    googleCallbackUrl: read("GOOGLE_CALLBACK_URL") ?? "http://localhost:5173/api/auth/google/callback",
    frontendUrl: (read("FRONTEND_URL") ?? "http://localhost:5173").replace(/\/$/, ""),
    allowedEmailDomains: list("ALLOWED_EMAIL_DOMAINS"),
    adminEmails: list("ADMIN_EMAILS"),
    autoMigrate: read("AUTO_MIGRATE") === "true",
    production,
  };
}
