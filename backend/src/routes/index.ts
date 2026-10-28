import { Router } from "express";
import { health } from "../controllers/health.controller.js";
import companiesRoutes from "./companies.routes.js";
import agentRoutes from "./agent.routes.js";
import talentCheckRoutes from "./talentCheck.routes.js";
import { requireAuth } from "../middlewares/auth.js";
import { env } from "../config/env.js";

const router = Router();

router.get("/health", health);
router.use("/companies", companiesRoutes);
router.use("/agent", agentRoutes);
router.get("/whoami", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
router.use("/talent-check", env.authRequired ? requireAuth : (_req, _res, next) => next(), talentCheckRoutes);

export default router;
