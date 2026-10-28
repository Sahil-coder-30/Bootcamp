import express from "express";
import cors from "cors";
import morgan from "morgan";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(morgan("dev"));
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "10mb" }));

  // Kubernetes probes
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });
  app.get("/readyz", (_req, res) => {
    res.status(200).json({ status: "ready" });
  });

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
