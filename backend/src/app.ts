import express from "express";
import cors from "cors";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { errorHandler, notFound } from "./middlewares/errorHandler.js";

export function createApp() {
  const app = express();
  app.use(cors({ origin: env.corsOrigins }));
  app.use(express.json({ limit: "2mb" }));

  app.use("/api", routes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
