import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import AppLayout from "@/components/Layout/AppLayout";

export const Route = createFileRoute("/company")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  component: AppLayout,
});
