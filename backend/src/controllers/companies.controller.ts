import type { Request, Response } from "express";
import * as companiesService from "../services/companies.service.js";
import { HttpError } from "../middlewares/errorHandler.js";

const parseId = (raw: string | undefined): number => {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "Company id must be a positive integer");
  return id;
};

export async function listCompanies(_req: Request, res: Response) {
  res.json(await companiesService.listCompanies());
}

export async function getCompany(req: Request<{ id: string }>, res: Response) {
  const profile = await companiesService.getCompanyProfile(parseId(req.params.id));
  if (!profile) throw new HttpError(404, "Company not found");
  res.json(profile);
}

export async function getCompanySkills(req: Request<{ id: string }>, res: Response) {
  res.json(await companiesService.getCompanySkills(parseId(req.params.id)));
}
