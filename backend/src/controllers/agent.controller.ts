import type { Request, Response } from "express";
import { callAgent } from "../services/agent.service.js";

export async function agentHealth(_req: Request, res: Response) {
  res.json(await callAgent("health"));
}

/** Forwards POST /api/agent/:task to the agent service's /:task endpoint. */
export async function runAgentTask(req: Request<{ task: string }>, res: Response) {
  res.json(await callAgent(req.params.task, req.body ?? {}));
}
