import { Router } from "express";
import * as resumesController from "../controllers/resumes.controller.js";

const router = Router();

router.post("/parse", resumesController.parseResume);
router.get("/sample/:candidateKey", resumesController.getSampleResume);
router.post("/levels/infer", resumesController.inferLevels);

export default router;
