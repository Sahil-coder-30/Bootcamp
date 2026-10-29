import pg from "pg";
import type { GoogleIdentity, ProfilePatch, RefreshTokenRow, Role, User, UserStore } from "./store.js";

type Row = Record<string, unknown>;

const iso = (v: unknown): string => (v instanceof Date ? v.toISOString() : String(v));

function toUser(r: Row): User {
  return {
    id: r["id"] as string,
    googleSub: r["google_sub"] as string,
    email: r["email"] as string,
    emailVerified: r["email_verified"] as boolean,
    name: (r["name"] as string | null) ?? "",
    picture: (r["picture"] as string | null) ?? null,
    role: r["role"] as Role,
    phone: (r["phone"] as string | null) ?? null,
    college: (r["college"] as string | null) ?? null,
    branch: (r["branch"] as string | null) ?? null,
    graduationYear: (r["graduation_year"] as number | null) ?? null,
    resumeId: (r["resume_id"] as string | null) ?? null,
    candidateProfileId: (r["candidate_profile_id"] as string | null) ?? null,
    createdAt: iso(r["created_at"]),
    updatedAt: iso(r["updated_at"]),
    lastLoginAt: r["last_login_at"] ? iso(r["last_login_at"]) : null,
  };
}

function toToken(r: Row): RefreshTokenRow {
  return {
    id: r["id"] as string,
    userId: r["user_id"] as string,
    familyId: r["family_id"] as string,
    tokenHash: r["token_hash"] as string,
    expiresAt: r["expires_at"] as Date,
    revokedAt: (r["revoked_at"] as Date | null) ?? null,
  };
}

const PROFILE_COLUMNS: Record<keyof ProfilePatch, string> = {
  name: "name",
  phone: "phone",
  college: "college",
  branch: "branch",
  graduationYear: "graduation_year",
  resumeId: "resume_id",
  candidateProfileId: "candidate_profile_id",
};

export class PgStore implements UserStore {
  readonly pool: pg.Pool;

  constructor(databaseUrl: string) {
    this.pool = new pg.Pool({
      connectionString: databaseUrl,
      max: 5,
      ssl: /localhost|127\.0\.0\.1/.test(databaseUrl) ? undefined : { rejectUnauthorized: false },
    });
  }

  async upsertGoogleUser(identity: GoogleIdentity, role: Role): Promise<User> {
    const { rows } = await this.pool.query(
      `insert into auth_users (google_sub, email, email_verified, name, picture, role, last_login_at)
       values ($1, $2, $3, $4, $5, $6, now())
       on conflict (google_sub) do update set
         email = excluded.email,
         email_verified = excluded.email_verified,
         name = case when auth_users.name = '' then excluded.name else auth_users.name end,
         picture = coalesce(excluded.picture, auth_users.picture),
         role = case when auth_users.role = 'admin' then 'admin' else excluded.role end,
         last_login_at = now(),
         updated_at = now()
       returning *`,
      [identity.sub, identity.email, identity.emailVerified, identity.name, identity.picture ?? null, role],
    );
    return toUser(rows[0]);
  }

  async findUserById(id: string) {
    const { rows } = await this.pool.query("select * from auth_users where id = $1", [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async updateProfile(id: string, patch: ProfilePatch) {
    const entries = (Object.entries(patch) as [keyof ProfilePatch, unknown][]).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return this.findUserById(id);
    const sets = entries.map(([k], i) => `${PROFILE_COLUMNS[k]} = $${i + 2}`);
    const { rows } = await this.pool.query(
      `update auth_users set ${sets.join(", ")}, updated_at = now() where id = $1 returning *`,
      [id, ...entries.map(([, v]) => v)],
    );
    return rows[0] ? toUser(rows[0]) : null;
  }

  async createRefreshToken(row: Omit<RefreshTokenRow, "id" | "revokedAt">) {
    const { rows } = await this.pool.query(
      `insert into auth_refresh_tokens (user_id, family_id, token_hash, expires_at)
       values ($1, $2, $3, $4) returning *`,
      [row.userId, row.familyId, row.tokenHash, row.expiresAt],
    );
    return toToken(rows[0]);
  }

  async findRefreshToken(tokenHash: string) {
    const { rows } = await this.pool.query("select * from auth_refresh_tokens where token_hash = $1", [tokenHash]);
    return rows[0] ? toToken(rows[0]) : null;
  }

  async revokeRefreshToken(id: string) {
    await this.pool.query("update auth_refresh_tokens set revoked_at = now() where id = $1 and revoked_at is null", [id]);
  }

  async revokeFamily(familyId: string) {
    await this.pool.query(
      "update auth_refresh_tokens set revoked_at = now() where family_id = $1 and revoked_at is null",
      [familyId],
    );
  }

  async revokeAllForUser(userId: string) {
    await this.pool.query(
      "update auth_refresh_tokens set revoked_at = now() where user_id = $1 and revoked_at is null",
      [userId],
    );
  }

  async ping() {
    try {
      await this.pool.query("select 1");
      return true;
    } catch {
      return false;
    }
  }
}
