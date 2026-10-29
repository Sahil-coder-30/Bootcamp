/**
 * jd.controller.ts
 * Express controllers for Role 1: documents upload and JD extraction.
 */

import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { documentKindSchema, extractJdSchema, UUID_RE } from "../lib/jd.schemas.js";
import { HttpError } from "../middlewares/errorHandler.js";
import * as jd from "../services/jd.service.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: jd.MAX_DOCUMENT_BYTES, files: 1 } });

/** multer for the single `file` field, with its errors mapped to clean HTTP statuses. */
export function documentUpload(req: Request, res: Response, next: NextFunction) {
  upload.single("file")(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      return next(new HttpError(err.code === "LIMIT_FILE_SIZE" ? 413 : 400, err.code === "LIMIT_FILE_SIZE" ? "File larger than 10 MB" : err.message));
    }
    next(err);
  });
}

function idParam(req: Request<{ id: string }>, what: string): string {
  if (!UUID_RE.test(req.params.id)) throw new HttpError(400, `${what} id must be a UUID`);
  return req.params.id;
}

/** POST /api/documents (multipart: file, kind=jd|resume) */
export async function uploadDocument(req: Request, res: Response) {
  const kind = documentKindSchema.safeParse(req.body?.kind || undefined);
  if (!kind.success) throw new HttpError(400, "kind must be jd or resume");
  const { status, body } = await jd.uploadDocument(req.file, kind.data);
  res.status(status).json(body);
}

/** GET /api/documents/:id */
export async function getDocument(req: Request<{ id: string }>, res: Response) {
  res.json(await jd.getDocument(idParam(req, "document")));
}

/** POST /api/jds/extract {document_id, company_id?, role?, force?} */
export async function extractJd(req: Request, res: Response) {
  const parsed = extractJdSchema.safeParse(req.body ?? {});
  if (!parsed.success) throw new HttpError(400, parsed.error.issues.map((i) => i.message).join(", "));
  res.json(await jd.extractJd(parsed.data));
}

/** GET /api/jds */
export async function listJds(_req: Request, res: Response) {
  res.json(await jd.listJds());
}

/** GET /api/jds/:id */
export async function getJd(req: Request<{ id: string }>, res: Response) {
  res.json(await jd.getJd(idParam(req, "JD")));
}
