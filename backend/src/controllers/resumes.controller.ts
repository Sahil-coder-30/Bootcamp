import type { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler.js";
import { callResume, resumeJson } from "../services/resume.service.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Slightly above the resume service's own 5 MB limit (multipart adds a few hundred bytes).
const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;

function resumeId(req: Request<{ id: string }>): string {
  if (!UUID.test(req.params.id)) throw new HttpError(400, "resume id must be a UUID");
  return req.params.id;
}

function stringQuery(req: Request, keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const k of keys) {
    const v = req.query[k];
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

function requireMultipart(req: Request) {
  if (!req.is("multipart/form-data")) throw new HttpError(415, "send the resume as multipart/form-data field `file`");
  if (Number(req.header("content-length") ?? 0) > MAX_UPLOAD_BYTES) throw new HttpError(413, "resume file is too large");
}

/** POST /api/resumes: upload + store (S3) + parse. Signed-in users own the row (X-User-Id). */
export async function uploadResume(req: Request, res: Response) {
  requireMultipart(req);
  const upstream = await callResume(req, "resumes", { stream: req, query: stringQuery(req, ["force"]) });
  res.status(upstream.status).json(await resumeJson(upstream));
}

/** POST /api/resumes/parse: parse only, nothing stored (try-it-out on the landing page). */
export async function parseResume(req: Request, res: Response) {
  requireMultipart(req);
  res.json(await resumeJson(await callResume(req, "parse", { stream: req })));
}

/** POST /api/resumes/parse-text {text, source_file?} */
export async function parseResumeText(req: Request, res: Response) {
  res.json(await resumeJson(await callResume(req, "parse/text", { json: req.body ?? {} })));
}

/** POST /api/resumes/levels: re-score an edited extraction (deterministic, no document). */
export async function inferLevels(req: Request, res: Response) {
  res.json(await resumeJson(await callResume(req, "levels/infer", { json: req.body ?? {} })));
}

/** GET /api/resumes: the signed-in user's resumes (admins may filter by email or see all). */
export async function listResumes(req: Request, res: Response) {
  const query = stringQuery(req, ["limit", "offset", "include_extraction"]);
  if (req.user?.role === "admin") Object.assign(query, stringQuery(req, ["email", "user_id"]));
  res.json(await resumeJson(await callResume(req, "resumes", { query })));
}

export async function getResume(req: Request<{ id: string }>, res: Response) {
  res.json(await resumeJson(await callResume(req, `resumes/${resumeId(req)}`)));
}

export async function getProfileDraft(req: Request<{ id: string }>, res: Response) {
  res.json(await resumeJson(await callResume(req, `resumes/${resumeId(req)}/profile-draft`)));
}

export async function reparseResume(req: Request<{ id: string }>, res: Response) {
  res.json(await resumeJson(await callResume(req, `resumes/${resumeId(req)}/reparse`, { method: "POST" })));
}

/** PATCH /api/resumes/:id/claim: attach an anonymous upload to the signed-in user. */
export async function claimResume(req: Request<{ id: string }>, res: Response) {
  const json = { user_id: req.user!.id };
  res.json(await resumeJson(await callResume(req, `resumes/${resumeId(req)}`, { method: "PATCH", json })));
}

export async function deleteResume(req: Request<{ id: string }>, res: Response) {
  const upstream = await callResume(req, `resumes/${resumeId(req)}`, { method: "DELETE" });
  if (upstream.status !== 204) await resumeJson(upstream);
  res.status(204).end();
}

/** GET /api/resumes/:id/file: S3 files redirect to a short-lived presigned URL, local files stream. */
export async function downloadResume(req: Request<{ id: string }>, res: Response) {
  const upstream = await callResume(req, `resumes/${resumeId(req)}/file`, {
    query: { redirect: "true" },
    manualRedirect: true,
  });
  const location = upstream.headers.get("location");
  if (upstream.status >= 300 && upstream.status < 400 && location) {
    res.redirect(307, location);
    return;
  }
  if (!upstream.ok) await resumeJson(upstream);
  for (const h of ["content-type", "content-disposition", "content-length"]) {
    const v = upstream.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  res.status(200).send(Buffer.from(await upstream.arrayBuffer()));
}

export async function resumeHealth(req: Request, res: Response) {
  res.json(await resumeJson(await callResume(req, "health")));
}
