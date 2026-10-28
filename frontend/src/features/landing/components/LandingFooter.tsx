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
    <footer className="border-t border-zinc-800 bg-[#060608] text-zinc-400">
      {/* 1. Bottom High-Impact CTA Banner */}
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="relative overflow-hidden rounded-3xl border border-orange-500/30 bg-gradient-to-b from-zinc-900/90 to-[#0c0c10] p-8 sm:p-12 text-center shadow-[0_0_50px_rgba(249,115,22,0.12)]">
          <div className="absolute top-0 right-1/2 translate-x-1/2 -mt-20 h-48 w-96 rounded-full bg-orange-500/10 blur-3xl pointer-events-none" />

          <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/30 bg-orange-500/10 px-3.5 py-1 text-xs font-semibold text-orange-400">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Institutional Career & Skill Intelligence
          </span>

          <h2 className="mt-4 font-heading text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            Ready to Benchmark Your Profile Against 115 Recruiters?
          </h2>

          <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-zinc-400">
            Access 115 corporate hiring bars, compare your technical competencies across Super Dream
            salary tiers, and land top campus placement offers.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
            <Button
              size="lg"
              onClick={onOpenRegister}
              className="w-full sm:w-auto h-11 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 text-xs font-bold text-zinc-950 shadow-[0_0_20px_rgba(249,115,22,0.3)] hover:brightness-110 transition-all cursor-pointer"
            >
              <User className="mr-2 h-4 w-4 text-zinc-950" />
              Create Free Candidate Profile
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Link to="/companies" className="w-full sm:w-auto">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto h-11 rounded-xl border-zinc-700 bg-zinc-900/80 px-6 text-xs font-semibold text-zinc-200 hover:border-orange-500/50 hover:bg-zinc-800 hover:text-white"
              >
                <Building2 className="mr-2 h-4 w-4 text-orange-400" />
                Browse 115 Corporate Profiles
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Footer Links & Institutional Info */}
      <div className="border-t border-zinc-800/80 bg-[#08080a] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4 lg:grid-cols-5">
            {/* Brand column (2 cols) */}
            <div className="space-y-4 md:col-span-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-orange-500/30 bg-gradient-to-br from-zinc-900 to-black font-heading text-xs font-black text-white shadow-sm">
                  PI
                </div>
                <span className="font-heading text-base font-bold tracking-tight text-white">
                  {APP_NAME}
                </span>
                <span className="rounded-sm border border-orange-500/30 bg-orange-500/10 px-1 py-0.2 text-[9px] font-bold text-orange-400">
                  CAREERS v1.1.0
                </span>
              </div>

              <p className="max-w-sm text-xs leading-relaxed text-zinc-400">
                Enterprise talent intelligence & deterministic skill-matching engine. Bridging
                academic readiness with 115 corporate hiring bars across 1,380 normalized skill
                cutoffs.
              </p>

              <div className="space-y-1 text-xs text-zinc-400">
                <p className="font-semibold text-zinc-300">
                  {COLLEGE_NAME} ({COLLEGE_SHORT})
                </p>
                <p>Department of Training & Placement</p>
                <p>C-20/1, Sector 62, Noida, Uttar Pradesh 201301</p>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full border border-orange-500/30 bg-orange-500/10 px-3 py-1 text-[11px] font-medium text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-400 animate-pulse" />
                Deterministic Math Engine Active · Express 5 + FastAPI
              </div>
            </div>

            {/* Col 2: Modules */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white">
                Intelligence Modules
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    to="/companies"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Corporate Directory (115)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/talent-check"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Talent Check Simulator
                  </Link>
                </li>
                <li>
                  <Link
                    to="/company/intelligence"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    22-Dimension Intel Profile
                  </Link>
                </li>
                <li>
                  <Link
                    to="/company/skills"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    12 Bloom Topic Ladders
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 3: Institutional Tiers */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white">
                Placement Tiers
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <Link
                    to="/companies"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Super Dream (&gt; ₹10 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Dream (₹6–10 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Standard (₹4–6 LPA)
                  </Link>
                </li>
                <li>
                  <Link
                    to="/companies"
                    className="text-zinc-400 transition-colors hover:text-orange-400"
                  >
                    Regular Foundation Drives
                  </Link>
                </li>
              </ul>
            </div>

            {/* Col 4: Architecture & Resources */}
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-white">
                Governance & Tech
              </p>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="https://jssaten.ac.in"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-zinc-400 hover:text-orange-400"
                  >
                    JSSATEN Official Portal
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>
                  <span className="text-zinc-400">5-Tier Skill Cascade</span>
                </li>
                <li>
                  <span className="text-zinc-400">Bloom Taxonomy Rubric</span>
                </li>
                <li>
                  <span className="text-zinc-400">Zero-Trust Citation Gate</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Copyright */}
          <div className="mt-12 flex flex-col items-center justify-between border-t border-zinc-800/80 pt-6 text-xs text-zinc-400 sm:flex-row">
            <p>
              &copy; {new Date().getFullYear()} {APP_NAME} &bull; {COLLEGE_NAME}. All rights
              reserved.
            </p>
            <p className="mt-2 sm:mt-0 font-mono text-[11px] text-zinc-400">
              Deterministic Math Engine &bull; Zero Scoring Drift
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};
