import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import DashboardLayout from "@/components/Layout/DashboardLayout";

export const Route = createFileRoute("/company")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  component: DashboardLayout,
});
