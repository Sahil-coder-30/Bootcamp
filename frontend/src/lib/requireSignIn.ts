import { redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/lib/authStorage";
import { getStoredUser } from "@/lib/auth";

/**
 * `beforeLoad` guard for protected routes. Checks for a saved session or candidate profile
 * (the server still validates the token on live API calls, so this decides where the user lands).
 */
export function requireSignIn(location: { href: string }): void {
  if (!isSignedIn() && !getStoredUser()) {
    throw redirect({ to: "/login", search: { redirect: location.href } });
  }
}

/** Talent Check is open for the demo unless the deployment sets VITE_AUTH_REQUIRED=true. */
export const authRequiredEverywhere = (): boolean =>
  import.meta.env["VITE_AUTH_REQUIRED"] === "true";
