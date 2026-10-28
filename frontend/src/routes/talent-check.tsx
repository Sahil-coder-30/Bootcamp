import { createFileRoute } from "@tanstack/react-router";
import { TalentCheckPage } from "@/features/talentCheck/components/TalentCheckPage";

export const Route = createFileRoute("/talent-check")({
  head: () => ({
    meta: [
      { title: "Talent Check | Readiness Evaluation & Hiring Bar Analysis" },
      {
        name: "description",
        content:
          "Compare candidate profile against employer hiring bars across 12 RADIX skillset categories with instant what-if simulation and curriculum topic mapping.",
      },
    ],
  }),
  component: TalentCheckPage,
});
