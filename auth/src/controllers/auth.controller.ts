import type { NextFunction, Request, Response } from "express";

import type { AuthConfig } from "../config/env.js";
import type { AuthService } from "../services/auth.service.js";
import { createState, NONCE_COOKIE, readCookie, readState, safeRedirect } from "../services/oauthState.js";
import { GOOGLE_STRATEGY, type PassportInstance } from "../services/passport.js";
import type { GoogleIdentity } from "../services/store.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { profilePatchSchema, refreshSchema } from "../lib/schemas.js";

const cookieOptions = (cfg: AuthConfig) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: cfg.production,
  path: "/api/auth",
  maxAge: 10 * 60 * 1000,
});

export function createAuthController(service: AuthService, passport: PassportInstance, cfg: AuthConfig) {
  const toFrontend = (res: Response, path: string, params: Record<string, string>, hash = false) => {
    const q = new URLSearchParams(params).toString();
    res.redirect(`${cfg.frontendUrl}${path}${hash ? "#" : "?"}${q}`);
  };

  return {
    /** Step 1: send the browser to Google's consent screen. */
    async googleStart(req: Request, res: Response, next: NextFunction) {
      if (!cfg.googleClientId) return next(new HttpError(503, "Google sign-in is not configured (GOOGLE_CLIENT_ID missing)"));
      const { state, nonce } = await createState(cfg, safeRedirect(req.query["redirect"]));
      res.cookie(NONCE_COOKIE, nonce, cookieOptions(cfg));
      passport.authenticate(GOOGLE_STRATEGY, {
        scope: ["profile", "email"],
        session: false,
        prompt: "select_account",
        state,
      })(req, res, next);
    },

    /** Step 2: Google sends the browser back here. We issue our own tokens and hand them to the SPA. */
    async googleCallback(req: Request, res: Response, next: NextFunction) {
      const fail = (message: string) => toFrontend(res, "/login", { error: message });
      res.clearCookie(NONCE_COOKIE, { path: "/api/auth" });
      if (req.query["error"]) return fail("Google sign-in was cancelled");

      let redirect: string;
      try {
        const state = await readState(cfg, String(req.query["state"] ?? ""));
        if (state.nonce !== readCookie(req.headers.cookie, NONCE_COOKIE)) throw new Error("nonce mismatch");
        redirect = state.redirect;
      } catch {
        return fail("Sign-in session expired, please try again");
      }

      passport.authenticate(
        GOOGLE_STRATEGY,
        { session: false },
        async (err: unknown, identity: GoogleIdentity | false | undefined) => {
          try {
            if (err || !identity) return fail("Google sign-in failed");
            const session = await service.loginWithGoogle(identity);
            toFrontend(
              res,
              "/auth/callback",
              { accessToken: session.accessToken, refreshToken: session.refreshToken, redirect },
              true,
            );
          } catch (e) {
            if (e instanceof HttpError && e.status < 500) return fail(e.message);
            next(e);
          }
        },
      )(req, res, next);
    },

    async refresh(req: Request, res: Response) {
      const { refreshToken } = refreshSchema.parse(req.body);
      res.json(await service.refresh(refreshToken));
    },
    async logout(req: Request, res: Response) {
      const { refreshToken } = refreshSchema.parse(req.body);
      await service.logout(refreshToken);
      res.status(204).end();
    },
    async logoutAll(req: Request, res: Response) {
      await service.logoutAll(req.auth!.sub);
      res.status(204).end();
    },
    async me(req: Request, res: Response) {
      res.json({ user: await service.getUser(req.auth!.sub) });
    },
    async updateMe(req: Request, res: Response) {
      const patch = profilePatchSchema.parse(req.body);
      res.json({ user: await service.updateProfile(req.auth!.sub, patch) });
    },
    /** Lets other services check a token without sharing the secret. */
    verify(req: Request, res: Response) {
      const { sub, email, role } = req.auth!;
      res.setHeader("X-User-Id", sub).setHeader("X-User-Email", email).setHeader("X-User-Role", role);
      res.json({ sub, email, role });
    },
  };
}
