import { createFileRoute } from "@tanstack/react-router";
import AppLayout from "@/components/Layout/AppLayout";

export const Route = createFileRoute("/company")({
  component: AppLayout,
});
