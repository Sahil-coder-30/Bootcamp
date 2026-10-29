import { createFileRoute } from "@tanstack/react-router";
import { FlowPage } from "@/features/flow/components/FlowPage";

export const Route = createFileRoute("/flow")({
  head: () => ({
    meta: [{ title: "Guided flow | JD to resume to skill match to talent check" }],
  }),
  component: FlowPage,
});
