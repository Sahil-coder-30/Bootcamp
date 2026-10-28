import type { Request, Response } from "express";
import {
  CHANGE_SOURCES,
  listQuerySchema,
  type CandidateProfileInput,
  type ChangeSource,
} from "../contract/profile.schema.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { parseOrThrow } from "../middlewares/validate.js";
import { getCalibration, isCode } from "../services/calibration.service.js";
import { profilesService, type StoredProfile } from "../services/profiles.service.js";

const etag = (version: number) => `"${version}"`;

/** `If-Match: "3"` (also accepts `W/"3"` and a bare 3). */
function parseIfMatch(header: string | undefined): number {
  if (!header) throw new HttpError(428, "If-Match header with the profile version is required");
  const m = /^(?:W\/)?"?(\d+)"?$/.exec(header.trim());
  if (!m) throw new HttpError(400, "If-Match must be the profile version, e.g. \"3\"");
  return Number(m[1]);
}

/** Which flow produced this save. Optional `X-Change-Source` header, default "form". */
function changeSource(req: Request): ChangeSource {
  const raw = req.header("x-change-source");
  if (!raw) return "form";
  if ((CHANGE_SOURCES as readonly string[]).includes(raw)) return raw as ChangeSource;
  throw new HttpError(400, `X-Change-Source must be one of: ${CHANGE_SOURCES.join(", ")}`);
}

const sendProfile = (res: Response, profile: StoredProfile, status = 200) =>
  res.status(status).set("ETag", etag(profile.version)).json(profile);

export async function listProfiles(req: Request, res: Response) {
  res.json(await profilesService.list(parseOrThrow(listQuerySchema, req.query)));
}

/** `If-None-Match` hit: `"3"`, `W/"3"`, a list of them, or `*`. */
const etagMatches = (header: string | undefined, version: number) =>
  (header ?? "")
    .split(",")
    .map((t) => t.trim().replace(/^W\//, ""))
    .some((t) => t === "*" || t === etag(version));

export async function getProfile(req: Request<{ id: string }>, res: Response) {
  const profile = await profilesService.get(req.params.id);
  if (etagMatches(req.header("if-none-match"), profile.version)) {
    res.status(304).set("ETag", etag(profile.version)).end();
    return;
  }
  sendProfile(res, profile);
}

export async function createProfile(req: Request, res: Response) {
  const profile = await profilesService.create(req.body as CandidateProfileInput, changeSource(req));
  res.set("Location", `/api/profiles/${profile.id}`);
  sendProfile(res, profile, 201);
}

export async function updateProfile(req: Request<{ id: string }>, res: Response) {
  const expected = parseIfMatch(req.header("if-match"));
  sendProfile(
    res,
    await profilesService.update(req.params.id, expected, req.body as CandidateProfileInput, changeSource(req)),
  );
}

export async function draftFromResume(req: Request, res: Response) {
  const body = req.body as { resume_extraction_id: string; profile_id?: string };
  res.json(await profilesService.draftFromResume(body.resume_extraction_id, body.profile_id));
}

export async function getProfileVersions(req: Request<{ id: string }>, res: Response) {
  res.json({ items: await profilesService.versions(req.params.id) });
}

export async function getProfileCvUrl(req: Request<{ id: string }>, res: Response) {
  res.json(await profilesService.cvUrl(req.params.id));
}

export async function deleteProfile(req: Request<{ id: string }>, res: Response) {
  await profilesService.remove(req.params.id);
  res.status(204).end();
}

export async function getCalibrationTopics(req: Request<{ code: string }>, res: Response) {
  const code = req.params.code.toUpperCase();
  if (!isCode(code)) throw new HttpError(400, "Unknown category code");
  const level = Number(req.query["level"] ?? 5);
  if (!Number.isInteger(level) || level < 1 || level > 10) {
    throw new HttpError(400, "level must be an integer from 1 to 10");
  }
  res.json(await getCalibration(code, level));
}
