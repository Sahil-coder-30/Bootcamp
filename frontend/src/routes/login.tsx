import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/features/auth/components/LoginPage";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string; error?: string } => ({
    ...(typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {}),
    ...(typeof search["error"] === "string" ? { error: search["error"] } : {}),
  }),
  head: () => ({ meta: [{ title: "Sign in | PlaceIntel" }] }),
  component: function Login() {
    const { redirect, error } = Route.useSearch();
    return <LoginPage redirect={redirect} error={error} />;
  },
});
