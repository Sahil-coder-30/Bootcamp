import React, { useState, useEffect, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Sparkles,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  Trophy,
  Clock,
  AlertCircle,
  RefreshCw,
  Building2,
} from "lucide-react";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { SkillHistogramCard } from "./SkillHistogramCard";
import { TopCompanyMatchesCard } from "./TopCompanyMatchesCard";
import { PriorityRoadmapCard } from "./PriorityRoadmapCard";
import { JDMatcherModal } from "./JDMatcherModal";
import { ATSResumeModal } from "./ATSResumeModal";
import { getStoredUser, subscribeToAuthChanges, type CandidateUser } from "@/lib/auth";
import { useCompanies } from "@/features/companies/Hooks/companies.hooks";
import { useDashboard } from "../Hooks/dashboard.hooks";

export const CandidateDashboard: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => getStoredUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [isJDModalOpen, setIsJDModalOpen] = useState(false);
  const [isATSModalOpen, setIsATSModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Default candidate UUID (Ananya Rao)
  const candidateId = currentUser?.id || "3a000000-0000-4000-8000-000000000001";

  // Hook-driven architecture: consume live dashboard API + Dexie caching
  const {
    summary,
    readinessScore,
    topMatches,
    skills,
    selectedSkill,
    selectSkill,
    toggleStep,
    loading: isDashboardLoading,
    error: dashboardError,
    refresh,
  } = useDashboard(candidateId);

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

  const candidateName = summary?.candidateName || currentUser?.name || "Ananya Rao";
  const educationText =
    summary?.education || "B.Tech CSE, XYZ Institute of Technology, 2026, 8.7 CGPA";
  const targetRoles =
    summary?.preferredRoles && summary.preferredRoles.length > 0
      ? summary.preferredRoles.join(" · ")
      : "Super Dream & Dream Placement Bars";

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
      {/* 1. Left Sidebar Navigation */}
      <div className="hidden md:block shrink-0">
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
          {/* Error Banner if any */}
          {dashboardError && (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-500">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>Notice: {dashboardError}. Displaying cached snapshot.</span>
              </div>
              <button
                onClick={refresh}
                className="inline-flex items-center gap-1 font-bold hover:underline cursor-pointer"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          )}

          {/* Greeting Banner */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 rounded-3xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-semibold tracking-wider uppercase text-primary">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                <span>Campus Placement Intelligence Platform</span>
                <span className="text-muted-foreground">•</span>
                <span className="font-mono text-muted-foreground">AST Calibrated</span>
              </div>
              <h1 className="mt-2.5 font-heading text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {greeting}, {candidateName} 👋
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                Profile: <strong className="text-foreground">{educationText}</strong> · Roles:{" "}
                <span className="text-foreground font-semibold">{targetRoles}</span>
              </p>
            </div>

            {/* Quick Readiness Score Circular Ring Card */}
            <div className="flex items-center gap-4 bg-card-sub border border-border rounded-2xl px-5 py-3.5 shadow-xs shrink-0">
              <div className="relative h-14 w-14 flex flex-col items-center justify-center">
                <svg className="h-14 w-14 -rotate-90 transform" viewBox="0 0 36 36">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    className="stroke-border"
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
                    strokeDashoffset={94.2 * (1 - readinessScore / 100)}
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="font-heading font-extrabold text-xs text-foreground leading-none">
                    {readinessScore}%
                  </span>
                  <span className="text-[7px] font-bold uppercase tracking-wider text-primary leading-tight">
                    AST
                  </span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                  Target Readiness
                </p>
                <p className="text-xs font-bold text-foreground">
                  {summary
                    ? `${summary.targetCompany.name}: ${summary.readinessScore}%`
                    : "Evaluating..."}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {summary?.readinessRange
                    ? `Range: ${summary.readinessRange.low}% – ${summary.readinessRange.high}%`
                    : "Confidence Interval"}
                </p>
              </div>
            </div>
          </div>

          {/* 3 Metric Cards Row (Live Backend Data) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Metric 1: RADIX Profile Completeness & AST Verification */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between min-h-[148px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  PROFILE COMPLETENESS
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <Trophy className="h-3 w-3" /> Top 5% Cohort
                </span>
              </div>
              <div className="my-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
                  {summary ? summary.completeness : 90}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">%</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/60 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-[11px]">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                  AST Verified Profile
                </span>
                <Link to="/profile" className="text-xs text-primary font-semibold hover:underline">
                  Edit Profile
                </Link>
              </div>
            </div>

            {/* Metric 2: Corporate Hiring Bars Met */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between min-h-[148px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  HIRING BARS MET
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  <TrendingUp className="h-3 w-3" />{" "}
                  {summary?.targetCompany.verdict === "ready" ? "Ready" : "Almost"}
                </span>
              </div>
              <div className="my-2.5 flex items-baseline gap-1.5">
                <span className="font-heading text-3xl font-extrabold text-foreground tracking-tight">
                  {summary ? summary.categoriesMet : 1}
                </span>
                <span className="text-sm font-semibold text-muted-foreground">/ 12 Categories</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/60 text-muted-foreground">
                <span className="text-[11px] truncate">
                  <strong className="text-foreground">
                    {summary ? summary.levelsCovered : 52}
                  </strong>{" "}
                  of{" "}
                  <strong className="text-foreground">{summary ? summary.levelsNeeded : 84}</strong>{" "}
                  Levels
                </span>
                <span className="text-[11px] font-semibold text-primary truncate max-w-[120px]">
                  {summary?.targetCompany.name || "Google LLC"}
                </span>
              </div>
            </div>

            {/* Metric 3: Target Enterprise Recruiter */}
            <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between min-h-[148px]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  TARGET RECRUITER LOCK
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary font-mono">
                  <Clock className="h-3 w-3" /> Active Benchmark
                </span>
              </div>
              <div className="my-2.5 flex items-baseline justify-between gap-2">
                <span className="font-heading text-2xl font-extrabold text-foreground tracking-tight truncate flex-1">
                  {summary?.targetCompany.name || "Google LLC"}
                </span>
                <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-xs font-bold">
                  {summary ? `${summary.readinessScore}% Match` : "62%"}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/60 text-muted-foreground">
                <span className="inline-flex items-center gap-1.5 text-[11px] truncate">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  {summary
                    ? `${summary.studyPlan.totalSteps} Study Steps (${summary.studyPlan.totalHours}h)`
                    : "Analyzing..."}
                </span>
                <Link
                  to="/companies"
                  className="rounded-md border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary hover:bg-primary/20 transition-colors shrink-0"
                >
                  Change
                </Link>
              </div>
            </div>
          </div>

          {/* Two-Column Bento Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
            {/* Left Card (5 Cols on xl): 12-Skill Histogram */}
            <div className="xl:col-span-5 w-full">
              <SkillHistogramCard
                skills={summary?.skills || skills}
                selectedSkillCode={selectedSkill?.code}
                onSelectSkill={(skill) => selectSkill(skill)}
                targetCompanyName={summary?.targetCompany.name}
                loading={isDashboardLoading}
              />
            </div>

            {/* Right Side (7 Cols on xl): Split Hybrid */}
            <div className="xl:col-span-7 space-y-6 w-full">
              {/* Top Half: Top Recruiter Hiring Bar Matches */}
              <TopCompanyMatchesCard
                matches={summary?.topMatches || topMatches}
                loading={isDashboardLoading}
              />

              {/* Bottom Half: Priority Study Roadmap */}
              <PriorityRoadmapCard
                studyPlan={summary?.studyPlan}
                onToggleStep={toggleStep}
                loading={isDashboardLoading}
              />
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
