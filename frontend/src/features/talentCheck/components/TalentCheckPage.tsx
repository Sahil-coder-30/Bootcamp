/**
 * TalentCheckPage.tsx
 * Complete page interface for Role 4: Talent Check (Aryan Singh).
 * Implements the full flow: Candidate & Company pickers, Hero Score card,
 * Gap Bars, Skill Radar, What-If simulator, Study Plan, and 115-company rankings.
 */

import React, { useState } from "react";
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

const CANDIDATES = [
  { id: "6f1c-ananya", name: "Systems / SWE", role: "Systems / Cloud Focus" },
  { id: "6f1c-karthik", name: "Data Eng.", role: "Data Engineering Focus" },
  { id: "6f1c-priya", name: "App Support", role: "Entry Support Focus" },
  { id: "6f1c-rohan", name: "Full-Stack", role: "All-Rounder Generalist" },
];

const COMPANIES = [
  { id: 4, name: "Google LLC", tier: "High Bar (Mean 8.0)" },
  { id: 78, name: "Microsoft Corporation", tier: "High Bar (Mean 7.8)" },
  { id: 24, name: "Oracle Financial Services", tier: "Core Bar (Mean 5.7)" },
];

export const TalentCheckPage: React.FC = () => {
  const [selectedCandidate, setSelectedCandidate] = useState(CANDIDATES[0]!.id);
  const [selectedCompany, setSelectedCompany] = useState<number>(COMPANIES[0]!.id);
  const [activeTab, setActiveTab] = useState<
    "analysis" | "whatif" | "study" | "ranking" | "matrix"
  >("analysis");
  const [selectedSkillCode, setSelectedSkillCode] = useState<string | null>("SQL");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Core Hooks
  const { result, run, isLoading, error } = useTalentCheck(selectedCandidate, selectedCompany);
  const whatIf = useWhatIf(result);
  const { matrix, run: runMatrix } = useTalentMatrix([4, 78, 24]);
  const {
    ranking,
    run: runRanking,
    isLoading: isRankingLoading,
  } = useCompanyRanking(selectedCandidate);

  const candidateObj = CANDIDATES.find((c) => c.id === selectedCandidate);
  const companyObj = COMPANIES.find((c) => c.id === selectedCompany);

  return (
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
            {CANDIDATES.map((c) => (
              <button
                key={c.id}
                onClick={() => setSelectedCandidate(c.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCandidate === c.id
                    ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                <div className="text-xs font-bold leading-tight">{c.name}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{c.role}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Company Bar Selector */}
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-primary" /> Select Employer Hiring Bar
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {COMPANIES.map((comp) => (
              <button
                key={comp.id}
                onClick={() => setSelectedCompany(comp.id)}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  selectedCompany === comp.id
                    ? "bg-primary/10 border-primary/50 text-primary font-bold shadow-xs"
                    : "bg-background border-border text-muted-foreground hover:text-foreground hover:border-border-strong"
                }`}
              >
                <div className="text-xs font-bold leading-tight">{comp.name}</div>
                <div className="text-[10px] text-muted-foreground truncate mt-0.5">{comp.tier}</div>
              </button>
            ))}
          </div>
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
};
