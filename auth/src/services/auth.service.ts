import { randomUUID } from "node:crypto";
import type { AuthConfig } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { hashToken, newRefreshToken, signAccessToken } from "./tokens.js";
import type { GoogleIdentity, ProfilePatch, User, UserStore } from "./store.js";

export interface Session {
  accessToken: string;
  refreshToken: string;
  tokenType: "Bearer";
  expiresIn: number;
  user: User;
}

export class AuthService {
  constructor(
    private cfg: AuthConfig,
    private store: UserStore,
  ) {}

  private assertAllowed(identity: GoogleIdentity) {
    if (!identity.emailVerified) throw new HttpError(403, "Google email is not verified");
    const domain = identity.email.split("@")[1] ?? "";
    const allowed = this.cfg.allowedEmailDomains;
    if (allowed.length > 0 && !allowed.includes(domain)) {
      throw new HttpError(403, `Sign-in is limited to: ${allowed.join(", ")}`);
    }
  }

  private async issue(user: User, familyId: string): Promise<Session> {
    const refresh = newRefreshToken();
    await this.store.createRefreshToken({
      userId: user.id,
      familyId,
      tokenHash: refresh.hash,
      expiresAt: new Date(Date.now() + this.cfg.refreshTtlDays * 86_400_000),
    });
    return {
      accessToken: await signAccessToken(this.cfg, user),
      refreshToken: refresh.token,
      tokenType: "Bearer",
      expiresIn: this.cfg.accessTtlSeconds,
      user,
    };
  }

  async loginWithGoogle(identity: GoogleIdentity): Promise<Session> {
    this.assertAllowed(identity);
    const role = this.cfg.adminEmails.includes(identity.email) ? "admin" : "student";
    const user = await this.store.upsertGoogleUser(identity, role);
    return this.issue(user, randomUUID());
  }

  /** Rotates the refresh token. Re-using an already rotated token revokes the whole family. */
  async refresh(refreshToken: string): Promise<Session> {
    const row = await this.store.findRefreshToken(hashToken(refreshToken));
    if (!row) throw new HttpError(401, "Invalid refresh token");
    if (row.revokedAt) {
      await this.store.revokeFamily(row.familyId);
      throw new HttpError(401, "Refresh token already used");
    }
    if (row.expiresAt.getTime() <= Date.now()) throw new HttpError(401, "Refresh token expired");
    const user = await this.store.findUserById(row.userId);
    if (!user) throw new HttpError(401, "User no longer exists");
    await this.store.revokeRefreshToken(row.id);
    return this.issue(user, row.familyId);
  }

  async logout(refreshToken: string): Promise<void> {
    const row = await this.store.findRefreshToken(hashToken(refreshToken));
    if (row) await this.store.revokeFamily(row.familyId);
  }

  async logoutAll(userId: string): Promise<void> {
    await this.store.revokeAllForUser(userId);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.store.findUserById(id);
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }

  async updateProfile(id: string, patch: ProfilePatch): Promise<User> {
    const user = await this.store.updateProfile(id, patch);
    if (!user) throw new HttpError(404, "User not found");
    return user;
  }
}
