import { Router } from "express";
import * as jd from "../controllers/jd.controller.js";

// /api/documents: JD (and later resume) files. Stored once per sha256.
const router = Router();

router.post("/", jd.documentUpload, jd.uploadDocument);
router.get("/:id", jd.getDocument);

export default router;
