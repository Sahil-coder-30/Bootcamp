import { redirect } from "@tanstack/react-router";
import { isSignedIn } from "@/lib/authStorage";

/**
 * `beforeLoad` guard for protected routes. Checks for a saved session (the server still
 * validates the token on every API call, so this only decides where the user lands).
 */
export function requireSignIn(location: { href: string }): void {
  if (!isSignedIn()) throw redirect({ to: "/login", search: { redirect: location.href } });
}

/** Talent Check is open for the demo unless the deployment sets VITE_AUTH_REQUIRED=true. */
export const authRequiredEverywhere = (): boolean =>
  import.meta.env["VITE_AUTH_REQUIRED"] === "true";
