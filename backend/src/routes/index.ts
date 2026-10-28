import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import companiesRoutes from "./companies.routes.js";
import agentRoutes from "./agent.routes.js";
import talentCheckRoutes from "./talentCheck.routes.js";
import skillMatchRoutes from "./skillMatch.routes.js";

const router = Router();

router.get("/health", health);
router.use("/companies", companiesRoutes);
router.use("/agent", agentRoutes);
router.use("/talent-check", talentCheckRoutes);
router.use("/skill-match", skillMatchRoutes);

export default router;
