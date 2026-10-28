// Seeds the 4 sample candidates (fixed UUIDs) into Supabase `candidate_profiles`.
//
//   npm run seed:profiles                      insert the seeds that are missing
//   npm run seed:profiles -- --reset           delete the 4 seed rows (and their history), then insert
//   npm run seed:profiles -- --from-extractions  rebuild seeds from Role 2's stored resume extractions
//   npm run seed:profiles -- --export-golden   write copies to agent/tests/golden/profiles/ (no database)
//   npm run seed:profiles -- --dry-run         print what would happen, touch nothing
import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import type { CandidateProfile, ResumeExtraction } from "../src/contract/profile.schema.js";
import { SEED_PROFILES } from "../src/data/seedProfiles/index.js";
import { computeCompleteness } from "../src/lib/profileCompleteness.js";
import { mapExtractionToDraft } from "../src/lib/profileMapping.js";

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");

const here = dirname(fileURLToPath(import.meta.url));
const slug = (p: CandidateProfile) => p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

if (args.has("--export-golden")) {
  const dir = join(here, "../../agent/tests/golden/profiles");
  if (!dryRun) mkdirSync(dir, { recursive: true });
  for (const p of SEED_PROFILES) {
    const file = join(dir, `${slug(p)}.json`);
    console.log(`${dryRun ? "[dry-run] would write" : "wrote"} ${file}`);
    if (!dryRun) writeFileSync(file, JSON.stringify(p, null, 2) + "\n");
  }
  process.exit(0);
}

const url = process.env["SUPABASE_URL"];
const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
if (!url || !key) {
  console.error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (backend/.env).");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
console.log(`Target: ${new URL(url).host}${dryRun ? " (dry run)" : ""}`);

async function fromExtractions(seeds: CandidateProfile[]): Promise<CandidateProfile[]> {
  const { data, error } = await supabase
    .from("extractions")
    .select("id, document_id, result")
    .eq("source_type", "resume");
  if (error) throw error;
  const byEmail = new Map<string, { id: string; result: ResumeExtraction }>();
  for (const row of data ?? []) {
    const result = row.result as ResumeExtraction;
    const email = result.candidate?.email?.toLowerCase();
    if (email) byEmail.set(email, { id: String(row.id), result });
  }
  return seeds.map((seed) => {
    const hit = byEmail.get(seed.email);
    if (!hit) {
      console.log(`  ${seed.name}: no resume extraction found, keeping the hand-labelled seed`);
      return seed;
    }
    const { draft } = mapExtractionToDraft(hit.result, hit.id, seed.cv_file ?? null);
    console.log(`  ${seed.name}: rebuilt from extraction ${hit.id}`);
    return { ...draft, id: seed.id, version: 1, updated_at: seed.updated_at } as CandidateProfile;
  });
}

async function main() {
  const seeds = args.has("--from-extractions") ? await fromExtractions(SEED_PROFILES) : SEED_PROFILES;
  const ids = seeds.map((s) => s.id as string);

  if (args.has("--reset")) {
    console.log(`${dryRun ? "[dry-run] would delete" : "deleting"} ${ids.length} seed rows (history cascades)`);
    if (!dryRun) {
      const { error } = await supabase.from("candidate_profiles").delete().in("id", ids);
      if (error) throw error;
    }
  }

  const { data: existing, error: readError } = await supabase
    .from("candidate_profiles")
    .select("id")
    .in("id", ids);
  if (readError) throw readError;
  const present = new Set((existing ?? []).map((r) => String(r["id"])));

  for (const seed of seeds) {
    const id = seed.id as string;
    if (present.has(id) && !args.has("--reset")) {
      console.log(`  ${seed.name}: already there, skipped`);
      continue;
    }
    console.log(`  ${seed.name}: ${dryRun ? "[dry-run] would insert" : "inserting"} ${id}`);
    if (dryRun) continue;
    const { error } = await supabase.from("candidate_profiles").upsert(
      {
        id,
        email: seed.email,
        profile: seed,
        version: 1,
        resume_extraction_id: seed.resume_extraction_id ?? null,
        completeness: computeCompleteness(seed).score,
        change_source: "seed",
      },
      { onConflict: "id" },
    );
    if (error) throw error;
  }
  console.log("done");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
