import React from "react";
import type { ScoreBreakdown, MatchBand } from "../service/skillMatch.api";

interface Props {
  score: number;
  band: MatchBand;
  breakdown: ScoreBreakdown;
  roleName?: string | undefined;
  companyName?: string | undefined;
}

export const MatchScoreCard: React.FC<Props> = ({
  score,
  band,
  breakdown,
  roleName = "Software Engineer",
  companyName = "Target Role",
}) => {
  const bandBadgeColor =
    band === "strong"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
      : band === "good"
        ? "bg-blue-500/10 text-blue-400 border-blue-500/30"
        : "bg-amber-500/10 text-amber-400 border-amber-500/30";

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-lg backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-lg font-semibold text-white">Match Fit Score</h3>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${bandBadgeColor}`}
            >
              {band} fit
            </span>
          </div>
          <p className="text-xs text-zinc-400 mt-0.5">
            Evaluated against <span className="text-zinc-200">{roleName}</span> · {companyName}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="font-heading text-4xl font-extrabold tracking-tight text-white">
            {score}
          </span>
          <span className="text-sm font-medium text-zinc-400">/ 100</span>
        </div>
      </div>

      {breakdown.cap_reason && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-300">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
            Score Cap
          </span>
          <p>{breakdown.cap_reason}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-zinc-800/80 pt-4">
        <div className="rounded-lg bg-zinc-950/40 p-3 border border-zinc-800/50">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Must-haves (60%)</span>
            <span className="font-semibold text-white">
              {Math.round(breakdown.must_coverage * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.must_coverage * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-zinc-950/40 p-3 border border-zinc-800/50">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Nice-to-haves (20%)</span>
            <span className="font-semibold text-white">
              {Math.round(breakdown.nice_coverage * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.nice_coverage * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-zinc-950/40 p-3 border border-zinc-800/50">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span>Level Fit (20%)</span>
            <span className="font-semibold text-white">
              {Math.round(breakdown.level_fit * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.level_fit * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
