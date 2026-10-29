import React from "react";
import { Link } from "@tanstack/react-router";
import { Building2, Sparkles, ExternalLink, ArrowRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_NAME, COLLEGE_NAME, COLLEGE_SHORT } from "@/lib/college";

interface LandingFooterProps {
  onOpenRegister: () => void;
}

export const LandingFooter: React.FC<LandingFooterProps> = ({ onOpenRegister }) => {
  return (
    <footer className="border-t border-border bg-card dark:bg-[#060608] text-muted-foreground transition-colors">
      {/* 1. Bottom High-Impact CTA Banner */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-border dark:border-orange-500/30 bg-gradient-to-b from-card via-card-sub to-muted dark:from-zinc-900/90 dark:to-[#0c0c10] p-8 sm:p-12 text-center shadow-lg dark:shadow-[0_0_50px_rgba(249,115,22,0.12)]">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-20 h-48 w-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-600 dark:text-orange-400">
            <Sparkles className="h-3.5 w-3.5 text-orange-500" />
            Institutional Career & Skill Intelligence
          </span>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-5xl">
            Ready to Benchmark Your Profile Against 115 Recruiters?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground">
            Access 115 corporate hiring bars, compare your technical competencies across Super Dream
            salary tiers, and land top campus placement offers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Link to="/login" search={{ redirect: "/dashboard" }} className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-11 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 text-xs font-bold text-white shadow-md hover:brightness-110 transition-all cursor-pointer"
              >
                <User className="mr-2 h-4 w-4 text-white" />
                Sign In & Access Candidate Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <Link to="/companies" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-11 rounded-xl border-border bg-card px-6 text-xs font-semibold text-foreground hover:bg-muted"
              >
                <Building2 className="mr-2 h-4 w-4 text-primary" />
                Browse 115 Corporate Profiles
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Links & Institutional Info */}
      <div className="border-t border-border bg-card-sub/60 dark:bg-[#08080a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand column (2 cols) */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-gradient-to-br from-card to-card-sub font-heading text-xs font-black text-foreground shadow-sm">
                  PI
                </div>
                <span className="font-heading text-base font-bold tracking-tight text-foreground">
                  {APP_NAME}
                </span>
                <span className="rounded-sm border border-orange-500/30 bg-orange-500/10 px-1 py-0.2 text-[9px] font-bold text-orange-600 dark:text-orange-400">
                  CAREERS v1.1.0
                </span>
              </div>

              <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                Enterprise talent intelligence & deterministic skill-matching engine. Bridging
                academic readiness with 115 corporate hiring bars across 1,380 normalized skill
                cutoffs.
              </p>

              <div className="space-y-1 text-xs text-muted-foreground">
                <p className="font-semibold text-foreground">
                  {COLLEGE_NAME} ({COLLEGE_SHORT})
                </p>
                <p>Department of Training & Placement</p>
                <p>C-20/1, Sector 62, Noida, Uttar Pradesh 201301</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-600 dark:text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                Deterministic Math Engine Active · Express 5 + FastAPI
              </div>
            </div>

            {/* Col 2: Modules */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Intelligence Modules
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    to="/dashboard"
                    className="text-primary font-semibold transition-colors hover:underline"
                  >
                    Candidate Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Corporate Directory (115)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/talent-check"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Talent Check Simulator
                  </Link>
                </li>
                <li>
                  <Link
                    to="/company/intelligence"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    22-Dimension Intel Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/company/skills"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    12 Bloom Topic Ladders
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Institutional Tiers */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Placement Tiers
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    to="/companies"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Super Dream (&gt; ₹10 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Dream (₹6–10 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Standard (₹4–6 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-muted-foreground transition-colors hover:text-primary"
                  >
                    Regular Foundation Drives
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Architecture & Resources */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-foreground">
                Governance & Tech
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="https://jssaten.ac.in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary"
                  >
                    JSSATEN Official Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <span className="text-muted-foreground">5-Tier Skill Cascade</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Bloom Taxonomy Rubric</span>
                </li>
                <li>
                  <span className="text-muted-foreground">Zero-Trust Citation Gate</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="mt-12 flex flex-col items-center justify-between border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} {APP_NAME} &bull; {COLLEGE_NAME}. All rights
              reserved.
            </p>
            <p className="mt-2 sm:mt-0 font-mono text-[11px] text-muted-foreground">
              Deterministic Math Engine &bull; Zero Scoring Drift
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
