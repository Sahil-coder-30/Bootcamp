/**
 * skillMatch.routes.ts
 * Express routes for Role 5 Skill Matching.
 */

import { Router } from "express";
import { runSkillMatchController, getSkillMatchMatrixController } from "../controllers/skillMatch.controller.js";

const router = Router();

router.post("/", runSkillMatchController);
router.get("/matrix", getSkillMatchMatrixController);

export default router;

