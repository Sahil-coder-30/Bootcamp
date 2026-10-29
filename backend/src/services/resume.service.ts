// Client for the resume parsing service (../resume, FastAPI on :8100). The backend is the
// only caller; the frontend reaches it through /api/resumes/*. Uploads are streamed through
// untouched (multipart), so the backend never buffers resume files in memory.
import type { Request } from "express";
import { Readable } from "node:stream";
import { env } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { userHeaders } from "../middlewares/auth.js";

export interface ResumeCall {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  /** JSON body (already parsed by express.json). */
  json?: unknown;
  /** Stream the raw incoming request body (multipart uploads). */
  stream?: Request;
  query?: Record<string, string>;
  /** Do not follow redirects (S3 presigned download links). */
  manualRedirect?: boolean;
}

/** Calls the resume service as the signed-in user (X-User-Id etc. when there is one). */
export async function callResume(req: Request, path: string, opts: ResumeCall = {}): Promise<Response> {
  const qs = opts.query && Object.keys(opts.query).length ? `?${new URLSearchParams(opts.query)}` : "";
  const url = `${env.resumeUrl}/${path.replace(/^\//, "")}${qs}`;
  const headers: Record<string, string> = { ...userHeaders(req) };
  if (env.resumeApiKey) headers["X-Resume-Key"] = env.resumeApiKey;

  let body: BodyInit | undefined;
  if (opts.stream) {
    const type = opts.stream.header("content-type");
    if (type) headers["Content-Type"] = type;
    const length = opts.stream.header("content-length");
    if (length) headers["Content-Length"] = length;
    body = Readable.toWeb(opts.stream) as unknown as BodyInit;
  } else if (opts.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.json);
  }

  try {
    return await fetch(url, {
      method: opts.method ?? (body === undefined ? "GET" : "POST"),
      headers,
      body,
      redirect: opts.manualRedirect ? "manual" : "follow",
      // Node needs this to send a streamed request body.
      ...(opts.stream ? { duplex: "half" } : {}),
      signal: AbortSignal.timeout(120_000),
    } as RequestInit);
  } catch (err) {
    throw new HttpError(502, `Resume service unreachable at ${env.resumeUrl}: ${(err as Error).message}`);
  }
}

/** Parses a JSON answer; non-2xx answers become HttpErrors with the service's message. */
export async function resumeJson<T = unknown>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => null)) as T | null;
  if (!res.ok) {
    const detail = (data as { detail?: unknown } | null)?.detail;
    const message =
      typeof detail === "string" ? detail : detail ? JSON.stringify(detail) : `Resume service error ${res.status}`;
    throw new HttpError(res.status, message);
  }
  return data as T;
}
