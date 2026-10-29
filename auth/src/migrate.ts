import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Applies every migrations/*.sql in order. All statements are idempotent (if not exists). */
export async function runMigrations(databaseUrl: string): Promise<string[]> {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: 1,
    ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
  });
  const applied: string[] = [];
  try {
    for (const file of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      await pool.query(readFileSync(join(dir, file), "utf8"));
      applied.push(file);
    }
  } finally {
    await pool.end();
  }
  return applied;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const { loadConfig } = await import("./config/env.js");
  const url = loadConfig().databaseUrl;
  if (!url) throw new Error("DATABASE_URL is required to migrate");
  console.log("applied:", await runMigrations(url));
}
