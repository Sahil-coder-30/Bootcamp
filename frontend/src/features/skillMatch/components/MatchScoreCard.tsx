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
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
      : band === "good"
        ? "bg-primary/10 text-primary border-primary/30"
        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";

  const bandBorderColor =
    band === "strong"
      ? "border-emerald-500 shadow-[0_0_20px_-2px_rgba(16,185,129,0.2)]"
      : band === "good"
        ? "border-primary shadow-[0_0_20px_-2px_rgba(249,115,22,0.2)]"
        : "border-amber-500 shadow-[0_0_20px_-2px_rgba(245,158,11,0.2)]";

  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
      <div className="flex flex-col sm:flex-row items-center sm:justify-between gap-5 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div
            className={`w-24 h-24 sm:w-26 sm:h-26 rounded-full flex flex-col items-center justify-center border-2 bg-card-sub shrink-0 transition-transform ${bandBorderColor}`}
          >
            <span className="font-heading text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {score}
            </span>
            <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
              / 100
            </span>
          </div>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="font-heading text-lg font-semibold text-foreground">Match Fit Score</h3>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${bandBadgeColor}`}
              >
                {band} fit
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Evaluated against <span className="text-foreground font-medium">{roleName}</span> ·{" "}
              {companyName}
            </p>
          </div>
        </div>
      </div>

      {breakdown.cap_reason && (
        <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-amber-700 dark:text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded shrink-0">
            Score Cap
          </span>
          <p className="break-words">{breakdown.cap_reason}</p>
        </div>
      )}

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-border pt-4">
        <div className="rounded-lg bg-card-sub p-3 border border-border w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Must-haves (60%)</span>
            <span className="font-semibold text-foreground">
              {Math.round(breakdown.must_coverage * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.must_coverage * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-card-sub p-3 border border-border w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Nice-to-haves (20%)</span>
            <span className="font-semibold text-foreground">
              {Math.round(breakdown.nice_coverage * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${Math.min(100, breakdown.nice_coverage * 100)}%` }}
            />
          </div>
        </div>

        <div className="rounded-lg bg-card-sub p-3 border border-border w-full">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Level Fit (20%)</span>
            <span className="font-semibold text-foreground">
              {Math.round(breakdown.level_fit * 100)}%
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
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
