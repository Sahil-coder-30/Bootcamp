/**
 * talentCheck.routes.ts
 * Express routes for Role 4: Talent Check.
 */

import { Router } from "express";
import * as talentCheck from "../controllers/talentCheck.controller.js";

const router = Router();

router.post("/", talentCheck.runTalentCheck);
router.get("/matrix", talentCheck.getTalentMatrix);
router.get("/rank", talentCheck.getCompanyRanking);
router.get("/", talentCheck.listTalentChecks);

export default router;
