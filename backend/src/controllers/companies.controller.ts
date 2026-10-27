import type { Request, Response } from "express";
import * as companiesService from "../services/companies.service.js";
import { getCompanyBar } from "../services/companyBar.service.js";
import { HttpError } from "../middlewares/errorHandler.js";

const parseId = (raw: string | string[] | undefined): number => {
  const str = Array.isArray(raw) ? raw[0] : raw;
  const id = Number(str);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Company id must be a positive integer");
  return id;
};

export async function listCompanies(_req: Request, res: Response): Promise<void> {
  const list = await companiesService.listCompanies();
  res.json(list);
}

export async function getCompany(req: Request, res: Response): Promise<void> {
  const profile = await companiesService.getCompanyProfile(parseId(req.params.id));
  if (!profile) throw new HttpError(404, "Company not found");
  res.json(profile);
}

export async function getCompanySkills(req: Request, res: Response): Promise<void> {
  const skills = await companiesService.getCompanySkills(parseId(req.params.id));
  res.json(skills);
}

export async function getCompanySkillBar(req: Request, res: Response): Promise<void> {
  const bar = await getCompanyBar(parseId(req.params.id));
  res.json(bar);
}
