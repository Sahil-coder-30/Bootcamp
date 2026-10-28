import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import LandingPage from "@/features/landing/components/LandingPage";
import CandidateDashboard from "@/features/dashboard/components/CandidateDashboard";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";
import { getStoredUser, subscribeToAuthChanges } from "@/lib/auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence & Deterministic Skill Match`,
      },
      {
        name: "description",
        content:
          "Enterprise campus placement intelligence & deterministic talent match engine. Benchmark candidate readiness against 115 corporate hiring bars in under 280ms.",
      },
      {
        property: "og:title",
        content: `${APP_NAME} | ${COLLEGE_SHORT} Placement Intelligence & Deterministic Skill Match`,
      },
      {
        property: "og:description",
        content:
          "Deterministic skill matching against 115 corporate bars with zero LLM scoring drift.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootIndexComponent,
});

function RootIndexComponent() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => Boolean(getStoredUser()));

  useEffect(() => {
    return subscribeToAuthChanges((user) => {
      setIsLoggedIn(Boolean(user));
    });
  }, []);

  // Post-login UI: Shows the personalized Candidate Intelligence Dashboard (Option C)
  // When logged out: Shows the high-impact institutional Landing Page
  if (isLoggedIn) {
    return <CandidateDashboard />;
  }

  return <LandingPage />;
}
