import { createFileRoute, redirect } from "@tanstack/react-router";
import LandingPage from "@/features/landing/components/LandingPage";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { isSignedIn } from "@/lib/authStorage";
import { getStoredUser } from "@/lib/auth";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (isSignedIn() || getStoredUser()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence & Benchmarking` },
      {
        name: "description",
        content:
          "Institutional placement intelligence, company hiring bars, CTC tiers, Bloom skill ladders, and deterministic ATS evaluation for campus careers.",
      },
      {
        property: "og:title",
        content: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence Hub`,
      },
      {
        property: "og:description",
        content: "Campus placement analytics, recruiter salary tiers, and skill matching.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
