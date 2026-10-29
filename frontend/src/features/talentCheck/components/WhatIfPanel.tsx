/**
 * WhatIfPanel.tsx
 * Interactive simulation sandbox allowing instant level adjustments (<1ms recalculation).
 * Features 12 responsive range sliders, live score deltas, and fastest-path snapping.
 */

import React from "react";
import { RotateCcw, Sparkles, Save, Sliders, ArrowUpRight } from "lucide-react";
import type { GapRow, TalentCheckResult } from "../service/talentCheck.api";
import { bloomFor } from "../lib/readiness";

interface WhatIfPanelProps {
  result: TalentCheckResult;
  overrides: Record<string, number>;
  previewScore: number;
  previewVerdict: "ready" | "almost" | "not_yet";
  previewBlockingCount: number;
  onSetLevel: (code: string, level: number) => void;
  onReset: () => void;
  onApplyPlan: () => void;
  onSave?: () => void;
}

export const WhatIfPanel: React.FC<WhatIfPanelProps> = ({
  result,
  overrides,
  previewScore,
  previewVerdict,
  previewBlockingCount,
  onSetLevel,
  onReset,
  onApplyPlan,
  onSave,
}) => {
  const isModified = Object.keys(overrides).length > 0;
  const scoreDiff = previewScore - result.readiness_score;

  return (
    <div className="bg-card border border-border rounded-2xl p-4 sm:p-6 shadow-xs overflow-hidden max-w-full">
      {/* Simulation Header & Live Score Preview Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-border mb-5 sm:mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary shrink-0" />
            <h3 className="text-base font-bold text-foreground truncate">What-If Simulation Sandbox</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Drag sliders to model skill progression. Recalculates in under 1 ms with zero latency.
          </p>
        </div>

        {/* Live Simulation Score Card */}
        <div className="flex items-center justify-between sm:justify-start gap-4 bg-card-sub px-4 py-2 rounded-xl border border-border shadow-2xs w-full sm:w-auto shrink-0">
          <div className="text-left sm:text-right">
            <div className="text-[11px] text-muted-foreground uppercase font-medium">
              Simulated Score
            </div>
            <div className="flex items-center gap-1.5 sm:justify-end">
              <span className="text-2xl font-black font-mono text-foreground">{previewScore}</span>
              {scoreDiff !== 0 && (
                <span
                  className={`text-xs font-mono font-bold flex items-center ${
                    scoreDiff > 0
                      ? "text-emerald-700 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  <ArrowUpRight className={`w-3.5 h-3.5 ${scoreDiff < 0 ? "rotate-90" : ""}`} />
                  {scoreDiff > 0 ? `+${scoreDiff}` : scoreDiff}
                </span>
              )}
            </div>
          </div>

          <div className="h-8 w-px bg-border" />

          <div>
            <div className="text-[11px] text-muted-foreground uppercase font-medium">Verdict</div>
            <div
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-0.5 ${
                previewVerdict === "ready"
                  ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40"
                  : previewVerdict === "almost"
                    ? "bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/40"
                    : "bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/40"
              }`}
            >
              {previewVerdict.replace("_", " ")}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-5 sm:mb-6">
        <button
          onClick={onApplyPlan}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-primary-foreground shrink-0" />
          Apply Fastest Path to Ready
        </button>

        {isModified && (
          <button
            onClick={onReset}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-muted text-foreground transition-colors cursor-pointer border border-border"
          >
            <RotateCcw className="w-3.5 h-3.5 shrink-0" />
            Reset
          </button>
        )}

        {isModified && onSave && (
          <button
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer sm:ml-auto shadow-xs"
          >
            <Save className="w-3.5 h-3.5 shrink-0" />
            Save as My Level
          </button>
        )}
      </div>

      {/* 12 Skill Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {(result.skillset_gap || []).map((row) => {
          const currentVal =
            typeof overrides[row.category_code] === "number"
              ? overrides[row.category_code]!
              : row.candidate_level;
          const isRowModified = overrides[row.category_code] !== undefined;
          const currentBloom = bloomFor(currentVal);

          return (
            <div
              key={row.category_code}
              className={`p-3 sm:p-3.5 rounded-xl border transition-all min-w-0 overflow-hidden ${
                isRowModified ? "bg-card border-primary/50 shadow-xs" : "bg-card border-border"
              }`}
            >
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="font-mono font-bold text-xs text-foreground truncate">
                    {row.category_code}
                  </span>
                  {isRowModified && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                </div>

                <div className="text-xs font-mono shrink-0">
                  <span className="text-foreground font-bold">L{currentVal}</span>{" "}
                  <span className="text-muted-foreground">({currentBloom})</span>{" "}
                  <span className="text-muted-foreground">/ Bar L{row.required_level}</span>
                </div>
              </div>

              {/* Slider Input */}
              <div className="w-full px-0.5">
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={currentVal}
                  onChange={(e) => onSetLevel(row.category_code, Number(e.target.value))}
                  className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary block"
                />
              </div>

              <div className="flex justify-between text-[10px] text-muted-foreground font-mono mt-1 px-0.5">
                <span>1</span>
                <span>Bar: {row.required_level}</span>
                <span>10</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
