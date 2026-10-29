/**
 * TalentCheckPage.tsx
 * Complete page interface for Role 4: Talent Check (Aryan Singh).
 * Implements the full flow: Candidate & Company pickers, Hero Score card,
 * Gap Bars, Skill Radar, What-If simulator, Study Plan, and 115-company rankings.
 */

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "@tanstack/react-router";
import { DashboardLayout } from "@/components/Layout/DashboardLayout";
import { getStoredUser } from "@/lib/auth";
import { listProfilesAPI } from "@/features/profile/service/profile.api";
import { useCompanies } from "@/features/companies/Hooks/companies.hooks";
import {
  useTalentCheck,
  useWhatIf,
  useTalentMatrix,
  useCompanyRanking,
} from "../Hooks/talentCheck.hooks";
import { ReadinessCard } from "./ReadinessCard";
import { GapBars } from "./GapBars";
import { SkillRadar } from "./SkillRadar";
import { WhatIfPanel } from "./WhatIfPanel";
import { StudyPlan } from "./StudyPlan";
import { NextTopicsList } from "./NextTopicsList";
import { HowComputedDrawer } from "./HowComputedDrawer";
import { CompanyRanking } from "./CompanyRanking";
import { ReadinessHeatmap } from "./ReadinessHeatmap";
import {
  User,
  Building2,
  Sliders,
  Radar as RadarIcon,
  BookOpen,
  Trophy,
  Calculator,
  RefreshCw,
  Sparkles,
} from "lucide-react";

interface CandidateOption {
  id: string;
  name: string;
  role: string;
}

export const TalentCheckPage: React.FC = () => {
  const storedUser = getStoredUser();
  const [profileList, setProfileList] = useState<CandidateOption[]>([]);
  const { data: companies = [] } = useCompanies();

  // Combine dynamic profiles with logged-in user if available
  const candidates = useMemo<CandidateOption[]>(() => {
    const list = [...profileList];
    if (storedUser?.id && !list.some((c) => c.id === storedUser.id)) {
      list.unshift({
        id: storedUser.id,
        name: storedUser.name || "My Profile",
        role: storedUser.role || "Logged-in Candidate",
      });
    }
    return list;
  }, [profileList, storedUser]);

  // Fallback candidate list if database is empty or still loading
  const displayedCandidates = useMemo<CandidateOption[]>(() => {
    if (candidates.length > 0) return candidates;
    return [
      { id: "6f1c-ananya", name: "Systems / SWE", role: "Systems / Cloud Focus" },
      { id: "6f1c-karthik", name: "Data Eng.", role: "Data Engineering Focus" },
      { id: "6f1c-priya", name: "App Support", role: "Entry Support Focus" },
      { id: "6f1c-rohan", name: "Full-Stack", role: "All-Rounder Generalist" },
    ];
  }, [candidates]);

  // Selected candidate state defaulting to logged-in user or first available real candidate
  const [selectedCandidate, setSelectedCandidate] = useState<string>(() => {
    return storedUser?.id || "6f1c-ananya";
  });

  // Selected company state defaulting to first available real company
  const [selectedCompany, setSelectedCompany] = useState<number>(() => {
    return companies.length > 0 ? companies[0]!.id : 4;
  });

  // Load real candidates dynamically from API
  useEffect(() => {
    let mounted = true;
    listProfilesAPI({ limit: 20 })
      .then((data: any) => {
        if (!mounted) return;
        const raw = Array.isArray(data) ? data : data?.items ?? [];
        const mapped: CandidateOption[] = raw.map((p: any) => ({
          id: p.id,
          name: p.name || "Candidate",
          role:
            (Array.isArray(p.preferred_roles) && p.preferred_roles[0]) ||
            p.role ||
            "Candidate Profile",
        }));
        setProfileList(mapped);
      })
      .catch((err) => {
        console.warn("Failed to load candidate profiles:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Update selectedCandidate when real candidates load
  useEffect(() => {
    if (candidates.length > 0) {
      const exists = candidates.some((c) => c.id === selectedCandidate);
      if (!exists) {
        const matchStored = storedUser?.id && candidates.find((c) => c.id === storedUser.id);
        setSelectedCandidate(matchStored ? matchStored.id : candidates[0]!.id);
      }
    }
  }, [candidates, storedUser?.id, selectedCandidate]);

  // Update selectedCompany when live companies load
  useEffect(() => {
    if (companies.length > 0) {
      const exists = companies.some((c) => c.id === selectedCompany);
      if (!exists) {
        setSelectedCompany(companies[0]!.id);
      }
    }
  }, [companies, selectedCompany]);

  // Dynamic companies for quick selector
  const displayedCompanies = useMemo(() => {
    if (companies.length === 0) {
      return [
        { id: 4, name: "Google LLC", tier: "High Bar (Mean 8.0)" },
        { id: 78, name: "Microsoft Corporation", tier: "High Bar (Mean 7.8)" },
        { id: 24, name: "Oracle Financial Services", tier: "Core Bar (Mean 5.7)" },
      ];
    }
    const top = companies.slice(0, 3).map((comp) => ({
      id: comp.id,
      name: comp.name,
      tier: comp.companyType ? `${comp.companyType} Bar` : comp.category || "Hiring Bar",
    }));
    if (selectedCompany && !top.some((c) => c.id === selectedCompany)) {
      const active = companies.find((c) => c.id === selectedCompany);
      if (active) {
        return [
          {
            id: active.id,
            name: active.name,
            tier: active.companyType ? `${active.companyType} Bar` : active.category || "Hiring Bar",
          },
          ...top.slice(0, 2),
        ];
      }
    }
    return top;
  }, [companies, selectedCompany]);

  const [activeTab, setActiveTab] = useState<
    "analysis" | "whatif" | "study" | "ranking" | "matrix"
  >("analysis");
  const [selectedSkillCode, setSelectedSkillCode] = useState<string | null>("SQL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Core Hooks
  const { result, run, isLoading, error } = useTalentCheck(selectedCandidate, selectedCompany);
  const whatIf = useWhatIf(result);

  const matrixCompanyIds = useMemo(() => {
    if (companies.length >= 3) {
      return companies.slice(0, 3).map((c) => c.id);
    }
    return [4, 78, 24];
  }, [companies]);

  const { matrix, run: runMatrix } = useTalentMatrix(matrixCompanyIds);
  const {
    ranking,
    run: runRanking,
    isLoading: isRankingLoading,
  } = useCompanyRanking(selectedCandidate);

  const candidateObj = displayedCandidates.find((c) => c.id === selectedCandidate);
  const companyObj =
    companies.find((c) => c.id === selectedCompany) ||
    displayedCompanies.find((c) => c.id === selectedCompany);

  const router = useRouter({ warn: false });

  const content = (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-8 space-y-6 selection:bg-primary selection:text-white">
      {/* Top Breadcrumb Header */}
      <div className="flex items-center justify-between border-b border-border pb-4">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </a>
          <span className="text-muted-foreground/40">/</span>
          <a
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:underline"
          >
            Dashboard
          </a>
          <span className="text-muted-foreground/40">/</span>
          <span className="text-xs font-semibold text-foreground">Talent Check</span>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/companies"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            115 Companies
          </a>
          <a
            href="/resume"
            className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Resume ATS
          </a>
        </div>
      </div>

      {/* Top Navigation & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
              TC
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
              Talent Check
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-2xl leading-relaxed">
            One-button evaluation comparing candidate profiles against employer hiring bars across
            12 RADIX skillsets with mathematical transparency.
          </p>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsDrawerOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-card-sub text-foreground border border-border shadow-xs transition-colors cursor-pointer"
          >
            <Calculator className="w-4 h-4 text-primary" />
            Audit Math &amp; Provenance
          </button>
        </div>
      </div>

      {/* Selectors Bar */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card p-4 rounded-2xl border border-border shadow-xs">
        {/* Candidate Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-primary" /> Select Candidate Profile
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {displayedCandidates.slice(0, 4).map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCandidate(c.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCandidate === c.id
                    ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                <div className="text-xs font-bold leading-tight truncate">{c.name}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{c.role}</div>
              </button>
            ))}
          </div>
          {displayedCandidates.length > 4 && (
            <select
              aria-label="Select candidate profile"
              value={selectedCandidate}
              onChange={(e) => setSelectedCandidate(e.target.value)}
              className="w-full mt-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {displayedCandidates.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.role})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Company Bar Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Select Employer Hiring Bar
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {displayedCompanies.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompany(comp.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCompany === comp.id
                    ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                <div className="text-xs font-bold leading-tight truncate">{comp.name}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{comp.tier}</div>
              </button>
            ))}
          </div>
          {companies.length > 0 && (
            <select
              aria-label="Select employer hiring bar from all companies"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(Number(e.target.value))}
              className="w-full mt-2 rounded-xl border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary cursor-pointer"
            >
              {companies.map((comp) => (
                <option key={comp.id} value={comp.id}>
                  {comp.name} {comp.companyType ? `(${comp.companyType})` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Hero Readiness Score Card */}
      {result && (
        <ReadinessCard
          score={whatIf.preview ? whatIf.preview.score : result.readiness_score}
          verdict={whatIf.preview ? whatIf.preview.verdict : result.verdict}
          blockingCount={
            whatIf.preview ? whatIf.preview.blockingCount : result.blocking_gaps.length
          }
          levelsCovered={result.levels_covered}
          levelsNeeded={result.levels_needed}
          categoriesMet={result.categories_met}
          readinessRange={result.readiness_range}
          companyName={companyObj?.name || result.company}
          candidateName={candidateObj?.name || "Candidate"}
          source={result.meta?.bar_source}
          isWhatIf={Boolean(whatIf.preview?.isModified)}
        />
      )}

      {/* Dynamic Narrative Explanation */}
      {result && (
        <div className="p-4 rounded-xl bg-card-sub border border-border text-xs sm:text-sm text-foreground leading-relaxed font-sans">
          <strong className="text-primary font-semibold mr-1.5">Executive Summary:</strong>
          {result.explanation}
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setActiveTab("analysis")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "analysis"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <RadarIcon className="w-3.5 h-3.5" /> Gaps &amp; Radar
        </button>
        <button
          onClick={() => setActiveTab("whatif")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "whatif"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-primary"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" /> What-If Simulator
        </button>
        <button
          onClick={() => setActiveTab("study")}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "study"
              ? "bg-emerald-600 text-white"
              : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" /> Fastest Path &amp; Curriculum
        </button>
        <button
          onClick={() => {
            setActiveTab("ranking");
            void runRanking();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "ranking"
              ? "bg-amber-600 text-white"
              : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
          }`}
        >
          <Trophy className="w-3.5 h-3.5" /> 115-Company Rankings
        </button>
        <button
          onClick={() => {
            setActiveTab("matrix");
            void runMatrix();
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
            activeTab === "matrix"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Compare All
        </button>
      </div>

      {/* Tab Panels */}
      {isLoading ? (
        <div className="py-24 text-center text-sm text-muted-foreground animate-pulse">
          Computing readiness against {companyObj?.name}...
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-sm text-center">
          {error}
        </div>
      ) : result ? (
        <div>
          {activeTab === "analysis" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Gap Bars */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground">
                    12 Skillset Gaps vs Hiring Bar
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    Click a row to inspect topics
                  </span>
                </div>
                <GapBars
                  rows={result.skillset_gap}
                  selectedCode={selectedSkillCode}
                  onSelectCode={(code) => setSelectedSkillCode(code)}
                />
              </div>

              {/* Right Column: Radar & Topics Preview */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-card border border-border rounded-2xl p-5 shadow-xs">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-2 text-center">
                    12-Axis Skill Radar Envelope
                  </h3>
                  <SkillRadar
                    rows={result.skillset_gap}
                    candidateName={candidateObj?.name}
                    companyName={companyObj?.name}
                  />
                </div>

                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
                    Curriculum for {selectedSkillCode || "Selected Skill"}
                  </h3>
                  <NextTopicsList rows={result.skillset_gap} selectedCode={selectedSkillCode} />
                </div>
              </div>
            </div>
          )}

          {activeTab === "whatif" && (
            <WhatIfPanel
              result={result}
              overrides={whatIf.overrides}
              previewScore={whatIf.preview ? whatIf.preview.score : result.readiness_score}
              previewVerdict={whatIf.preview ? whatIf.preview.verdict : result.verdict}
              previewBlockingCount={
                whatIf.preview ? whatIf.preview.blockingCount : result.blocking_gaps.length
              }
              onSetLevel={whatIf.setLevel}
              onReset={whatIf.reset}
              onApplyPlan={whatIf.applyPlan}
            />
          )}

          {activeTab === "study" && (
            <div className="space-y-6">
              <StudyPlan
                plan={result.study_plan}
                onApplyPlan={() => {
                  whatIf.applyPlan();
                  setActiveTab("whatif");
                }}
              />
              <div className="border-t border-border pt-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-4">
                  Full Missing Topics Curriculum
                </h3>
                <NextTopicsList rows={result.skillset_gap} />
              </div>
            </div>
          )}

          {activeTab === "ranking" && (
            <CompanyRanking
              ranking={ranking}
              isLoading={isRankingLoading}
              onSelectCompany={(compId) => {
                setSelectedCompany(compId);
                setActiveTab("analysis");
              }}
            />
          )}

          {activeTab === "matrix" && (
            <ReadinessHeatmap
              matrix={matrix}
              onSelectCell={(profId, compId) => {
                setSelectedCandidate(profId);
                setSelectedCompany(compId);
                setActiveTab("analysis");
              }}
            />
          )}
        </div>
      ) : null}

      {/* Audit & Provenance Drawer */}
      {result && (
        <HowComputedDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          result={result}
        />
      )}
    </div>
  );

  return router ? <DashboardLayout>{content}</DashboardLayout> : content;
};
