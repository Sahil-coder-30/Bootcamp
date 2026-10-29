import React, { useEffect, useState } from "react";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { LockedFeatureBanner } from "./LockedFeatureBanner";
import { HowItWorks } from "./HowItWorks";
import { PlacementTiers } from "./PlacementTiers";
import { FeatureBento } from "./FeatureBento";
import { FaqSection } from "./FaqSection";
import { LandingFooter } from "./LandingFooter";
import { AuthModal } from "./AuthModal";
import {
  type CandidateUser,
  getStoredUser,
  saveStoredUser,
  clearStoredUser,
  subscribeToAuthChanges,
} from "@/lib/auth";

export const LandingPage: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => getStoredUser());
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authInitialTab, setAuthInitialTab] = useState<"login" | "register" | "demo">("register");

  useEffect(() => {
    return subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
  }, []);

  const handleUserChange = (user: CandidateUser | null) => {
    if (user) {
      saveStoredUser(user);
    } else {
      clearStoredUser();
    }
  };

  const openAuthWithTab = (tab: "login" | "register" | "demo") => {
    setAuthInitialTab(tab);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans transition-colors duration-200">
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
