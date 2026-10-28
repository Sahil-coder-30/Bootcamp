// Profile business rules: email normalisation, completeness, optimistic concurrency
// (409 duplicate email, 412 stale version, 428 missing If-Match) and the resume pre-fill.
import type {
  CandidateProfile,
  CandidateProfileInput,
  ChangeSource,
  Code,
  ListQuery,
  ProfileDraft,
  ProfileSummary,
} from "../contract/profile.schema.js";
import { CODES } from "../contract/profile.schema.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { computeCompleteness } from "../lib/profileCompleteness.js";
import { mapExtractionToDraft } from "../lib/profileMapping.js";
import { mergeProfiles } from "../lib/profileMerge.js";
import { getDocumentStoragePath, getResumeExtraction, type StoredExtraction } from "./extractions.read.js";
import {
  DuplicateEmailError,
  getProfilesRepo,
  type ProfileRow,
  type ProfileVersionRow,
  type ProfilesRepo,
} from "./profiles.repository.js";
import { supabase } from "./supabase.service.js";

export interface ExtractionsReader {
  getResumeExtraction(id: string): Promise<StoredExtraction | null>;
  getDocumentStoragePath(documentId: string | null): Promise<string | null>;
}

/** Private CV bucket access; null when file storage is not configured. */
export interface CvStorage {
  signedUrl(path: string, ttlSeconds: number): Promise<string | null>;
  remove(path: string): Promise<void>;
}

const supabaseCvStorage = (): CvStorage | null =>
  supabase
    ? {
        async signedUrl(path, ttlSeconds) {
          const { data, error } = await supabase!.storage.from(CV_BUCKET).createSignedUrl(path, ttlSeconds);
          return error || !data ? null : data.signedUrl;
        },
        async remove(path) {
          await supabase!.storage.from(CV_BUCKET).remove([path]);
        },
      }
    : null;

export interface StoredProfile extends CandidateProfile {
  id: string;
  version: number;
  updated_at: string;
}

const CV_BUCKET = "talent-docs";
const CV_URL_TTL_SECONDS = 600;

/** The row's columns are authoritative for the server-owned fields. */
export const toStored = (row: ProfileRow): StoredProfile => ({
  ...row.profile,
  id: row.id,
  version: row.version,
  updated_at: row.updated_at,
  email: row.email,
});

const toSummary = (row: ProfileRow): ProfileSummary => ({
  id: row.id,
  name: row.profile.name,
  email: row.email,
  preferred_roles: row.profile.preferred_roles,
  levels: Object.fromEntries(CODES.map((c) => [c, row.profile.skill_levels[c].level])) as Record<Code, number>,
  completeness: row.completeness,
  version: row.version,
  updated_at: row.updated_at,
});

const stale = (expected: number, current: ProfileRow) =>
  new HttpError(412, `Profile changed since version ${expected}`, {
    current: toStored(current),
    current_version: current.version,
  });

const duplicate = (e: DuplicateEmailError) =>
  new HttpError(409, e.message, { existing_profile_id: e.existingId });

export function createProfilesService(
  repo: ProfilesRepo,
  extractions: ExtractionsReader = { getResumeExtraction, getDocumentStoragePath },
  storage: CvStorage | null = supabaseCvStorage(),
) {
  async function mustFind(id: string): Promise<ProfileRow> {
    const row = await repo.findById(id);
    if (!row) throw new HttpError(404, "Profile not found");
    return row;
  }

  return {
    async list(q: ListQuery): Promise<{ items: ProfileSummary[]; next_cursor: string | null }> {
      const { rows, nextCursor } = await repo.list(q);
      return { items: rows.map(toSummary), next_cursor: nextCursor };
    },

    async get(id: string): Promise<StoredProfile> {
      return toStored(await mustFind(id));
    },

    async create(p: CandidateProfileInput, src: ChangeSource = "form"): Promise<StoredProfile> {
      const existing = await repo.findByEmail(p.email);
      if (existing) throw duplicate(new DuplicateEmailError(existing.id));
      try {
        const row = await repo.insert({
          email: p.email,
          profile: p,
          resume_extraction_id: p.resume_extraction_id ?? null,
          completeness: computeCompleteness(p).score,
          change_source: src,
        });
        return toStored(row);
      } catch (e) {
        if (e instanceof DuplicateEmailError) throw duplicate(e);
        throw e;
      }
    },

    async update(
      id: string,
      expectedVersion: number,
      p: CandidateProfileInput,
      src: ChangeSource = "form",
    ): Promise<StoredProfile> {
      const cur = await mustFind(id);
      if (cur.version !== expectedVersion) throw stale(expectedVersion, cur);
      try {
        const row = await repo.updateIfVersion(id, expectedVersion, {
          email: p.email,
          profile: p,
          resume_extraction_id: p.resume_extraction_id ?? null,
          completeness: computeCompleteness(p).score,
          change_source: src,
        });
        if (!row) {
          // Lost a race between the read above and the write.
          const latest = await repo.findById(id);
          throw latest ? stale(expectedVersion, latest) : new HttpError(404, "Profile not found");
        }
        return toStored(row);
      } catch (e) {
        if (e instanceof DuplicateEmailError) throw duplicate(e);
        throw e;
      }
    },

    /** Pre-fill from a Role 2 extraction. Nothing is saved. */
    async draftFromResume(extractionId: string, profileId?: string): Promise<ProfileDraft> {
      const extraction = await extractions.getResumeExtraction(extractionId);
      if (!extraction) throw new HttpError(404, "Resume extraction not found");
      if (extraction.result.source_type !== "resume") {
        throw new HttpError(422, "That extraction is not a resume");
      }
      const cvPath = await extractions.getDocumentStoragePath(extraction.document_id);
      const mapped = mapExtractionToDraft(extraction.result, extraction.id, cvPath);

      const target = profileId ? await mustFind(profileId) : null;
      const match = target ?? (mapped.draft.email ? await repo.findByEmail(mapped.draft.email) : null);

      if (!target) {
        return {
          draft: mapped.draft,
          provenance: mapped.provenance,
          diff: null,
          existing_profile_id: match?.id ?? null,
          warnings: mapped.warnings,
        };
      }
      const { merged, diff } = mergeProfiles(toStored(target), mapped.draft);
      // Only `id` is added to the draft; version and updated_at stay server-owned.
      const { version: _version, updated_at: _updatedAt, ...rest } = merged;
      return {
        draft: { ...rest, id: target.id },
        provenance: mapped.provenance,
        diff,
        existing_profile_id: target.id,
        warnings: mapped.warnings,
      };
    },

    async versions(id: string): Promise<ProfileVersionRow[]> {
      await mustFind(id);
      return repo.versions(id);
    },

    /** Short-lived signed URL for the stored CV; the bucket itself stays private. */
    async cvUrl(id: string): Promise<{ url: string; expires_in: number }> {
      const row = await mustFind(id);
      const path = row.profile.cv_file;
      if (!path) throw new HttpError(404, "This profile has no CV on file");
      if (!storage) throw new HttpError(503, "File storage is not configured");
      const url = await storage.signedUrl(path, CV_URL_TTL_SECONDS);
      if (!url) throw new HttpError(404, "CV file not found in storage");
      return { url, expires_in: CV_URL_TTL_SECONDS };
    },

    /** Right to erasure: the row, its versions (cascade) and the CV object. */
    async remove(id: string): Promise<void> {
      const row = await mustFind(id);
      const path = row.profile.cv_file;
      if (path && storage) {
        // Best effort: a missing object must not block deleting the personal data.
        await storage.remove(path).catch(() => undefined);
      }
      await repo.remove(id);
    },
  };
}

export type ProfilesService = ReturnType<typeof createProfilesService>;

export const profilesService: ProfilesService = createProfilesService(getProfilesRepo());
