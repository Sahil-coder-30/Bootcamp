import type { Request, Response } from "express";
import { parseResumeSchema, inferLevelsSchema } from "../lib/resumes.schemas.js";
import * as resumesService from "../services/resumes.service.js";

export async function parseResume(req: Request, res: Response): Promise<void> {
  const parsed = parseResumeSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const result = await resumesService.parseResume(parsed.data);
  res.json(result);
}

export async function getSampleResume(req: Request, res: Response): Promise<void> {
  const rawKey = req.params.candidateKey;
  const candidateKey = Array.isArray(rawKey) ? rawKey[0] || "ananya" : rawKey || "ananya";
  const result = await resumesService.getSampleResume(candidateKey);
  res.json(result);
}

export async function inferLevels(req: Request, res: Response): Promise<void> {
  const parsed = inferLevelsSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const result = await resumesService.inferLevels(parsed.data.extraction);
  res.json(result);
}
