// The 4 contract-valid sample candidates (fixed UUIDs, plan 6.4). Served by the in-memory
// repository when Supabase is unset, and upserted into Supabase by `npm run seed:profiles`.
import type { CandidateProfile } from "../../contract/profile.schema.js";
import ananya from "./ananya-rao.json" with { type: "json" };
import karthik from "./karthik-subramaniam.json" with { type: "json" };
import priya from "./priya-menon.json" with { type: "json" };
import rohan from "./rohan-verma.json" with { type: "json" };

export const SEED_PROFILES = [ananya, karthik, priya, rohan] as unknown as CandidateProfile[];

export const SEED_PROFILE_IDS = {
  "ananya-rao": "3a000000-0000-4000-8000-000000000001",
  "karthik-subramaniam": "3a000000-0000-4000-8000-000000000002",
  "priya-menon": "3a000000-0000-4000-8000-000000000003",
  "rohan-verma": "3a000000-0000-4000-8000-000000000004",
} as const;
