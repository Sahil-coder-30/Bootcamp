import { createFileRoute } from "@tanstack/react-router";
import SkillIntelligencePage from "@/features/skills/components/SkillIntelligencePage";
import { COLLEGE_SHORT } from "@/lib/college";

export const Route = createFileRoute("/company/skills")({
  head: () => ({
    meta: [
      { title: `Skill Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      {
        name: "description",
        content: "Skills a recruiting company expects, with Bloom levels and a 10-step roadmap.",
      },
      { property: "og:title", content: `Skill Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      {
        property: "og:description",
        content: "Required skills, criticality and learning roadmaps for campus placements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SkillIntelligencePage,
});
