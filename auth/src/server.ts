import { loadConfig } from "./config/env.js";
import { createApp } from "./app.js";
import { runMigrations } from "./migrate.js";
import { MemoryStore } from "./services/memoryStore.js";
import { PgStore } from "./services/pgStore.js";

const config = loadConfig();

if (config.databaseUrl && config.autoMigrate) {
  console.log("[auth] migrations applied:", await runMigrations(config.databaseUrl));
}
if (!config.databaseUrl) {
  if (config.production) throw new Error("DATABASE_URL is required in production");
  console.warn("[auth] DATABASE_URL not set: using in-memory store, users vanish on restart");
}
if (!config.googleClientId) console.warn("[auth] GOOGLE_CLIENT_ID not set: Google sign-in will answer 503");

const store = config.databaseUrl ? new PgStore(config.databaseUrl) : new MemoryStore();
const app = createApp({ config, store });

app.listen(config.port, () => console.log(`[auth] listening on :${config.port}`));
