import { createFileRoute } from "@tanstack/react-router";
import LoginPage from "@/features/auth/components/LoginPage";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } =>
    typeof search["redirect"] === "string" ? { redirect: search["redirect"] } : {},
  head: () => ({ meta: [{ title: "Sign in | PlaceIntel" }] }),
  component: function Login() {
    const { redirect } = Route.useSearch();
    return <LoginPage redirect={redirect} />;
  },
});
