import { Router } from "express";
import * as jd from "../controllers/jd.controller.js";

// /api/jds: Role 1 JD extraction (cached by document_id + prompt_version) and the JD library.
const router = Router();

router.post("/extract", jd.extractJd);
router.get("/", jd.listJds);
router.get("/:id", jd.getJd);

export default router;
