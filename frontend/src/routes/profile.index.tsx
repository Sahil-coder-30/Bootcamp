import { createFileRoute } from "@tanstack/react-router";
import ProfilesListPage from "@/features/profile/components/ProfilesListPage";

export const Route = createFileRoute("/profile/")({
  component: ProfilesListPage,
});
