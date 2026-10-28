import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import companiesRoutes from "./companies.routes.js";
import agentRoutes from "./agent.routes.js";
import profilesRoutes from "./profiles.routes.js";
import talentCheckRoutes from "./talentCheck.routes.js";
import resumesRoutes from "./resumes.routes.js";

const router = Router();

router.get("/health", health);
router.use("/companies", companiesRoutes);
router.use("/agent", agentRoutes);
router.use("/profiles", profilesRoutes);
router.use("/talent-check", talentCheckRoutes);
router.use("/resumes", resumesRoutes);

export default router;
