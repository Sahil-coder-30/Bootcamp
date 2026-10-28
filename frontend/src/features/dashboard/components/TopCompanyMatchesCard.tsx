import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Building2,
  Trophy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanyMatchItem {
  id: number;
  name: string;
  tier: "Super Dream" | "Dream" | "Standard";
  packageLPA: string;
  matchScore: number; // 0-100%
  verdict: "ready" | "almost" | "gap";
  gapCategory?: string;
}

const TOP_MATCHES: CompanyMatchItem[] = [
  {
    id: 4,
    name: "Google LLC",
    tier: "Super Dream",
    packageLPA: "34 - 42 LPA",
    matchScore: 84,
    verdict: "ready",
  },
  {
    id: 78,
    name: "Microsoft",
    tier: "Super Dream",
    packageLPA: "44 - 51 LPA",
    matchScore: 78,
    verdict: "almost",
    gapCategory: "SysDesign (L3 vs L4)",
  },
  {
    id: 12,
    name: "Goldman Sachs",
    tier: "Super Dream",
    packageLPA: "28 - 32 LPA",
    matchScore: 81,
    verdict: "ready",
  },
  {
    id: 19,
    name: "Adobe Systems",
    tier: "Super Dream",
    packageLPA: "40 LPA",
    matchScore: 72,
    verdict: "almost",
    gapCategory: "Concurrency",
  },
];

export const TopCompanyMatchesCard: React.FC = () => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Top Recruiter Hiring Bar Matches
            </h3>
            <p className="text-xs text-muted-foreground">
              Automated ranking across 115 corporate bars
            </p>
          </div>
        </div>

        <Link
          to="/companies"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          All 115 Companies <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Recruiter Matches List */}
      <div className="mt-3.5 space-y-2.5">
        {TOP_MATCHES.map((company) => {
          return (
            <div
              key={company.id}
              className="group flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 rounded-xl border border-border bg-card-sub p-3 transition-all hover:border-primary/60"
            >
              {/* Left Identity */}
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-heading text-xs font-bold text-foreground shadow-2xs">
                  {company.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{company.name}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-bold bg-[#4a154b] dark:bg-[#4a183d] text-white dark:text-[#f0d5eb] border border-[#3d113e] dark:border-[#5c234d]">
                      {company.tier}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                    <span>{company.packageLPA}</span>
                    {company.gapCategory && (
                      <>
                        <span>•</span>
                        <span className="text-foreground font-mono text-[10px]">
                          Gap: {company.gapCategory}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Score & Simulator CTA */}
              <div className="flex items-center gap-3 ml-auto sm:ml-0">
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1 font-heading text-sm font-bold text-foreground">
                    {company.verdict === "ready" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    )}
                    <span>{company.matchScore}%</span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] font-semibold capitalize",
                      company.verdict === "ready"
                        ? "text-emerald-700 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {company.verdict === "ready" ? "Eligible Bar" : "Near Threshold"}
                  </span>
                </div>

                <Link
                  to="/talent-check"
                  className="rounded-lg border border-border bg-card px-2.5 py-1.5 text-[11px] font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer shadow-2xs"
                >
                  Simulate
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
