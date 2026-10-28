/**
 * talentCheck.controller.ts
 * Express controllers for Talent Check API routes.
 */

import type { Request, Response } from "express";
import {
  runTalentCheckSchema,
  matrixQuerySchema,
  rankQuerySchema,
} from "../lib/talentCheck.schemas.js";
import * as talentCheckService from "../services/talentCheck.service.js";

export async function runTalentCheck(req: Request, res: Response): Promise<void> {
  const parsed = runTalentCheckSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const result = await talentCheckService.runTalentCheck({
    profileId: parsed.data.profile_id,
    companyId: parsed.data.company_id,
    overrides: parsed.data.skill_levels_override,
    persist: parsed.data.persist,
  });

  res.json(result);
}

export async function getTalentMatrix(req: Request, res: Response): Promise<void> {
  const parsed = matrixQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid company_ids parameter" });
    return;
  }

  const companyIds = parsed.data.company_ids;
  const result = await talentCheckService.getMatrix(companyIds);
  res.json(result);
}

export async function getCompanyRanking(req: Request, res: Response): Promise<void> {
  const parsed = rankQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues.map((i) => i.message).join(", ") });
    return;
  }

  const { profile_id, limit } = parsed.data;
  const result = await talentCheckService.rankCompanies(profile_id, limit);
  res.json(result);
}

export async function listTalentChecks(req: Request, res: Response): Promise<void> {
  const profileId = typeof req.query.profile_id === "string" ? req.query.profile_id : undefined;
  const list = await talentCheckService.listTalentChecks(profileId);
  res.json(list);
}
