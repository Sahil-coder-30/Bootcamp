import { Router } from "express";
import { saveProfileFromExtraction } from "../services/flow.service.js";
import type { ResumeExtraction } from "../contract/profile.schema.js";

const router = Router();

// POST /api/flow/profile { extraction, email?, user_id?, profile_id? } -> { profile_id, profile, created, warnings }
router.post("/profile", async (req, res) => {
  const extraction = req.body?.extraction as ResumeExtraction;
  const userOverride = {
    email: typeof req.body?.email === "string" ? req.body.email : (req as any).user?.email,
    userId: typeof req.body?.user_id === "string" ? req.body.user_id : (req as any).user?.id,
    profileId: typeof req.body?.profile_id === "string" ? req.body.profile_id : undefined,
  };
  res.status(200).json(await saveProfileFromExtraction(extraction, userOverride));
});

export default router;
