import { OAuth2Client } from "google-auth-library";
import type { AuthConfig } from "../config/env.js";
import { HttpError } from "../middlewares/errorHandler.js";
import type { GoogleIdentity } from "./store.js";

/** Verifies Google credentials. Injected into the app so tests never call Google. */
export interface GoogleVerifier {
  /** Verifies an ID token from Google Identity Services ("Sign in with Google" button). */
  verifyIdToken(idToken: string): Promise<GoogleIdentity>;
  /** Exchanges an OAuth authorization code (needs the client secret) and verifies the ID token. */
  exchangeCode(code: string, redirectUri: string): Promise<GoogleIdentity>;
}

export function createGoogleVerifier(cfg: AuthConfig): GoogleVerifier {
  const clientId = cfg.googleClientId;
  const client = () => {
    if (!clientId) throw new HttpError(503, "Google sign-in is not configured (GOOGLE_CLIENT_ID missing)");
    return new OAuth2Client(clientId, cfg.googleClientSecret);
  };

  const toIdentity = async (c: OAuth2Client, idToken: string): Promise<GoogleIdentity> => {
    let payload;
    try {
      const ticket = await c.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new HttpError(401, "Invalid Google credential");
    }
    if (!payload?.sub || !payload.email) throw new HttpError(401, "Google account has no email");
    return {
      sub: payload.sub,
      email: payload.email.toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: payload.name ?? payload.email,
      picture: payload.picture ?? null,
    };
  };

  return {
    async verifyIdToken(idToken) {
      return toIdentity(client(), idToken);
    },
    async exchangeCode(code, redirectUri) {
      const c = client();
      if (!cfg.googleClientSecret) throw new HttpError(503, "GOOGLE_CLIENT_SECRET missing, code flow unavailable");
      let idToken: string | null | undefined;
      try {
        const { tokens } = await c.getToken({ code, redirect_uri: redirectUri });
        idToken = tokens.id_token;
      } catch {
        throw new HttpError(401, "Google rejected the authorization code");
      }
      if (!idToken) throw new HttpError(401, "Google returned no ID token");
      return toIdentity(c, idToken);
    },
  };
}
