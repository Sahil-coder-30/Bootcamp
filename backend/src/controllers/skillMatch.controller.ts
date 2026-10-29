/**
 * skillMatch.controller.ts
 * Request handling and Zod validation for Skill Matching endpoints.
 */

import type { Request, Response } from "express";
import { z } from "zod";
import { runSkillMatch, getSkillMatchMatrix } from "../services/skillMatch.service.js";
import { HttpError } from "../middlewares/errorHandler.js";

const RunSkillMatchSchema = z.object({
  profile_id: z.string().min(1, "profile_id is required"),
  jd_id: z.string().min(1, "jd_id is required"),
  refresh: z.boolean().optional().default(false),
});

export async function runSkillMatchController(req: Request, res: Response): Promise<void> {
  const parse = RunSkillMatchSchema.safeParse(req.body);
  if (!parse.success) {
    throw new HttpError(400, parse.error.issues.map((i) => i.message).join(", "));
  }

  const result = await runSkillMatch({
    profileId: parse.data.profile_id,
    jdId: parse.data.jd_id,
    refresh: parse.data.refresh,
  });

  res.status(200).json(result);
}

export async function getSkillMatchMatrixController(req: Request, res: Response): Promise<void> {
  const profile_ids = req.query.profile_ids
    ? String(req.query.profile_ids).split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const jd_ids = req.query.jd_ids
    ? String(req.query.jd_ids).split(",").map((s) => s.trim()).filter(Boolean)
    : undefined;

  const refresh = req.query.refresh === "true";

  const matrix = await getSkillMatchMatrix({
    profileIds: profile_ids,
    jdIds: jd_ids,
    refresh,
  });

  res.status(200).json(matrix);
}

