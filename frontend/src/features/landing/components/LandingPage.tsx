import React, { useState } from "react";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { LockedFeatureBanner } from "./LockedFeatureBanner";
import { JobSkillComparator } from "./JobSkillComparator";
import { HowItWorks } from "./HowItWorks";
import { PlacementTiers } from "./PlacementTiers";
import { FeatureBento } from "./FeatureBento";
import { FaqSection } from "./FaqSection";
import { LandingFooter } from "./LandingFooter";
import { AuthModal, type CandidateUser } from "./AuthModal";

export const LandingPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => {
    try {
      const stored = localStorage.getItem("placeintel_user");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register" | "demo">("register");

  const handleUserChange = (user: CandidateUser | null) => {
    setCurrentUser(user);
    if (user) {
      try {
        localStorage.setItem("placeintel_user", JSON.stringify(user));
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem("placeintel_user");
      } catch {
        // ignore
      }
    }
  };

  const openAuthWithTab = (tab: "login" | "register" | "demo") => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-zinc-100 selection:bg-orange-500 selection:text-zinc-950 font-sans">
      {/* 1. Clean Navigation Bar (Institutional bar removed) */}
      <LandingHeader currentUser={currentUser} onUserChange={handleUserChange} />

      {/* Main Flow: Crisp, Professional & Uncluttered */}
      <main>
        {/* 2. Compact, Professional Hero (Search box removed) */}
        <HeroSection
          onOpenRegister={() => openAuthWithTab("register")}
          onOpenLogin={() => openAuthWithTab("login")}
          isLoggedIn={!!currentUser}
        />

        {/* 3. Company Data & Skill Section: Crisp Banner for public, Unlocked for authenticated */}
        <LockedFeatureBanner currentUser={currentUser} onOpenAuth={() => openAuthWithTab("demo")} />

        {/* If logged in, show the interactive comparator */}
        {currentUser && (
          <JobSkillComparator
            currentUser={currentUser}
            onOpenAuth={() => openAuthWithTab("demo")}
          />
        )}

        {/* 4. How It Works (3 Clean Steps) */}
        <HowItWorks onOpenRegister={() => openAuthWithTab("register")} />

        {/* 5. Salary & Placement Tiers */}
        <PlacementTiers />

        {/* 6. Four Core Architecture Pillars */}
        <FeatureBento />

        {/* 7. FAQ Accordion */}
        <FaqSection />
      </main>

      {/* 8. Conversion Banner & Clean Footer */}
      <LandingFooter onOpenRegister={() => openAuthWithTab("register")} />

      {/* Global Auth Modal for candidate registration & login */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authInitialTab}
        onLoginSuccess={(user) => {
          handleUserChange(user);
        }}
      />
    </div>
  );
};

export default LandingPage;
