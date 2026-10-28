import type { NextFunction, Request, Response } from "express";
import type { AuthConfig } from "../config/env.js";
import { verifyAccessToken, type AccessClaims } from "../services/tokens.js";
import { HttpError } from "./errorHandler.js";

declare module "express-serve-static-core" {
  interface Request {
    auth?: AccessClaims;
  }
}

export function requireAuth(cfg: AuthConfig) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header("authorization") ?? "";
    const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
    if (!token) return next(new HttpError(401, "Missing bearer token"));
    try {
      req.auth = await verifyAccessToken(cfg, token);
      next();
    } catch {
      next(new HttpError(401, "Invalid or expired token"));
    }
  };
}
