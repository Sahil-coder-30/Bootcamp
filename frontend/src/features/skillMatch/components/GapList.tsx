import React from "react";
import type { MissingSkill } from "../service/skillMatch.api";
import { useGapGroups } from "../Hooks/skillMatch.hooks";

interface Props {
  missingSkills: MissingSkill[];
}

export const GapList: React.FC<Props> = ({ missingSkills }) => {
  const { quickWins, bigGaps, minor } = useGapGroups(missingSkills);

  const renderItem = (item: MissingSkill) => {
    return (
      <div
        key={`${item.skill_name}-${item.priority}`}
        className="group flex flex-col sm:flex-row sm:items-start justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4 transition-colors hover:border-zinc-700/80 hover:bg-zinc-900/50"
      >
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-zinc-100 text-sm">{item.skill_name}</span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[11px] font-mono text-zinc-400">
              {item.category_code}
            </span>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                item.requirement === "must"
                  ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  : "bg-zinc-800 text-zinc-400 border border-zinc-700"
              }`}
            >
              {item.requirement}
            </span>
            {item.gap_type === "partial" && (
              <span className="rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2 py-0.5 text-[10px] font-medium">
                Strengthen
              </span>
            )}
          </div>

          <p className="text-xs text-zinc-400 leading-relaxed">{item.why_it_matters}</p>

          {item.closest_candidate_skill && (
            <p className="text-xs text-emerald-400/90 flex items-center gap-1.5">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
              You have{" "}
              <span className="font-semibold text-emerald-300">{item.closest_candidate_skill}</span>
              ; {item.skill_name} is the natural next step.
            </p>
          )}

          {item.learn_next && (
            <div className="mt-2 rounded bg-zinc-900/90 border border-zinc-800/60 p-2.5 text-xs text-zinc-300">
              <span className="font-semibold text-zinc-400 block text-[11px] mb-0.5 uppercase tracking-wider">
                What to study next
              </span>
              {item.learn_next}
            </div>
          )}
        </div>

        <div className="sm:self-center shrink-0">
          <div className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm">
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
            <h4 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase text-xs">
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
            <h4 className="text-sm font-semibold tracking-wide text-zinc-200 uppercase text-xs">
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
            <span className="flex h-2 w-2 rounded-full bg-zinc-500" />
            <h4 className="text-sm font-semibold tracking-wide text-zinc-400 uppercase text-xs">
              Minor / Nice-to-haves ({minor.length})
            </h4>
          </div>
          <div className="space-y-2.5">{minor.map(renderItem)}</div>
        </div>
      )}
    </div>
  );
};
