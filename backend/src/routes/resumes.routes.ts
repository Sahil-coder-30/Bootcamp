import { Router } from "express";
import * as resumes from "../controllers/resumes.controller.js";
import { requireAuth } from "../middlewares/auth.js";

// /api/resumes -> resume service (../resume). Anonymous users may upload and read by id
// (ids are random UUIDs); listing, claiming and deleting need a signed-in user.
const router = Router();

router.get("/health", resumes.resumeHealth);
router.get("/sample/:candidateKey", resumes.getSampleResume);
router.post("/parse", resumes.parseResume);
router.post("/parse-text", resumes.parseResumeText);
router.post("/levels/infer", resumes.inferLevels);
router.post("/levels", resumes.inferLevels);
router.post("/", resumes.uploadResume);
router.get("/", requireAuth, resumes.listResumes);
router.get("/:id", resumes.getResume);
router.get("/:id/file", resumes.downloadResume);
router.get("/:id/profile-draft", resumes.getProfileDraft);
router.post("/:id/reparse", resumes.reparseResume);
router.patch("/:id/claim", requireAuth, resumes.claimResume);
router.delete("/:id", requireAuth, resumes.deleteResume);

export default router;
