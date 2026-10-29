// Guided flow glue: turns a parsed resume (Role 2) into a saved candidate profile (Role 3) in one call,
// so the Skill Match and Talent Check steps can use a real profile id instead of the golden samples.
import { candidateProfileInputSchema, type ResumeExtraction } from "../contract/profile.schema.js";
import { mapExtractionToDraft } from "../lib/profileMapping.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { parseOrThrow } from "../middlewares/validate.js";
import { profilesService, type StoredProfile } from "./profiles.service.js";
import { supabase } from "./supabase.service.js";

export interface FlowProfileResult {
  profile_id: string;
  profile: StoredProfile;
  created: boolean;
  warnings: string[];
}

/** The resume service sends `null` for absent optionals; the profile schema wants them omitted. */
function dropNulls<T>(value: T): T {
  if (Array.isArray(value)) return value.map(dropNulls) as T;
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, v]) => v !== null).map(([k, v]) => [k, dropNulls(v)]),
    ) as T;
  }
  return value;
}

/** Save (or refresh, matched by email or profileId) the profile for a resume extraction. */
export async function saveProfileFromExtraction(
  extraction: ResumeExtraction,
  userOverride?: { email?: string; userId?: string; profileId?: string },
): Promise<FlowProfileResult> {
  if (!extraction || extraction.source_type !== "resume") {
    throw new HttpError(422, "A resume extraction is required");
  }
  const { draft, warnings } = mapExtractionToDraft(dropNulls(extraction), "", null);

  if (userOverride?.email && userOverride.email.includes("@")) {
    draft.email = userOverride.email.toLowerCase().trim();
  }

  // The extraction is not stored under a uuid here, so drop the back-reference.
  const input = parseOrThrow(candidateProfileInputSchema, { ...draft, resume_extraction_id: null });

  let existing: StoredProfile | null = null;
  if (userOverride?.profileId) {
    try {
      existing = await profilesService.get(userOverride.profileId);
    } catch {
      // not found by id
    }
  }

  if (!existing && input.email) {
    const { items } = await profilesService.list({ limit: 1, email: input.email });
    if (items[0]) {
      try {
        existing = await profilesService.get(items[0].id);
      } catch {
        // ignore
      }
    }
  }

  let profile: StoredProfile;
  let created = false;

  if (existing) {
    profile = await profilesService.update(existing.id, existing.version, input, "resume_import");
  } else {
    profile = await profilesService.create(input, "resume_import");
    created = true;
  }

  if (userOverride?.userId && supabase) {
    try {
      await supabase
        .from("auth_users")
        .update({ candidate_profile_id: profile.id, updated_at: new Date().toISOString() })
        .eq("id", userOverride.userId);
    } catch (e) {
      console.warn("[flow.service] Could not link candidate_profile_id in auth_users:", e);
    }
    try {
      await supabase
        .from("candidate_profiles")
        .update({ user_id: userOverride.userId, updated_at: new Date().toISOString() })
        .eq("id", profile.id);
    } catch (e) {
      console.warn("[flow.service] Could not link user_id in candidate_profiles:", e);
    }
  }

  return { profile_id: profile.id, profile, created, warnings };
}
