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
    <section
      id="features"
      className="relative scroll-mt-20 py-16 md:py-24 border-t border-zinc-800/80"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        {/* Section Heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <Layers className="h-3.5 w-3.5 text-orange-400" />
            Core Platform Architecture
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            Four Pillars of Placement Intelligence
          </h2>
          <p className="mt-3 text-sm text-zinc-400 sm:text-base">
            Engineered to replace subjective resume screening with auditable mathematical standards
            calibrated directly for high-volume campus recruitment.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Corporate Intelligence (Col span 2 on lg) */}
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 lg:col-span-2 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/60 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-inner">
                <Building2 className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                115 Companies Tracked
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-white sm:text-2xl group-hover:text-orange-400 transition-colors">
                22-Dimension Corporate Placement Intelligence
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Comprehensive corporate records documenting selection workflows, online test
                patterns, detailed compensation structures (fixed base, signing bonuses, ESOP
                vesting), and interview round rubrics across global tech and fintech employers.
              </p>
            </div>

            {/* Micro Feature Tags */}
            <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 text-xs text-zinc-300">
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>Round-by-round stages</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>CTC & Tier Cutoffs</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>OA Platform & Format</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>Eligibility Criteria</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>Interview Focus Rubrics</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-orange-400 shrink-0" />
                <span>YoY Hiring Momentum</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/70">
              <Link
                to="/companies"
                className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Browse Company Profiles Directory
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 2: Bloom Taxonomy Ladders (Col span 1) */}
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/60 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-inner">
                <GraduationCap className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                12 Skill Sets
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                12-Category Bloom Ladders
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Standardized 10-level topic progressions calibrated to academic curricula. Links
                concrete coursework topics directly to corporate hiring cutoffs.
              </p>
            </div>

            <div className="mt-6 space-y-2">
              <div className="flex items-center justify-between text-xs rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
                <span className="text-zinc-400">Levels 1–2:</span>
                <span className="font-medium text-zinc-200">Conceptual Understanding</span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
                <span className="text-zinc-400">Levels 3–4:</span>
                <span className="font-medium text-emerald-400">Application & Code Practice</span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
                <span className="text-zinc-400">Levels 5–6:</span>
                <span className="font-medium text-amber-400">System Analysis & Debugging</span>
              </div>
              <div className="flex items-center justify-between text-xs rounded-lg border border-zinc-800/70 bg-zinc-900/40 px-3 py-1.5">
                <span className="text-zinc-400">Levels 7–10:</span>
                <span className="font-medium text-orange-400">Evaluation & Architecture</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/70">
              <Link
                to="/company/skills"
                className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Inspect 10-Level Topic Ladders
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Deterministic Talent Check (Col span 1) */}
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/60 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-inner">
                <Calculator className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-400">
                0% Scoring Drift
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-white group-hover:text-orange-400 transition-colors">
                Deterministic Scoring Engine
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Scores candidate readiness via pure mathematical formulas. Zero stochastic drift
                between subsequent evaluations, ensuring complete legal and compliance confidence.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-4 font-mono text-xs text-zinc-300">
              <p className="text-[11px] text-zinc-500 uppercase tracking-wider">Formula Contract</p>
              <p className="mt-1 font-semibold text-orange-400">
                Readiness = 100 * &Sigma;(min(c, r) - 1) / &Sigma;(r - 1)
              </p>
              <p className="mt-2 text-[11px] text-zinc-400">
                &bull; Sub-1ms mathematical computation
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/70">
              <Link
                to="/talent-check"
                className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Run Candidate Talent Check
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Anti-Hallucination & Citation Gating (Col span 2 on lg) */}
          <div className="group relative overflow-hidden rounded-3xl border border-zinc-800 bg-[#0d0d12] p-7 lg:col-span-2 transition-all duration-300 hover:border-orange-500/50 hover:bg-zinc-900/60 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-400 shadow-inner">
                <FileCheck2 className="h-5 w-5" />
              </div>
              <span className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs font-semibold text-zinc-300">
                Zero-Trust Verification
              </span>
            </div>

            <div className="mt-6">
              <h3 className="font-heading text-xl font-bold text-white sm:text-2xl group-hover:text-orange-400 transition-colors">
                Anti-Hallucination & Evidence Span Verification
              </h3>
              <p className="mt-2.5 text-sm text-zinc-400 leading-relaxed">
                Candidate resumes are never blindly graded. All parsed skills require verbatim
                source quotations (`evidence`) accompanied by exact character offset bounds
                (`evidence_span`). Claims lacking authentic proof in the source document are
                automatically discarded.
              </p>
            </div>

            {/* Proof Mechanism Callout */}
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 text-xs">
                <p className="font-semibold text-white">SHA-256 Deduplication</p>
                <p className="mt-1 text-zinc-400 text-[11px]">
                  Duplicate resumes and JDs resolve in 2ms without re-parsing expenses.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 text-xs">
                <p className="font-semibold text-white">Keyword Defense</p>
                <p className="mt-1 text-zinc-400 text-[11px]">
                  Keyword stuffing awards only Level 1-2. Higher levels demand project evidence.
                </p>
              </div>

              <div className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 text-xs">
                <p className="font-semibold text-white">Campus Seed Fallback</p>
                <p className="mt-1 text-zinc-400 text-[11px]">
                  Air-gapped seed backup ensures 100% demo uptime even if campus Wi-Fi fails.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800/70 flex items-center justify-between">
              <span className="text-xs text-zinc-500 font-mono">
                Complies with Institutional Placement Governance
              </span>
              <a
                href="#cascade"
                className="inline-flex items-center text-xs font-bold text-orange-400 hover:text-orange-300 transition-colors"
              >
                Explore 5-Tier Cascade Mechanics
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
