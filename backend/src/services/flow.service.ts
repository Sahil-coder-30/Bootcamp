// Guided flow glue: turns a parsed resume (Role 2) into a saved candidate profile (Role 3) in one call,
// so the Skill Match and Talent Check steps can use a real profile id instead of the golden samples.
import { candidateProfileInputSchema, type ResumeExtraction } from "../contract/profile.schema.js";
import { mapExtractionToDraft } from "../lib/profileMapping.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { parseOrThrow } from "../middlewares/validate.js";
import { profilesService, type StoredProfile } from "./profiles.service.js";

export interface FlowProfileResult {
  profile_id: string;
  profile: StoredProfile;
  created: boolean;
  warnings: string[];
}

/** Save (or refresh, matched by email) the profile for a resume extraction. */
export async function saveProfileFromExtraction(extraction: ResumeExtraction): Promise<FlowProfileResult> {
  if (!extraction || extraction.source_type !== "resume") {
    throw new HttpError(422, "A resume extraction is required");
  }
  const { draft, warnings } = mapExtractionToDraft(extraction, "", null);
  // The extraction is not stored under a uuid here, so drop the back-reference.
  const input = parseOrThrow(candidateProfileInputSchema, { ...draft, resume_extraction_id: null });

  const { items } = await profilesService.list({ limit: 1, email: input.email });
  const existing = items[0];
  if (existing) {
    const profile = await profilesService.update(existing.id, existing.version, input, "resume_import");
    return { profile_id: profile.id, profile, created: false, warnings };
  }
  const profile = await profilesService.create(input, "resume_import");
  return { profile_id: profile.id, profile, created: true, warnings };
}
