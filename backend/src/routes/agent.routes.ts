import { Router } from "express";
import * as agent from "../controllers/agent.controller.js";

const router = Router();

router.get("/health", agent.agentHealth);
router.post("/:task", agent.runAgentTask);

export default router;
