import { Router } from "express";
import * as agent from "../controllers/agent.controller.js";

const router = Router();

router.get("/health", agent.agentHealth);
router.get("/jobs/:id", agent.getAgentJob);
router.get("/companies/:company/:artifact", agent.getAgentArtifact);
router.post("/:task", agent.runAgentTask);

export default router;
