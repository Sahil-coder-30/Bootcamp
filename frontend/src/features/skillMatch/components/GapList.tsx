import React from "react";
import type { MissingSkill } from "../service/skillMatch.api";
import { useGapGroups } from "../Hooks/skillMatch.hooks";

interface Props {
  missingSkills: MissingSkill[];
}

export const GapList: React.FC<Props> = ({ missingSkills }) => {
  const { quickWins, bigGaps, minor } = useGapGroups(missingSkills);

  if (missingSkills.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 mb-1 font-bold text-sm">
          ✓
        </div>
        <h4 className="text-sm font-semibold text-foreground">No Skill Gaps Detected</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          The candidate profile satisfies all required and optional skills tracked for this target role.
        </p>
      </div>
    );
  }

  const renderItem = (item: MissingSkill) => {
    return (
      <div
        key={`${item.skill_name}-${item.priority}`}
        className="group flex flex-col sm:flex-row sm:items-start justify-between gap-3.5 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-card-sub shadow-xs w-full max-w-full"
      >
        <div className="space-y-2 flex-1 min-w-0 max-w-full">
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <span className="font-semibold text-foreground text-sm break-words">{item.skill_name}</span>
            <span className="rounded bg-card-sub px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground border border-border shrink-0">
              {item.category_code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                item.requirement === "must"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              {item.requirement}
            </span>
            {item.gap_type === "partial" && (
              <span className="rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium shrink-0">
                Strengthen
              </span>
            )}
            {item.required_level != null && (
              <span className="rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-400 border border-blue-500/30 px-2 py-0.5 text-[10px] font-medium font-mono shrink-0">
                Bloom L{item.required_level}
              </span>
            )}
            {item.candidate_level != null && (
              <span className="rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-400 border border-purple-500/30 px-2 py-0.5 text-[10px] font-medium font-mono shrink-0">
                Candidate L{item.candidate_level}
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed break-words max-w-full">
            {item.why_it_matters}
          </p>

          {item.jd_evidence && (
            <p className="text-xs text-muted-foreground italic break-words max-w-full border-l-2 border-border pl-2 my-1">
              "{item.jd_evidence}"
            </p>
          )}

          {item.closest_candidate_skill && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400/90 flex flex-wrap items-center gap-1.5 break-words max-w-full">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
              <span>
                You have{" "}
                <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                  {item.closest_candidate_skill}
                </span>
                ; {item.skill_name} is the natural next step.
              </span>
            </p>
          )}

          {item.learn_next && (
            <div className="mt-2 rounded bg-card-sub border border-border p-2.5 text-xs text-foreground max-w-full break-words">
              <span className="font-semibold text-muted-foreground block text-[11px] mb-0.5 uppercase tracking-wider">
                What to study next
              </span>
              <p className="break-words">{item.learn_next}</p>
            </div>
          )}
        </div>

        <div className="sm:self-center shrink-0">
          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 shadow-xs">
            +{item.impact_points} pts
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase text-xs">
              Quick Wins ({quickWins.length})
            </h4>
          </div>
          <div className="space-y-2.5">{quickWins.map(renderItem)}</div>
        </div>
      )}

      {/* Big Gaps */}
      {bigGaps.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-rose-500" />
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase text-xs">
              Big Gaps ({bigGaps.length})
            </h4>
          </div>
          <div className="space-y-2.5">{bigGaps.map(renderItem)}</div>
        </div>
      )}

      {/* Minor Gaps */}
      {minor.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-muted-foreground" />
            <h4 className="text-sm font-semibold tracking-wide text-foreground uppercase text-xs">
              Minor / Extended Gaps ({minor.length})
            </h4>
          </div>
          <div className="space-y-2.5">{minor.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
};
