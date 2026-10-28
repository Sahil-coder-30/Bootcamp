import type { NextFunction, Request, RequestHandler, Response } from "express";
import { jwtVerify } from "jose";
import { env } from "../config/env.js";
import { HttpError } from "./errorHandler.js";

/** Identity taken from an access token issued by the auth service (../auth). */
export interface AuthUser {
  id: string;
  email: string;
  role: "student" | "admin";
}

declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

const secretKey = (secret: string) => new TextEncoder().encode(secret);

export async function verifyBearer(token: string): Promise<AuthUser> {
  if (!env.jwtSecret) throw new HttpError(503, "JWT_SECRET is not configured");
  const { payload } = await jwtVerify(token, secretKey(env.jwtSecret), {
    issuer: env.jwtIssuer,
    audience: env.jwtAudience,
    algorithms: ["HS256"],
  });
  if (!payload.sub || typeof payload["email"] !== "string") throw new Error("Malformed token");
  return { id: payload.sub, email: payload["email"], role: payload["role"] === "admin" ? "admin" : "student" };
}

function bearerOf(req: Request): string | null {
  const header = req.header("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() || null : null;
}

/**
 * Runs on every /api request. No token = anonymous (req.user stays undefined);
 * a token that is present but invalid or expired = 401, so the client knows to refresh.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  const token = bearerOf(req);
  if (!token || !env.jwtSecret) return next();
  try {
    req.user = await verifyBearer(token);
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
};

/** Guard for routes that need a signed-in user. */
export const requireAuth: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  if (!req.user) return next(new HttpError(401, "Sign in required"));
  next();
};

/** Headers to forward to internal services (resume, agent) so they can scope data per user. */
export function userHeaders(req: Request): Record<string, string> {
  return req.user ? { "X-User-Id": req.user.id, "X-User-Email": req.user.email, "X-User-Role": req.user.role } : {};
}
