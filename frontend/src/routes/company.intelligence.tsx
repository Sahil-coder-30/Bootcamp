import { createFileRoute } from "@tanstack/react-router";
import CompanyIntelligencePage from "@/features/intelligence/components/CompanyIntelligencePage";
import { COLLEGE_SHORT } from "@/lib/college";

export const Route = createFileRoute("/company/intelligence")({
  head: () => ({
    meta: [
      { title: `Company Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      {
        name: "description",
        content: "22-section research profile of the selected recruiting company.",
      },
      { property: "og:title", content: `Company Intelligence · ${COLLEGE_SHORT} Placement Hub` },
      {
        property: "og:description",
        content: "Deep research profile of a recruiting company for campus placements.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyIntelligencePage,
});
