import type { Request, Response } from "express";
import type { AuthService } from "../services/auth.service.js";
import type { GoogleVerifier } from "../services/google.js";
import { googleCodeSchema, googleLoginSchema, profilePatchSchema, refreshSchema } from "../lib/schemas.js";

export function createAuthController(service: AuthService, google: GoogleVerifier) {
  return {
    async googleLogin(req: Request, res: Response) {
      const { credential } = googleLoginSchema.parse(req.body);
      res.json(await service.loginWithGoogle(await google.verifyIdToken(credential)));
    },
    async googleCode(req: Request, res: Response) {
      const { code, redirectUri } = googleCodeSchema.parse(req.body);
      res.json(await service.loginWithGoogle(await google.exchangeCode(code, redirectUri)));
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
