/**
 * jd.schemas.ts
 * Zod validation for Role 1: JD Analytics endpoints.
 */

import { z } from "zod";

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const extractJdSchema = z.object({
  document_id: z.string().regex(UUID_RE, "document_id must be a UUID"),
  company_id: z.number().int().positive().optional(),
  role: z.string().trim().min(1).max(200).optional(),
  force: z.boolean().optional().default(false),
});

export const documentKindSchema = z.enum(["jd", "resume"]).default("jd");
