import { Router } from "express";
import * as companies from "../controllers/companies.controller.js";

const router = Router();

router.get("/", companies.listCompanies);
router.get("/:id", companies.getCompany);
router.get("/:id/skills", companies.getCompanySkills);

export default router;
