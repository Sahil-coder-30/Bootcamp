import type { Request, Response } from "express";
import { callAgent } from "../services/agent.service.js";

export async function agentHealth(_req: Request, res: Response) {
  res.json(await callAgent("health"));
}

/** Forwards POST /api/agent/:task to the agent service's /:task endpoint. */
export async function runAgentTask(req: Request<{ task: string }>, res: Response) {
  res.json(await callAgent(req.params.task, req.body ?? {}));
}

/** Polls a background run: GET /api/agent/jobs/:id -> agent GET /jobs/:id. */
export async function getAgentJob(req: Request<{ id: string }>, res: Response) {
  res.json(await callAgent(`jobs/${encodeURIComponent(req.params.id)}`));
}

/** Reads a saved result: GET /api/agent/companies/:company/:artifact (golden-record, skill-matrix, hiring). */
export async function getAgentArtifact(req: Request<{ company: string; artifact: string }>, res: Response) {
  const { company, artifact } = req.params;
  res.json(await callAgent(`companies/${encodeURIComponent(company)}/${encodeURIComponent(artifact)}`));
}
