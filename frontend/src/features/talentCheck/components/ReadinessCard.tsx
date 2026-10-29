/**
 * ReadinessCard.tsx
 * Hero visual displaying readiness score, verdict badge, confidence range, and key stats.
 * Uses tokens and styles according to .agents/design-system and ui-ux-pro-max.
 */

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, ShieldCheck, Zap } from "lucide-react";

interface ReadinessCardProps {
  score: number;
  verdict: "ready" | "almost" | "not_yet";
  blockingCount: number;
  levelsCovered?: number | undefined;
  levelsNeeded?: number | undefined;
  categoriesMet?: number | undefined;
  readinessRange?: { low: number; high: number } | null | undefined;
  companyName: string;
  candidateName: string;
  source?: string | undefined;
  isWhatIf?: boolean | undefined;
}

export const ReadinessCard: React.FC<ReadinessCardProps> = ({
  score,
  verdict,
  blockingCount,
  levelsCovered,
  levelsNeeded,
  categoriesMet,
  readinessRange,
  companyName,
  candidateName,
  source = "db",
  isWhatIf = false,
}) => {
  const verdictConfigMap = {
    ready: {
      label: "Ready for Role",
      badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.15)",
      icon: CheckCircle2,
      desc: "Meets or exceeds 80% of expected bar with no critical band gaps.",
    },
    almost: {
      label: "Almost Ready",
      badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
      glowColor: "rgba(245, 158, 11, 0.15)",
      icon: AlertTriangle,
      desc:
        blockingCount > 0
          ? `Score reaches threshold, but held back by ${blockingCount} critical gap${blockingCount > 1 ? "s" : ""}.`
          : "Close to bar (60-79%). Minor curriculum study recommended.",
    },
    not_yet: {
      label: "Needs Preparation",
      badgeClass: "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
      glowColor: "rgba(239, 68, 68, 0.15)",
      icon: XCircle,
      desc: "Significant preparation required across multiple foundational skill areas.",
    },
  };

  const verdictConfig = verdictConfigMap[verdict] || verdictConfigMap.not_yet;
  const Icon = verdictConfig.icon;

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-6 sm:p-8 backdrop-blur-md transition-all duration-300 border border-border bg-card shadow-xs"
      style={{
        boxShadow: `0 8px 32px -4px ${verdictConfig.glowColor}`,
      }}
    >
      {/* Top Banner Tags */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground font-medium">
            Readiness Evaluation
          </span>
          {isWhatIf && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30 animate-pulse">
              <Zap className="w-3 h-3" /> Live What-If Preview
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {source === "snapshot" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-card-sub text-muted-foreground border border-border">
              Offline Snapshot
            </span>
          )}
          <span className="text-[11px] font-mono text-muted-foreground">tc-1.0</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Score & Verdict */}
        <div className="lg:col-span-6 flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
          <div className="relative flex items-center justify-center shrink-0">
            {/* Circular score container */}
            <div
              className="w-28 h-28 rounded-full flex flex-col items-center justify-center border-2 bg-card-sub dark:bg-card shrink-0"
              style={{
                borderColor:
                  verdict === "ready"
                    ? "var(--color-success, #10B981)"
                    : verdict === "almost"
                      ? "var(--color-bloom-as, #F59E0B)"
                      : "var(--color-destructive, #EF4444)",
                boxShadow: `0 0 24px -2px ${verdictConfig.glowColor}`,
              }}
            >
              <span className="text-4xl sm:text-5xl font-black tracking-tight text-foreground font-mono">
                {score}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
                / 100
              </span>
            </div>
          </div>

          <div className="space-y-2 flex-1 min-w-0">
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs sm:text-sm font-semibold border ${verdictConfig.badgeClass}`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{verdictConfig.label}</span>
            </div>

            <p className="text-sm text-muted-foreground leading-snug max-w-sm mx-auto sm:mx-0">
              {verdictConfig.desc}
            </p>

            {readinessRange && (
              <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-muted-foreground font-mono pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <span>Confidence Range:</span>
                <span className="text-foreground font-semibold">
                  {readinessRange.low} - {readinessRange.high}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-3 gap-3 border-t lg:border-t-0 lg:border-l border-border pt-4 lg:pt-0 lg:pl-6">
          <div className="bg-card-sub rounded-xl p-3 border border-border min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Levels Covered</div>
            <div className="text-lg font-bold text-foreground font-mono">
              {levelsCovered ?? "-"}{" "}
              <span className="text-xs text-muted-foreground font-normal">
                / {levelsNeeded ?? "-"}
              </span>
            </div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5 font-medium">
              {levelsNeeded
                ? `${Math.round(((levelsCovered || 0) / levelsNeeded) * 100)}% climbed`
                : ""}
            </div>
          </div>

          <div className="bg-card-sub rounded-xl p-3 border border-border min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Categories Met</div>
            <div className="text-lg font-bold text-foreground font-mono">
              {categoriesMet ?? "-"}{" "}
              <span className="text-xs text-muted-foreground font-normal">/ 12</span>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">At or above bar</div>
          </div>

          <div className="bg-card-sub rounded-xl p-3 border border-border min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Blocking Gaps</div>
            <div
              className={`text-lg font-bold font-mono ${
                blockingCount > 0
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {blockingCount}
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              {blockingCount > 0 ? "Shortfall ≥ 3" : "None detected"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
