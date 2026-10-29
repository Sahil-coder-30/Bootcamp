import React from "react";
import { Link } from "@tanstack/react-router";
import { GraduationCap, Briefcase, CheckCircle2, Sparkles, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PersonaSplitProps {
  onOpenRegister: () => void;
}

export const PersonaSplit: React.FC<PersonaSplitProps> = ({ onOpenRegister }) => {
  return (
    <section className="relative py-16 md:py-24 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <GraduationCap className="h-3.5 w-3.5 text-orange-500" />
            Tailored For Campus Career Success
          </div>
          <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
            Built for Students, Placement Cells & Recruiters
          </h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Providing transparent cutoffs for candidates while giving placement officers actionable
            cohort benchmarks.
          </p>
        </div>

        {/* 2-Column Split Cards */}
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Persona 1: Students */}
          <div className="rounded-3xl border border-border bg-card p-8 backdrop-blur-md transition-all duration-300 hover:border-orange-500/50 hover:bg-card-sub shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-500/30 bg-orange-500/10 text-orange-600 dark:text-orange-400">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                  Target Candidate
                </span>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  For Students & Job Aspirants
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Eliminate placement anxiety and guesswork. Know the exact interview pipeline, test
              formats, and target skill benchmarks before the recruitment drive commences.
            </p>

            <div className="mt-6 space-y-3 text-xs text-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Targeted Study Ladders:</strong> See which topics yield Bloom Level 7+ for
                  Super Dream tiers instead of practicing generic problems.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Interactive What-If Simulation:</strong> Test how upgrading a specific
                  skill boosts your readiness score across 115 corporate targets.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Selection Workflow Previews:</strong> Round-by-round breakdown of online
                  tests, technical interviews, and behavioral rounds.
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <button
                onClick={onOpenRegister}
                className="w-full h-10 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold hover:brightness-110 shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 text-xs"
              >
                <Sparkles className="h-4 w-4" />
                Create Candidate Profile & Start Matching
              </button>
            </div>
          </div>

          {/* Persona 2: Placement Officers & Recruiters */}
          <div className="rounded-3xl border border-border bg-card p-8 backdrop-blur-md transition-all duration-300 hover:border-orange-500/50 hover:bg-card-sub shadow-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border bg-card-sub text-foreground">
                <Briefcase className="h-6 w-6 text-foreground" />
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Institutional Governance
                </span>
                <h3 className="font-heading text-xl font-bold text-foreground">
                  For Placement Officers & Faculty
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Equip your Training & Placement Department with standardized corporate benchmarks.
              Measure cohort readiness months in advance and tailor bootcamps with empirical data.
            </p>

            <div className="mt-6 space-y-3 text-xs text-foreground">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Zero LLM Scoring Drift:</strong> Ensure fair, legally compliant
                  evaluations backed by reproducible deterministic mathematical formulas.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Data-Driven Bootcamp Design:</strong> Identify cohort-wide shortfalls in
                  System Architecture or Cloud Computing before recruiters arrive.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <span>
                  <strong>Air-Gapped Offline Resilience:</strong> Continuous demo and assessment
                  availability during campus Wi-Fi disruptions via bundled seed snapshots.
                </span>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border">
              <Link to="/companies" className="block w-full">
                <Button
                  variant="outline"
                  className="w-full h-10 rounded-xl border-border bg-card-sub text-foreground font-semibold hover:border-orange-500/60 hover:bg-orange-500/10"
                >
                  <BarChart3 className="mr-2 h-4 w-4 text-orange-500" />
                  Explore Corporate Hiring Bars
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
