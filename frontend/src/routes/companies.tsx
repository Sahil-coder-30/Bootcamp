import { createFileRoute } from "@tanstack/react-router";
import { requireSignIn } from "@/lib/requireSignIn";
import CompanyPickerPage from "@/features/companies/components/CompanyPickerPage";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import DashboardLayout from "@/components/Layout/DashboardLayout";

export const Route = createFileRoute("/companies")({
  beforeLoad: ({ location }) => {
    requireSignIn(location);
  },
  head: () => ({
    meta: [
      { title: `Companies Directory | ${APP_NAME} | ${COLLEGE_SHORT}` },
      {
        name: "description",
        content:
          "Browse 115 recruiting companies, evaluate salary tiers, and review skill ladders for campus placements at JSS Academy of Technical Education.",
      },
      {
        property: "og:title",
        content: `Companies Directory | ${APP_NAME} | ${COLLEGE_SHORT}`,
      },
    ],
  }),
  component: function CompaniesRoute() {
    return (
      <DashboardLayout>
        <CompanyPickerPage />
      </DashboardLayout>
    );
  },
});
