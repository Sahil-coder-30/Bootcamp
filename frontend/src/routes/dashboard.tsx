import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import CandidateDashboard from "@/features/dashboard/components/CandidateDashboard";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [
      { title: `Candidate Dashboard | ${APP_NAME} | ${COLLEGE_SHORT}` },
      {
        name: "description",
        content:
          "Candidate placement intelligence dashboard, 12-skill Bloom histograms, recruiter hiring bar matches, and study roadmap.",
      },
      {
        property: "og:title",
        content: `Candidate Dashboard | ${APP_NAME}`,
      },
    ],
  }),
  component: CandidateDashboard,
});
