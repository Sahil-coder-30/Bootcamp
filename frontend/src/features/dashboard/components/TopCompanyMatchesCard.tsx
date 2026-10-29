import React from "react";
import { Link } from "@tanstack/react-router";
import {
  Trophy,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CompanyMatchItem {
  id: number;
  name: string;
  tier: "Super Dream" | "Dream" | "Standard";
  packageLPA: string;
  matchScore: number;
  verdict: "ready" | "almost" | "gap";
  gapCategory?: string | undefined;
}

export interface TopCompanyMatchesCardProps {
  matches?: CompanyMatchItem[] | undefined;
  loading?: boolean | undefined;
}

export const TopCompanyMatchesCard: React.FC<TopCompanyMatchesCardProps> = ({
  matches = [],
  loading = false,
}) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
            <Trophy className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">Hiring Bar Matches</h3>
            <p className="text-xs text-muted-foreground">
              Live Ranking via AST Talent Check Engine
            </p>
          </div>
        </div>

        <Link
          to="/companies"
          className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
        >
          All 115 Recruiter Bars <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* Recruiter Matches List */}
      <div className="mt-3.5 space-y-2.5">
        {loading && matches.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Evaluating candidate profile against 115 corporate bars...</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <Building2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p>No matching corporate bars yet. Complete your profile skills to unlock rankings.</p>
          </div>
        ) : (
          matches.map((company) => {
            return (
              <div
                key={company.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-border bg-card-sub p-3 transition-all hover:border-primary/60"
              >
                {/* Left Identity */}
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted font-heading text-xs font-bold text-foreground shadow-2xs">
                    {company.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading text-xs font-bold text-foreground group-hover:text-primary transition-colors">
                        {company.name}
                      </h4>
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          company.tier === "Super Dream"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20"
                            : company.tier === "Dream"
                              ? "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20"
                              : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
                        )}
                      >
                        {company.tier}
                      </span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-semibold text-foreground">{company.packageLPA}</span>
                      {company.gapCategory && (
                        <>
                          <span>•</span>
                          <span className="text-amber-500 dark:text-amber-400 font-medium truncate max-w-[150px]">
                            Focus: {company.gapCategory}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Score & Verdict */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-border/50">
                  <div className="text-right">
                    <div className="font-heading text-sm font-extrabold text-foreground">
                      {company.matchScore}%
                    </div>
                    <span className="text-[10px] text-muted-foreground">Hiring Bar Match</span>
                  </div>

                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border",
                      company.verdict === "ready"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : company.verdict === "almost"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-500 dark:text-amber-400"
                          : "border-red-500/30 bg-red-500/10 text-red-500",
                    )}
                  >
                    {company.verdict === "ready" ? (
                      <>
                        <CheckCircle2 className="h-3 w-3" /> Ready
                      </>
                    ) : company.verdict === "almost" ? (
                      <>
                        <AlertTriangle className="h-3 w-3" /> Almost
                      </>
                    ) : (
                      "Skill Gap"
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
