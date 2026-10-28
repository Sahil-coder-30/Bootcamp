import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import LandingPage from "@/features/landing/components/LandingPage";
import CompanyPickerPage from "@/features/companies/components/CompanyPickerPage";
import { APP_NAME, COLLEGE_SHORT } from "@/lib/college";

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
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    try {
      return Boolean(localStorage.getItem("placeintel_user"));
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const handleAuthChange = () => {
      try {
        setIsLoggedIn(Boolean(localStorage.getItem("placeintel_user")));
      } catch {
        setIsLoggedIn(false);
      }
    };

    window.addEventListener("placeintel_auth_change", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);
    return () => {
      window.removeEventListener("placeintel_auth_change", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, []);

  // Option B: If logged in, show the original 115-Company Picker Page directly.
  // If logged out, show the clean, crisp, professional Landing Page.
  if (isLoggedIn) {
    return <CompanyPickerPage />;
  }

  return <LandingPage />;
}
