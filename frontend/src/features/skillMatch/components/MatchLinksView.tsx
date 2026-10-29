import React from "react";
import type { MatchedSkill } from "../service/skillMatch.api";

interface Props {
  matchedSkills: MatchedSkill[];
}

export const MatchLinksView: React.FC<Props> = ({ matchedSkills }) => {
  if (matchedSkills.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card/60 p-8 text-center space-y-2">
        <h4 className="text-sm font-semibold text-foreground">No Matched Skills Recorded</h4>
        <p className="text-xs text-muted-foreground max-w-md mx-auto">
          No skills matched the requirements for this job posting yet.
        </p>
      </div>
    );
  }

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
            className="p-3.5 sm:p-4 hover:bg-muted/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs w-full max-w-full"
          >
            <div className="space-y-1.5 md:w-5/12 min-w-0 max-w-full">
              <div className="flex flex-wrap items-center gap-2 max-w-full">
                <span className="font-semibold text-foreground break-words">{m.jd_skill}</span>
                <span className="text-[10px] text-muted-foreground font-mono shrink-0">
                  [{m.category_code}]
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                    m.requirement === "must"
                      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                      : "bg-muted text-muted-foreground border border-border"
                  }`}
                >
                  {m.requirement}
                </span>
              </div>
              {m.jd_evidence && (
                <p className="text-muted-foreground italic break-words max-w-full">
                  "{m.jd_evidence}"
                </p>
              )}
            </div>

            <div className="flex items-center md:justify-center md:w-2/12 shrink-0">
              {getMethodBadge(m.method)}
            </div>

            <div className="space-y-1.5 md:w-5/12 md:text-right min-w-0 max-w-full">
              <div className="flex flex-wrap items-center md:justify-end gap-2 max-w-full">
                <span className="text-emerald-700 dark:text-emerald-300 font-medium break-words">
                  {m.candidate_skill}
                </span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-mono shrink-0">
                  {Math.round(m.credit * 100)}% credit
                </span>
              </div>
              {m.evidence && <p className="text-muted-foreground break-words max-w-full">{m.evidence}</p>}
              {m.reason && (
                <p className="text-purple-700 dark:text-purple-300 text-[11px] font-mono break-words max-w-full">
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
