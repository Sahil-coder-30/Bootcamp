import { z } from "zod";

export const parseResumeSchema = z.object({
  content_b64: z.string().optional(),
  file_name: z.string().default("resume.pdf"),
  mime: z.string().default("application/pdf"),
  sample_key: z.string().optional(),
});

export const inferLevelsSchema = z.object({
  extraction: z.record(z.string(), z.any()),
});
