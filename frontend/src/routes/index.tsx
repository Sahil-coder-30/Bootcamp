import { createFileRoute } from "@tanstack/react-router";
import CompanyPickerPage from "@/features/companies/components/CompanyPickerPage";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence Portal` },
      {
        name: "description",
        content:
          "Browse recruiting companies, evaluate salary tiers, and review skill ladders for campus placements at JSS Academy of Technical Education.",
      },
      {
        property: "og:title",
        content: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence Portal`,
      },
      {
        property: "og:description",
        content: "Executive career intelligence and placement benchmarking.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CompanyPickerPage,
});
