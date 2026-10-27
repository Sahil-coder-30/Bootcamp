/**
 * GapBars.tsx
 * 12-row comparative visualization displaying Candidate Level vs Required Level,
 * Bloom band tags, shortfall deltas, and blocking alert badges.
 */

import React from "react";
import type { GapRow } from "../service/talentCheck.api";
import { AlertCircle, Check } from "lucide-react";

interface GapBarsProps {
  rows: GapRow[];
  selectedCode?: string | null;
  onSelectCode?: (code: string) => void;
}

const BLOOM_COLORS: Record<string, string> = {
  CU: "#60A5FA", // Blue 400
  AP: "#34D399", // Emerald 400
  AS: "#FBBF24", // Amber 400
  EV: "#F97316", // Orange 500
  CR: "#EC4899", // Pink 500
};

export const GapBars: React.FC<GapBarsProps> = ({
  rows,
  selectedCode,
  onSelectCode,
}) => {
  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const isSelected = selectedCode === row.category_code;
        const candPercent = (row.candidate_level / 10) * 100;
        const reqPercent = (row.required_level / 10) * 100;
        const candBloomColor = BLOOM_COLORS[row.candidate_bloom] || "#94A3B8";

        return (
          <div
            key={row.category_code}
            onClick={() => onSelectCode?.(row.category_code)}
            className={`group rounded-xl p-3.5 transition-all cursor-pointer border ${
              isSelected
                ? "bg-slate-900/90 border-blue-500/50 shadow-lg shadow-blue-500/10"
                : "bg-slate-900/40 hover:bg-slate-900/70 border-slate-800/60 hover:border-slate-700"
            }`}
          >
            {/* Header: Code, Title, Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-12 text-center text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-200 border border-slate-700">
                  {row.category_code}
                </span>
                <span className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors">
                  {row.category_code}
                </span>

                {row.blocking && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide uppercase bg-rose-500/20 text-rose-400 border border-rose-500/40 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Blocking
                  </span>
                )}
              </div>

              {/* Levels & Bloom Badges */}
              <div className="flex items-center gap-3 text-xs">
                <span className="text-slate-400">
                  Candidate:{" "}
                  <strong className="text-slate-200 font-mono">
                    L{row.candidate_level} ({row.candidate_bloom})
                  </strong>
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-400">
                  Required:{" "}
                  <strong className="text-blue-400 font-mono">
                    L{row.required_level} ({row.required_bloom})
                  </strong>
                </span>

                {row.gap ? (
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                    -{row.shortfall}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    <Check className="w-3 h-3" /> Met
                  </span>
                )}
              </div>
            </div>

            {/* Dual-Marked Visual Progress Bar */}
            <div className="relative w-full h-3.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
              {/* Shortfall hatched gap zone if candidate < required */}
              {row.gap && (
                <div
                  className="absolute top-0 bottom-0 bg-rose-500/10 border-l border-rose-500/30"
                  style={{
                    left: `${candPercent}%`,
                    width: `${reqPercent - candPercent}%`,
                  }}
                />
              )}

              {/* Filled Candidate Level */}
              <div
                className="h-full rounded-full transition-all duration-300 relative"
                style={{
                  width: `${candPercent}%`,
                  backgroundColor: row.gap ? "#3B82F6" : "#10B981",
                  boxShadow: `0 0 10px ${row.gap ? "rgba(59, 130, 246, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
                }}
              />

              {/* Target Marker Tick Line (Required Level) */}
              <div
                className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10"
                style={{
                  left: `calc(${reqPercent}% - 2px)`,
                  backgroundColor: "#FFFFFF",
                }}
                title={`Bar: Level ${row.required_level}`}
              />
            </div>

            {/* Footnote details */}
            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1.5 font-mono">
              <span>Weight: {(row.weight * 100).toFixed(1)}%</span>
              {row.points_lost > 0 && (
                <span className="text-rose-400/90 font-medium">
                  Cost: -{row.points_lost} pts
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
