/**
 * CompanyRanking.tsx
 * "Which companies am I ready for?" leaderboard across all 115 RADIX companies.
 * Supports instant search, verdict filtering, and 1-click evaluation loading.
 */

import React, { useState, useMemo } from "react";
import {
  Trophy,
  Search,
  Building2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
} from "lucide-react";
import type { RankRow } from "../service/talentCheck.api";

interface CompanyRankingProps {
  ranking?: RankRow[] | undefined;
  isLoading?: boolean | undefined;
  onSelectCompany?: ((companyId: number) => void) | undefined;
}

export const CompanyRanking: React.FC<CompanyRankingProps> = ({
  ranking = [],
  isLoading = false,
  onSelectCompany,
}) => {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "ready" | "almost" | "not_yet">("all");

  const filtered = useMemo(() => {
    return ranking.filter((row) => {
      const matchSearch = row.company_name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === "all" || row.verdict === filter;
      return matchSearch && matchFilter;
    });
  }, [ranking, search, filter]);

  const readyCount = ranking.filter((r) => r.verdict === "ready").length;
  const almostCount = ranking.filter((r) => r.verdict === "almost").length;
  const notYetCount = ranking.filter((r) => r.verdict === "not_yet").length;

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h3 className="text-base font-bold text-foreground">Which Companies Am I Ready For?</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Instant readiness ranking across all 115 RADIX employers.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <button
          onClick={() => setFilter("all")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
            filter === "all"
              ? "bg-primary text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          All ({ranking.length})
        </button>
        <button
          onClick={() => setFilter("ready")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === "ready"
              ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30"
              : "text-muted-foreground hover:text-emerald-600 dark:hover:text-emerald-400"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" /> Ready ({readyCount})
        </button>
        <button
          onClick={() => setFilter("almost")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === "almost"
              ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30"
              : "text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" /> Almost ({almostCount})
        </button>
        <button
          onClick={() => setFilter("not_yet")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
            filter === "not_yet"
              ? "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30"
              : "text-muted-foreground hover:text-rose-600 dark:hover:text-rose-400"
          }`}
        >
          <XCircle className="w-3.5 h-3.5" /> Needs Prep ({notYetCount})
        </button>
      </div>

      {/* Leaderboard List */}
      {isLoading ? (
        <div className="py-12 text-center text-sm text-muted-foreground animate-pulse">
          Computing rankings across all 115 companies...
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-xs text-muted-foreground">
          No matching companies found.
        </div>
      ) : (
        <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
          {filtered.map((row, idx) => {
            const isReady = row.verdict === "ready";
            const isAlmost = row.verdict === "almost";

            const badgeStyle = isReady
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
              : isAlmost
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30"
                : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30";

            return (
              <div
                key={row.company_id}
                onClick={() => onSelectCompany?.(row.company_id)}
                className="group flex items-center justify-between p-3.5 rounded-xl bg-card hover:bg-card-sub border border-border hover:border-primary/40 transition-all cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 text-center text-xs font-mono font-bold text-muted-foreground group-hover:text-foreground">
                    #{idx + 1}
                  </span>
                  <div className="w-8 h-8 rounded-lg bg-card-sub border border-border flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                      {row.company_name}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-base font-black font-mono text-foreground">
                      {row.readiness_score}
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider border ${badgeStyle}`}
                  >
                    {row.verdict.replace("_", " ")}
                  </span>

                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
