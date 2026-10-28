import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  TrendingUp,
  FileCheck,
  CheckCircle2,
  Building2,
  Award,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { SkillHistogramCard, type SkillItem } from "./SkillHistogramCard";
import { TopCompanyMatchesCard } from "./TopCompanyMatchesCard";
import { PriorityRoadmapCard } from "./PriorityRoadmapCard";
import { JDMatcherModal } from "./JDMatcherModal";
import { ATSResumeModal } from "./ATSResumeModal";
import { getStoredUser, subscribeToAuthChanges, type CandidateUser } from "@/lib/auth";
import { useCompanies } from "@/features/companies/Hooks/companies.hooks";

export const CandidateDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => getStoredUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<SkillItem | null>(null);
  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync auth state
  useEffect(() => {
    return subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const candidateName = currentUser?.name || "Himanshu";

  // Search results from 115 companies if user types in search
  const { data: companies = [] } = useCompanies();
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return companies
      .filter((c) => c.name.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
      .slice(0, 6);
  }, [companies, searchQuery]);

  return (
    <div className="h-screen w-full flex bg-background text-foreground overflow-hidden font-sans selection:bg-primary selection:text-white">
      {/* 1. Left Sidebar Navigation - Fixed & Sticky */}
      <div className="hidden md:flex shrink-0 h-screen sticky top-0 z-40">
        <DashboardSidebar
          currentUser={currentUser}
          activeItem="dashboard"
          onOpenJDMatcher={() => setIsJDModalOpen(true)}
          onOpenATSModal={() => setIsATSModalOpen(true)}
        />
      </div>

      {/* Mobile Drawer */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="relative z-10">
            <DashboardSidebar
              currentUser={currentUser}
              activeItem="dashboard"
              onOpenJDMatcher={() => {
                setMobileSidebarOpen(false);
                setIsJDModalOpen(true);
              }}
              onOpenATSModal={() => {
                setMobileSidebarOpen(false);
                setIsATSModalOpen(true);
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Work Area - Self-contained scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <DashboardHeader
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onToggleMobileSidebar={() => setMobileSidebarOpen(true)}
        />

        {/* Search Results Dropdown Overlay (if searching) */}
        {searchResults.length > 0 && (
          <div className="mx-4 sm:mx-8 mt-2 rounded-2xl border border-border bg-card p-4 shadow-xl z-20 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-2 border-b border-border text-xs font-semibold text-muted-foreground">
              <span>Quick Matching Companies ({searchResults.length})</span>
              <button
                onClick={() => setSearchQuery("")}
                className="text-foreground font-bold hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
              {searchResults.map((c) => (
                <Link
                  key={c.id}
                  to="/companies"
                  onClick={() => setSearchQuery("")}
                  className="flex items-center justify-between p-2.5 rounded-xl border border-border bg-card-sub hover:border-primary hover:bg-muted transition-colors"
                >
                  <div className="truncate">
                    <p className="font-semibold text-xs text-foreground truncate">{c.name}</p>
                    <p className="text-[10px] text-muted-foreground">{c.category}</p>
                  </div>
                  <span className="text-[10px] font-bold text-foreground">{c.companyType}</span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Dashboard Main Content Body */}
        <main className="flex-1 px-4 sm:px-8 py-6 space-y-6 overflow-y-auto">
          {/* Greeting Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-border bg-[#f8f5ee] dark:bg-[#181512] p-5 sm:p-6 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Deterministic Placement Intelligence Hub</span>
              </div>
              <h1 className="mt-1 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {greeting}, {candidateName} 👋
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                Candidate Profile: <strong className="text-foreground">B.Tech CSE &apos;26</strong>{" "}
                · Targeting:{" "}
                <span className="text-foreground font-semibold">Super Dream & Dream Bars</span> -
                Zero LLM Drift
              </p>
            </div>

            {/* Quick Readiness Score Circular Ring Pill */}
            <div className="flex items-center gap-4 bg-card border border-border rounded-2xl px-5 py-3 shadow-xs shrink-0">
              <div className="relative h-12 w-12 flex items-center justify-center">
                <svg className="h-12 w-12 -rotate-90 transform" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    className="stroke-[#dfd6c6] dark:stroke-[#28211b]"
                    strokeWidth="3.2"
                    fill="none"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    className="stroke-primary"
                    strokeWidth="3.2"
                    strokeDasharray="94.2"
                    strokeDashoffset={94.2 * (1 - 0.78)}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <span className="absolute font-heading font-extrabold text-xs text-foreground">
                  78%
                </span>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Tier-1 Readiness
                </p>
                <p className="text-xs font-bold text-foreground">Ready for 74% Bars</p>
              </div>
            </div>
          </div>

          {/* Two-Column Bento Layout (Left Histogram + Right Option C Hybrid) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Card (5 Cols): 12-Skill Histogram */}
            <div className="lg:col-span-5 h-full lg:sticky lg:top-0">
              <SkillHistogramCard
                selectedSkillCode={selectedSkill?.code}
                onSelectSkill={(skill) => setSelectedSkill(skill)}
              />
            </div>

            {/* Right Side (7 Cols): Split Hybrid (Option C) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Top Half: Top Recruiter Hiring Bar Matches */}
              <TopCompanyMatchesCard />

              {/* Bottom Half: Priority Study Roadmap */}
              <PriorityRoadmapCard />
            </div>
          </div>
        </main>
      </div>

      {/* Global Modals for JD Matcher & ATS Resume */}
      <JDMatcherModal isOpen={isJDModalOpen} onClose={() => setIsJDModalOpen(false)} />
      <ATSResumeModal isOpen={isATSModalOpen} onClose={() => setIsATSModalOpen(false)} />
    </div>
  );
};

export default CandidateDashboard;
