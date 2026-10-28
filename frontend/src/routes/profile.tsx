import { createFileRoute } from "@tanstack/react-router";
import ProfilePage from "@/features/auth/components/ProfilePage";
import { requireSignIn } from "@/lib/requireSignIn";

export const Route = createFileRoute("/profile")({
  beforeLoad: ({ location }) => requireSignIn(location),
  head: () => ({ meta: [{ title: "My profile | PlaceIntel" }] }),
  component: ProfilePage,
});
