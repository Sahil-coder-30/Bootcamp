import { Router } from "express";
import { saveProfileFromExtraction } from "../services/flow.service.js";
import type { ResumeExtraction } from "../contract/profile.schema.js";

const router = Router();

// POST /api/flow/profile { extraction } -> { profile_id, profile, created, warnings }
router.post("/profile", async (req, res) => {
  res.status(200).json(await saveProfileFromExtraction(req.body?.extraction as ResumeExtraction));
});

export default router;
