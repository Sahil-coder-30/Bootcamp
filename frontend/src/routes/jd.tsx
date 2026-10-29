import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import { JdPage } from "@/features/jd/components/JdPage";

export const Route = createFileRoute("/jd")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [
      { title: "JD Analytics | Skills, levels and evidence from any job description" },
      {
        name: "description",
        content:
          "Upload a JD and get every required skill mapped to the 12 RADIX categories, with must/nice tags, implied levels and verified evidence.",
      },
    ],
  }),
  component: JdPage,
});
