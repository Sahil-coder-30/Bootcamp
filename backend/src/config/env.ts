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
  /** True only with the service-role key: RLS tables (documents, extractions, job_postings) need it. */
  supabaseServiceRole: Boolean(read("SUPABASE_SERVICE_ROLE_KEY")),
  /**
   * Where Role 1 keeps documents, JD extractions and job postings: "supabase" or "file"
   * (a local JSON store under JD_STORE_DIR). Default: supabase with the service-role key, else file.
   */
  jdStore: (read("JD_STORE") ?? (read("SUPABASE_SERVICE_ROLE_KEY") && read("SUPABASE_URL") ? "supabase" : "file")) as
    | "supabase"
    | "file",
  jdStoreDir: read("JD_STORE_DIR") ?? ".data/jd-store",
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
  /**
   * Telegram bot (runs inside this process). Without a token the bot is simply off.
   * Get one from @BotFather; keep it only in .env.
   */
  telegramBotToken: read("TELEGRAM_BOT_TOKEN"),
  /** "off" disables the bot even when a token is set (e.g. a second backend instance). */
  telegramBot: read("TELEGRAM_BOT") ?? "on",
  /** Set to a public HTTPS base URL (e.g. your ngrok URL) to use a webhook; empty = long polling. */
  telegramWebhookUrl: read("TELEGRAM_WEBHOOK_URL")?.replace(/\/$/, ""),
  /** Sent back by Telegram in X-Telegram-Bot-Api-Secret-Token so only Telegram can call the webhook. */
  telegramWebhookSecret: read("TELEGRAM_WEBHOOK_SECRET"),
  /** Optional: the bot's @username (without @), used for the deep link when the bot is not running here. */
  telegramBotUsername: read("TELEGRAM_BOT_USERNAME")?.replace(/^@/, ""),
  /** "memory" keeps chat links in memory (lost on restart); default is Supabase when it is configured. */
  telegramStore: read("TELEGRAM_STORE"),
  /** "memory" forces the in-memory profile store even when Supabase is configured (tests, offline demo). */
  profilesStore: read("PROFILES_STORE"),
  /** "fixtures" reads Role 2 extractions from src/data/extractionFixtures instead of Supabase. */
  extractionsSource: read("EXTRACTIONS_SOURCE"),
};
