import express from "express";
import cors from "cors";
import morgan from "morgan";
import type { AuthConfig } from "./config/env.js";
import { createAuthController } from "./controllers/auth.controller.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";
import { requireAuth } from "./middlewares/auth.js";
import { AuthService } from "./services/auth.service.js";
import type { GoogleVerifier } from "./services/google.js";
import type { UserStore } from "./services/store.js";

export interface AppDeps {
  config: AuthConfig;
  store: UserStore;
  google: GoogleVerifier;
}

export function createApp({ config, store, google }: AppDeps) {
  const app = express();
  app.set("trust proxy", true);
  if (!config.production) app.use(morgan("dev"));
  app.use(cors({ origin: config.corsOrigins }));
  app.use(express.json({ limit: "100kb" }));

  // Kubernetes probes (outside /api)
  app.get("/healthz", (_req, res) => {
    res.json({ status: "ok" });
  });
  app.get("/readyz", async (_req, res) => {
    const ok = await store.ping();
    res.status(ok ? 200 : 503).json({ status: ok ? "ready" : "database unreachable" });
  });

  const ctrl = createAuthController(new AuthService(config, store), google);
  const guard = requireAuth(config);

  const api = express.Router();
  api.get("/auth/config", (_req, res) => {
    // Public: the Google client id is not a secret and the frontend needs it for the button.
    res.json({ googleClientId: config.googleClientId ?? null });
  });
  api.post("/auth/google", ctrl.googleLogin);
  api.post("/auth/google/code", ctrl.googleCode);
  api.post("/auth/refresh", ctrl.refresh);
  api.post("/auth/logout", ctrl.logout);
  api.post("/auth/logout-all", guard, ctrl.logoutAll);
  api.get("/auth/verify", guard, ctrl.verify);
  api.get("/auth/me", guard, ctrl.me);
  api.patch("/auth/me", guard, ctrl.updateMe);
  app.use("/api", api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
