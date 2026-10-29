import { randomUUID } from "node:crypto";
import type { GoogleIdentity, ProfilePatch, RefreshTokenRow, Role, User, UserStore } from "./store.js";

/** In-memory store: used by tests and by local dev when DATABASE_URL is not set. */
export class MemoryStore implements UserStore {
  private users = new Map<string, User>();
  private tokens = new Map<string, RefreshTokenRow>();

  async upsertGoogleUser(identity: GoogleIdentity, role: Role): Promise<User> {
    const now = new Date().toISOString();
    const existing = [...this.users.values()].find((u) => u.googleSub === identity.sub);
    if (existing) {
      const updated: User = {
        ...existing,
        email: identity.email,
        emailVerified: identity.emailVerified,
        name: existing.name || identity.name,
        picture: identity.picture ?? existing.picture,
        role: existing.role === "admin" ? "admin" : role,
        lastLoginAt: now,
        updatedAt: now,
      };
      this.users.set(updated.id, updated);
      return updated;
    }
    const user: User = {
      id: randomUUID(),
      googleSub: identity.sub,
      email: identity.email,
      emailVerified: identity.emailVerified,
      name: identity.name,
      picture: identity.picture ?? null,
      role,
      phone: null,
      college: null,
      branch: null,
      graduationYear: null,
      resumeId: null,
      candidateProfileId: null,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async updateProfile(id: string, patch: ProfilePatch) {
    const user = this.users.get(id);
    if (!user) return null;
    const updated: User = { ...user, ...patch, updatedAt: new Date().toISOString() };
    this.users.set(id, updated);
    return updated;
  }

  async createRefreshToken(row: Omit<RefreshTokenRow, "id" | "revokedAt">) {
    const created: RefreshTokenRow = { ...row, id: randomUUID(), revokedAt: null };
    this.tokens.set(created.id, created);
    return created;
  }

  async findRefreshToken(tokenHash: string) {
    return [...this.tokens.values()].find((t) => t.tokenHash === tokenHash) ?? null;
  }

  async revokeRefreshToken(id: string) {
    const t = this.tokens.get(id);
    if (t && !t.revokedAt) t.revokedAt = new Date();
  }

  async revokeFamily(familyId: string) {
    for (const t of this.tokens.values()) if (t.familyId === familyId && !t.revokedAt) t.revokedAt = new Date();
  }

  async revokeAllForUser(userId: string) {
    for (const t of this.tokens.values()) if (t.userId === userId && !t.revokedAt) t.revokedAt = new Date();
  }

  async ping() {
    return true;
  }
}
