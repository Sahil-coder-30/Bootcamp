import type { RequestHandler } from "express";
import type { ZodError, ZodTypeAny, z } from "zod";
import { HttpError } from "./errorHandler.js";

export interface Issue {
  path: string;
  message: string;
}

export const toIssues = (err: ZodError): Issue[] =>
  err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));

/** Parses `data` or throws a 400 `{error, issues: [{path, message}]}`. */
export function parseOrThrow<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, "Validation failed", { issues: toIssues(result.error) });
  }
  return result.data;
}

/**
 * Validates `req.body` and replaces it with the parsed value. `ignoreKeys` are dropped first,
 * so a client can send back a profile it just read (with `id`, `version`, `updated_at`).
 */
export function validateBody(schema: ZodTypeAny, ignoreKeys: string[] = []): RequestHandler {
  return (req, _res, next) => {
    const raw: unknown = req.body;
    let body = raw;
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      body = Object.fromEntries(Object.entries(raw).filter(([k]) => !ignoreKeys.includes(k)));
    }
    req.body = parseOrThrow(schema, body);
    next();
  };
}
