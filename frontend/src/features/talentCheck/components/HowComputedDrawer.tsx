/**
 * HowComputedDrawer.tsx
 * Slide-over drawer providing a transparent mathematical audit trail of the readiness score.
 * Explains point weights, non-compensatory blocking rules, and raw staging data provenance.
 */

import React from "react";
import { X, Calculator, Database, AlertTriangle, ShieldCheck } from "lucide-react";
import type { TalentCheckResult } from "../service/talentCheck.api";

interface HowComputedDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  result: TalentCheckResult;
}

export const HowComputedDrawer: React.FC<HowComputedDrawerProps> = ({
  isOpen,
  onClose,
  result,
}) => {
  if (!isOpen) return null;

  const needed = result.levels_needed || 84;
  const covered = result.levels_covered || 55;
  const pointsPerLevel = needed > 0 ? (100 / needed).toFixed(2) : "0";

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-fade-in">
      {/* Drawer Container */}
      <div className="w-full max-w-xl h-full bg-card border-l border-border p-6 overflow-y-auto flex flex-col justify-between shadow-2xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <Calculator className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">How This Was Computed</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Formula Card */}
          <div className="bg-card-sub rounded-xl p-4 border border-border space-y-3 font-mono text-xs">
            <div className="text-muted-foreground font-sans font-medium uppercase tracking-wider text-[11px]">
              Canonical Readiness Formula (tc-1.0)
            </div>
            <div className="p-3 bg-card rounded-lg text-emerald-700 dark:text-emerald-400 border border-border font-semibold overflow-x-auto">
              readiness = 100 * sum(covered) / sum(needed)
            </div>
            <div className="text-muted-foreground font-sans text-xs leading-relaxed">
              Readiness is the share of the company's skill ladder climbed above floor Level 1. For{" "}
              {result.company}:
            </div>
            <div className="p-2.5 bg-card rounded border border-border text-foreground">
              100 * ({covered} covered / {needed} needed) = {((100 * covered) / needed).toFixed(2)}%
              →{" "}
              <strong className="text-foreground font-bold">{result.readiness_score} / 100</strong>
            </div>
            <div className="text-muted-foreground font-sans text-[11px]">
              Each missing level costs exactly{" "}
              <strong className="text-primary">{pointsPerLevel} points</strong>.
            </div>
          </div>

          {/* Non-Compensatory Gate */}
          <div className="bg-card-sub rounded-xl p-4 border border-border space-y-2 text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Non-Compensatory Hiring Gate</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Real engineering interview loops are non-compensatory: a hole 3 or more levels short
              (a full Bloom cognitive band away) fails interview rounds regardless of average score.
              A candidate requires a score of <strong>80+</strong> with{" "}
              <strong>zero blocking categories</strong> to achieve a <strong>Ready</strong> verdict.
            </p>
          </div>

          {/* Data Quality & Provenance Story */}
          <div className="bg-card-sub rounded-xl p-4 border border-border space-y-2 text-xs">
            <div className="flex items-center gap-2 text-primary font-semibold">
              <Database className="w-4 h-4" />
              <span>Data Provenance & Mismatch Handling</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Company bar loaded from:{" "}
              <strong className="text-foreground uppercase">
                {result.meta?.bar_source || "db"}
              </strong>
              .
            </p>
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-800 dark:text-amber-300 text-[11px] leading-relaxed">
              <strong className="flex items-center gap-1.5 mb-1 text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> Data Quality Audit:
              </strong>
              51% (698 of 1,380) of rows in RADIX's database had Bloom code discrepancies (e.g.
              Google Coding stored as '8-CR', while Level 8 is Evaluation 'EV'). Role 4 treats the
              numeric required level as the source of truth, derives the Bloom code dynamically, and
              preserves the raw code below for audit compliance.
            </div>
          </div>

          {/* 12 Skill Breakdown Table */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              12 Skill Breakdown & Raw Audit
            </h4>
            <div className="no-scrollbar overflow-x-auto border border-border rounded-xl">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-card-sub text-muted-foreground border-b border-border">
                  <tr>
                    <th className="p-2.5">Skill</th>
                    <th className="p-2.5">Cand</th>
                    <th className="p-2.5">Req</th>
                    <th className="p-2.5">Gap</th>
                    <th className="p-2.5">Weight</th>
                    <th className="p-2.5">Raw Staging</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border bg-card">
                  {result.skillset_gap.map((g) => (
                    <tr key={g.category_code} className="hover:bg-muted/50">
                      <td className="p-2.5 font-bold text-foreground">{g.category_code}</td>
                      <td className="p-2.5 text-muted-foreground">L{g.candidate_level}</td>
                      <td className="p-2.5 text-primary">
                        L{g.required_level} ({g.required_bloom})
                      </td>
                      <td className="p-2.5">
                        {g.gap ? (
                          <span
                            className={
                              g.blocking
                                ? "text-rose-600 dark:text-rose-400 font-bold"
                                : "text-amber-600 dark:text-amber-400"
                            }
                          >
                            -{g.shortfall} {g.blocking ? "(Block)" : ""}
                          </span>
                        ) : (
                          <span className="text-emerald-700 dark:text-emerald-400">0</span>
                        )}
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {(g.weight * 100).toFixed(1)}%
                      </td>
                      <td className="p-2.5 text-muted-foreground">
                        {g.raw_bloom_code ? `${g.required_level}-${g.raw_bloom_code}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-border mt-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs transition-colors cursor-pointer shadow-xs"
          >
            Close Audit Trail
          </button>
        </div>
      </div>
    </div>
  );
};
