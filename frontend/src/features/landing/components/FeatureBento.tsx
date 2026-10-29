import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  GraduationCap,
  Calculator,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  CheckCircle2,
  FileCheck2,
} from "lucide-react";

export const FeatureBento: React.FC = () => {
  return (
    <section id="features" className="relative scroll-mt-20 py-16 md:py-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Layers className="h-3.5 w-3.5 text-orange-500" />
            Core Platform Architecture
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Four Pillars of Placement Intelligence
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Engineered to replace subjective resume screening with auditable mathematical standards
            calibrated directly for high-volume campus recruitment.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Corporate Intelligence (Col span 2 on lg) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] p-7 lg:col-span-2 transition-all duration-300 hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-card-sub dark:hover:bg-zinc-900/60 shadow-sm hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-inner">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                115 Companies Tracked
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-foreground sm:text-2xl group-hover:text-primary transition-colors">
                22-Dimension Corporate Placement Intelligence
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Comprehensive corporate records documenting selection workflows, online test
                patterns, detailed compensation structures (fixed base, signing bonuses, ESOP
                vesting), and interview round rubrics across global tech and fintech employers.
              </p>
            </div>

            {/* Micro Feature Tags */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-xs text-foreground/90">
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>Round-by-round stages</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>CTC & Tier Cutoffs</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>OA Platform & Format</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>Eligibility Criteria</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>Interview Focus Rubrics</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border bg-card-sub px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                <span>YoY Hiring Momentum</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/companies"
                className="inline-flex items-center text-xs font-bold text-primary hover:underline transition-colors"
              >
                Browse Company Profiles Directory
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Bloom Taxonomy Ladders (Col span 1) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] p-7 transition-all duration-300 hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-card-sub dark:hover:bg-zinc-900/60 shadow-sm hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-inner">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                12 Skill Sets
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                12-Category Bloom Ladders
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Standardized 10-level topic progressions calibrated to academic curricula. Links
                concrete coursework topics directly to corporate hiring cutoffs.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs rounded-lg border border-border bg-card-sub px-3 py-1.5">
                <span className="text-muted-foreground">Levels 1–2:</span>
                <span className="font-medium text-foreground">Conceptual Understanding</span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-border bg-card-sub px-3 py-1.5">
                <span className="text-muted-foreground">Levels 3–4:</span>
                <span className="font-medium text-emerald-600 dark:text-emerald-400">
                  Application & Code Practice
                </span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-border bg-card-sub px-3 py-1.5">
                <span className="text-muted-foreground">Levels 5–6:</span>
                <span className="font-medium text-amber-600 dark:text-amber-400">
                  System Analysis & Debugging
                </span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-border bg-card-sub px-3 py-1.5">
                <span className="text-muted-foreground">Levels 7–10:</span>
                <span className="font-medium text-orange-600 dark:text-orange-400">
                  Evaluation & Architecture
                </span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/company/skills"
                className="inline-flex items-center text-xs font-bold text-primary hover:underline transition-colors"
              >
                Inspect 10-Level Topic Ladders
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Deterministic Talent Check (Col span 1) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] p-7 transition-all duration-300 hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-card-sub dark:hover:bg-zinc-900/60 shadow-sm hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-inner">
                <Calculator className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
                0% Scoring Drift
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                Deterministic Scoring Engine
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Scores candidate readiness via pure mathematical formulas. Zero stochastic drift
                between subsequent evaluations, ensuring complete legal and compliance confidence.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-border bg-card-sub p-4 font-mono text-xs text-foreground">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                Formula Contract
              </p>
              <p className="mt-1 font-semibold text-primary">
                Readiness = 100 * &Sigma;(min(c, r) - 1) / &Sigma;(r - 1)
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                &bull; Sub-1ms mathematical computation
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-border">
              <Link
                to="/talent-check"
                className="inline-flex items-center text-xs font-bold text-primary hover:underline transition-colors"
              >
                Run Candidate Talent Check
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Anti-Hallucination & Citation Gating (Col span 2 on lg) */}
          <div className="group relative overflow-hidden rounded-3xl border border-border bg-card dark:border-zinc-800 dark:bg-[#0d0d12] p-7 lg:col-span-2 transition-all duration-300 hover:border-primary/50 dark:hover:border-orange-500/50 hover:bg-card-sub dark:hover:bg-zinc-900/60 shadow-sm hover:shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400 shadow-inner">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-foreground">
                Zero-Trust Verification
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-foreground sm:text-2xl group-hover:text-primary transition-colors">
                Anti-Hallucination & Evidence Span Verification
              </h3>
              <p className="mt-2.5 text-sm text-muted-foreground leading-relaxed">
                Candidate resumes are never blindly graded. All parsed skills require verbatim
                source quotations (`evidence`) accompanied by exact character offset bounds
                (`evidence_span`). Claims lacking authentic proof in the source document are
                automatically discarded.
              </p>
            </div>

            {/* Proof Mechanism Callout */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card-sub p-3.5 text-xs">
                <p className="font-semibold text-foreground">SHA-256 Deduplication</p>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Duplicate resumes and JDs resolve in 2ms without re-parsing expenses.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card-sub p-3.5 text-xs">
                <p className="font-semibold text-foreground">Keyword Defense</p>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Keyword stuffing awards only Level 1-2. Higher levels demand project evidence.
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card-sub p-3.5 text-xs">
                <p className="font-semibold text-foreground">Campus Seed Fallback</p>
                <p className="mt-1 text-muted-foreground text-[11px]">
                  Air-gapped seed backup ensures 100% demo uptime even if campus Wi-Fi fails.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-mono">
                Complies with Institutional Placement Governance
              </span>
              <Link
                to="/flow"
                className="inline-flex items-center text-xs font-bold text-primary hover:underline transition-colors"
              >
                Explore Guided Verification Flow
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
