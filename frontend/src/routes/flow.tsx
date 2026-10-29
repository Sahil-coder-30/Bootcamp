import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import { FlowPage } from "@/features/flow/components/FlowPage";

export const Route = createFileRoute("/flow")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [{ title: "Guided flow | JD to resume to skill match to talent check" }],
  }),
  component: FlowPage,
});
