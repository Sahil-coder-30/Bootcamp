import React from "react";
import type { MatchedSkill } from "../service/skillMatch.api";

interface Props {
  matchedSkills: MatchedSkill[];
}

export const MatchLinksView: React.FC<Props> = ({ matchedSkills }) => {
  const getMethodBadge = (m: string) => {
    switch (m) {
      case "exact":
        return (
          <span className="rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono">
            exact
          </span>
        );
      case "alias":
        return (
          <span className="rounded bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[11px] font-mono">
            alias
          </span>
        );
      case "implied":
        return (
          <span className="rounded bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono">
            implied
          </span>
        );
      case "fuzzy":
        return (
          <span className="rounded bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-mono">
            fuzzy
          </span>
        );
      case "semantic":
        return (
          <span className="rounded bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[11px] font-mono">
            semantic
          </span>
        );
      case "llm":
        return (
          <span className="rounded bg-purple-500/10 text-purple-700 dark:text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono">
            llm adjudicated
          </span>
        );
      case "category":
        return (
          <span className="rounded bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[11px] font-mono">
            category
          </span>
        );
      default:
        return (
          <span className="rounded bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[11px] font-mono">
            {m}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-border">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Matched Requirements ({matchedSkills.length})
        </h4>
        <span className="text-xs text-muted-foreground">Colored by resolution stage</span>
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-card shadow-sm">
        {matchedSkills.map((m, idx) => (
          <div
            key={idx}
            className="p-3.5 hover:bg-muted/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1 md:w-5/12">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{m.jd_skill}</span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  [{m.category_code}]
                </span>
              </div>
              {m.jd_evidence && (
                <p className="text-muted-foreground italic line-clamp-1">"{m.jd_evidence}"</p>
              )}
            </div>

            <div className="flex items-center justify-center md:w-2/12">
              {getMethodBadge(m.method)}
            </div>

            <div className="space-y-1 md:w-5/12 md:text-right">
              <div className="flex items-center md:justify-end gap-2">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium">
                  {m.candidate_skill}
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-1.5 py-0.2 text-[10px] font-mono">
                  {Math.round(m.credit * 100)}% credit
                </span>
              </div>
              {m.evidence && <p className="text-muted-foreground line-clamp-1">{m.evidence}</p>}
              {m.reason && (
                <p className="text-purple-700 dark:text-purple-300 text-[11px] font-mono line-clamp-1">
                  LLM note: {m.reason}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
