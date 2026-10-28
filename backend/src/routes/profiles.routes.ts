import { Router } from "express";
import * as profiles from "../controllers/profiles.controller.js";
import { candidateProfileInputSchema, fromResumeBodySchema } from "../contract/profile.schema.js";
import { validateBody } from "../middlewares/validate.js";

const router = Router();

// Clients may send back a profile they just read; the server-owned fields are ignored.
const SERVER_FIELDS = ["id", "version", "updated_at"];

router.get("/", profiles.listProfiles);
router.post("/", validateBody(candidateProfileInputSchema, SERVER_FIELDS), profiles.createProfile);
// Must stay above "/:id" or "from-resume" would be read as an id.
router.post("/from-resume", validateBody(fromResumeBodySchema), profiles.draftFromResume);
router.get("/calibration/:code", profiles.getCalibrationTopics);
router.get("/:id", profiles.getProfile);
router.put("/:id", validateBody(candidateProfileInputSchema, SERVER_FIELDS), profiles.updateProfile);
router.get("/:id/versions", profiles.getProfileVersions);
router.get("/:id/cv-url", profiles.getProfileCvUrl);
router.delete("/:id", profiles.deleteProfile);

export default router;
