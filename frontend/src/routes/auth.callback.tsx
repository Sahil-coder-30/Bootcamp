import { createFileRoute } from "@tanstack/react-router";
import AuthCallbackPage from "@/features/auth/components/AuthCallbackPage";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Signing in | PlaceIntel" }] }),
  component: AuthCallbackPage,
});
