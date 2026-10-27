import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import companiesRoutes from "./companies.routes.js";
import agentRoutes from "./agent.routes.js";

const router = Router();

router.get("/health", health);
router.use("/companies", companiesRoutes);
router.use("/agent", agentRoutes);

export default router;
