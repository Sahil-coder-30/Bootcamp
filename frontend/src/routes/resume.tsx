import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import { ResumeParsePage } from "@/features/resume/components/ResumeParsePage";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";

export const Route = createFileRoute("/resume")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [
      { title: "Resume Parser & Bloom Skill Fingerprint | OpenRadix" },
      {
        name: "description",
        content:
          "Deterministic resume parsing, PII redaction, RapidFuzz evidence grounding, and 12-dimensional Bloom skill levels with verifiable audit basis.",
      },
    ],
  }),
  component: function Resume() {
    return (
      <DashboardLayout>
        <ResumeParsePage />
      </DashboardLayout>
    );
  },
});
