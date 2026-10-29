import { useAuthBootstrap } from "../Hooks/auth.hooks";

/** Mount once at the app root: restores the signed-in user from a saved session. */
export function AuthBootstrap() {
  useAuthBootstrap();
  return null;
}
