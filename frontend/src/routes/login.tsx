import { createFileRoute, redirect } from "@tanstack/react-router";
import LoginPage from "@/features/auth/components/LoginPage";
import { isSignedIn } from "@/lib/authStorage";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  beforeLoad: ({ search }) => {
    if (isSignedIn() || getStoredUser()) {
      const dest =
        typeof search["redirect"] === "string" && search["redirect"] !== "/"
          ? search["redirect"]
          : "/dashboard";
      throw redirect({ to: dest });
    }
  },
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
