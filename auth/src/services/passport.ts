import { Authenticator } from "passport";
import type { Strategy } from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import type { AuthConfig } from "../config/env.js";
import type { GoogleIdentity } from "./store.js";

export const GOOGLE_STRATEGY = "google";

/**
 * Passport instance with the Google OAuth 2.0 strategy. Stateless: no passport sessions,
 * the verify callback just hands the Google profile to our own token issuing.
 * `strategy` can be replaced in tests so nothing ever calls Google.
 */
export function createPassport(cfg: AuthConfig, strategy?: Strategy) {
  const passport = new Authenticator();
  passport.use(GOOGLE_STRATEGY, strategy ?? googleStrategy(cfg));
  return passport;
}

function googleStrategy(cfg: AuthConfig): Strategy {
  return new GoogleStrategy(
    {
      // Placeholders keep the app bootable without Google config; /auth/google answers 503 then.
      clientID: cfg.googleClientId ?? "not-configured",
      clientSecret: cfg.googleClientSecret ?? "not-configured",
      callbackURL: cfg.googleCallbackUrl,
    },
    (_accessToken, _refreshToken, profile, done) => {
      const email = profile.emails?.[0]?.value;
      if (!email) return done(new Error("Google account has no email"));
      const identity: GoogleIdentity = {
        sub: profile.id,
        email: email.toLowerCase(),
        emailVerified: (profile._json as { email_verified?: boolean }).email_verified === true,
        name: profile.displayName || email,
        picture: profile.photos?.[0]?.value ?? null,
      };
      done(null, identity);
    },
  ) as unknown as Strategy;
}
export type PassportInstance = ReturnType<typeof createPassport>;
