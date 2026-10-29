import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import { SkillMatchPage } from "@/features/skillMatch/components/SkillMatchPage";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

export const Route = createFileRoute("/skill-match")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [
      { title: "Skill Match | Deterministic ATS Gap Analysis & RADIX Grounding" },
      {
        name: "description",
        content:
          "Match candidate resume evidence against job description skill requirements with verifiable audit basis.",
      },
    ],
  }),
  component: function SkillMatch() {
    return (
      <DashboardLayout>
        <SkillMatchPage />
      </DashboardLayout>
    );
  },
});
