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
import { getStoredUser, subscribeToAuthChanges, formatNameFromEmail, type CandidateUser } from "@/lib/auth";
import { useAuth } from "@/features/auth/Hooks/auth.hooks";
import { useCompanies } from "@/features/companies/Hooks/companies.hooks";
import { useDashboard } from "../Hooks/dashboard.hooks";
import { useResume } from "@/features/resume/Hooks/resume.hooks";
import { ResumeUploadCard } from "@/features/resume/components/ResumeUploadCard";

export const CandidateDashboard: React.FC = () => {
  const { user: authUser } = useAuth();
  const [currentUser, setCurrentUser] = useState<CandidateUser | null>(() => getStoredUser());
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Sync auth state
  useEffect(() => {
    return subscribeToAuthChanges((user) => {
      setCurrentUser(user);
    });
  }, []);

  // Compute effective user: prioritize logged in user (or Google auth user)
  const effectiveUser = useMemo(() => {
    if (currentUser?.email) {
      return currentUser;
    }
    if (authUser?.email) {
      const name = authUser.name || formatNameFromEmail(authUser.email);
      const initials = name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "CU";
      return {
        id: authUser.candidateProfileId || authUser.id,
        name,
        role: authUser.branch ? `${authUser.branch} (${authUser.college || "Campus"})` : (currentUser?.role || "Campus Candidate '26"),
        avatarText: initials,
        email: authUser.email,
      };
    }
    return currentUser;
  }, [currentUser, authUser]);

  const candidateId = effectiveUser?.id || "";

  // Hook-driven architecture: consume live dashboard API + Dexie caching + Redux modals
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
    isJDModalOpen,
    isATSModalOpen,
    openJDModal,
    closeJDModal,
    openATSModal,
    closeATSModal,
  } = useDashboard(candidateId, {
    name: effectiveUser?.name,
    email: effectiveUser?.email,
    role: effectiveUser?.role,
  });

  const { uploadAndParse, isLoading: isResumeParsing } = useResume();

  const handleDashboardUpload = async (file: File) => {
    await uploadAndParse(file);
    setTimeout(() => {
      void refresh();
    }, 600);
  };

  // Time-aware greeting
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  const candidateName = effectiveUser?.name || summary?.candidateName || "Candidate";
  const candidateEmail = effectiveUser?.email || summary?.email || "";
  const candidateRole = effectiveUser?.role || "Campus Candidate '26";
  const educationText =
    summary?.education &&
    summary.education !== "B.Tech CSE, XYZ Institute of Technology, 2026, 8.7 CGPA"
      ? summary.education
      : (candidateRole || "B.Tech CSE, Campus Placement Cohort '26");
  const targetRoles =
    summary?.preferredRoles && summary.preferredRoles.length > 0
      ? summary.preferredRoles.join(" · ")
      : "Software Engineer · Systems Architect";

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
          currentUser={effectiveUser}
          activeItem="dashboard"
          onOpenJDMatcher={openJDModal}
          onOpenATSModal={openATSModal}
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
              currentUser={effectiveUser}
              activeItem="dashboard"
              onOpenJDMatcher={() => {
                setMobileSidebarOpen(false);
                openJDModal();
              }}
              onOpenATSModal={() => {
                setMobileSidebarOpen(false);
                openATSModal();
              }}
            />
          </div>
        </div>
      )}

      {/* 2. Main Work Area - Self-contained scroll */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header */}
        <DashboardHeader
          currentUser={effectiveUser}
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
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground flex flex-wrap items-center gap-1.5">
                <span>Profile:</span>
                {candidateEmail && (
                  <span className="font-semibold text-primary">{candidateEmail}</span>
                )}
                {candidateEmail && <span>•</span>}
                <strong className="text-foreground font-semibold">{educationText}</strong>
                <span>•</span>
                <span>Roles:</span>
                <span className="text-foreground font-semibold">{targetRoles}</span>
              </p>
            </div>

            {/* Quick Readiness Score Circular Ring Card */}
            {summary?.hasData ? (
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
                    {summary.targetCompany.name}: {summary.readinessScore}%
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {summary?.readinessRange
                      ? `Range: ${summary.readinessRange.low}% – ${summary.readinessRange.high}%`
                      : "Confidence Interval"}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 bg-card-sub border border-amber-500/30 rounded-2xl px-5 py-3.5 shadow-xs shrink-0">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 shrink-0">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <p className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">
                    Placement Status
                  </p>
                  <p className="text-xs font-bold text-foreground">
                    Awaiting Resume
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    Upload resume to evaluate
                  </p>
                </div>
              </div>
            )}
          </div>

          {!summary?.hasData && !isDashboardLoading ? (
            <div className="space-y-6">
              {/* Onboarding State: No Resume Uploaded Yet */}
              <div className="rounded-3xl border border-dashed border-primary/40 bg-card p-6 sm:p-8 shadow-xs space-y-6 relative overflow-hidden">
                <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
                  <div className="space-y-1">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary">
                      <Sparkles className="h-3 w-3" /> Get Started
                    </div>
                    <h2 className="font-heading text-xl sm:text-2xl font-bold text-foreground">
                      No Resume Uploaded Yet
                    </h2>
                    <p className="text-xs text-muted-foreground max-w-xl leading-relaxed">
                      There is currently no placement intelligence data for your account. Upload your resume to extract your 12-axis Bloom skill fingerprint, benchmark yourself against 115 corporate hiring bars, and generate a customized study plan.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/resume"
                      className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors shadow-xs"
                    >
                      Open Full Resume Parser <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Dropzone right on Dashboard */}
                <div className="relative z-10">
                  <ResumeUploadCard
                    onFileUpload={handleDashboardUpload}
                    isLoading={isResumeParsing}
                    currentCandidateName={candidateName}
                  />
                </div>

                {/* Three preview benefit cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 relative z-10">
                  <div className="rounded-2xl border border-border bg-card-sub p-4 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">1. 12-Axis Skill Taxonomy</p>
                    <p className="text-[11px] text-muted-foreground">
                      Deterministic Bloom level extraction across DSA, Systems, Cloud, Database, and Core CS.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card-sub p-4 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">2. 115 Corporate Hiring Bars</p>
                    <p className="text-[11px] text-muted-foreground">
                      Real-time gap evaluation against Super Dream (34-42 LPA), Dream, and Standard recruiter bars.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border bg-card-sub p-4 space-y-1.5">
                    <p className="text-xs font-bold text-foreground">3. Step-by-Step Study Plan</p>
                    <p className="text-[11px] text-muted-foreground">
                      Tailored topic ladders and study hours designed to bridge your critical recruiter gaps.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
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
                      {summary?.completeness ?? 0}
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
                      {summary?.categoriesMet ?? 0}
                    </span>
                    <span className="text-sm font-semibold text-muted-foreground">/ 12 Categories</span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2.5 border-t border-border/60 text-muted-foreground">
                    <span className="text-[11px] truncate">
                      <strong className="text-foreground">
                        {summary?.levelsCovered ?? 0}
                      </strong>{" "}
                      of{" "}
                      <strong className="text-foreground">{summary?.levelsNeeded ?? 72}</strong>{" "}
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
                      {summary ? `${summary.readinessScore}% Match` : "0% Match"}
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
            </>
          )}
        </main>
      </div>

      {/* Global Modals for JD Matcher & ATS Resume */}
      <JDMatcherModal isOpen={isJDModalOpen} onClose={closeJDModal} />
      <ATSResumeModal isOpen={isATSModalOpen} onClose={closeATSModal} />
    </div>
  );
};

export default CandidateDashboard;
