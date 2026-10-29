export type Role = "student" | "admin";

export interface User {
  id: string;
  googleSub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture: string | null;
  role: Role;
  phone: string | null;
  college: string | null;
  branch: string | null;
  graduationYear: number | null;
  /** id of a row in the resume service's `resumes` table (plain reference, no FK). */
  resumeId: string | null;
  /** id of the Talent Check `candidate_profiles` row, if one exists. */
  candidateProfileId: string | null;
  createdAt: string;
  updatedAt: string;
  lastLoginAt: string | null;
}

export interface GoogleIdentity {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string | null;
}

export type ProfilePatch = Partial<
  Pick<User, "name" | "phone" | "college" | "branch" | "graduationYear" | "resumeId" | "candidateProfileId">
>;

export interface RefreshTokenRow {
  id: string;
  userId: string;
  familyId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface UserStore {
  upsertGoogleUser(identity: GoogleIdentity, role: Role): Promise<User>;
  findUserById(id: string): Promise<User | null>;
  updateProfile(id: string, patch: ProfilePatch): Promise<User | null>;
  createRefreshToken(row: Omit<RefreshTokenRow, "id" | "revokedAt">): Promise<RefreshTokenRow>;
  findRefreshToken(tokenHash: string): Promise<RefreshTokenRow | null>;
  revokeRefreshToken(id: string): Promise<void>;
  revokeFamily(familyId: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
  ping(): Promise<boolean>;
}
