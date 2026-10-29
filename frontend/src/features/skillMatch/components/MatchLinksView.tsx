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
          <span className="rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 text-[11px] font-mono">
            exact
          </span>
        );
      case "alias":
        return (
          <span className="rounded bg-teal-500/20 text-teal-300 border border-teal-500/30 px-2 py-0.5 text-[11px] font-mono">
            alias
          </span>
        );
      case "implied":
        return (
          <span className="rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 text-[11px] font-mono">
            implied
          </span>
        );
      case "fuzzy":
        return (
          <span className="rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 text-[11px] font-mono">
            fuzzy
          </span>
        );
      case "semantic":
        return (
          <span className="rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 text-[11px] font-mono">
            semantic
          </span>
        );
      case "llm":
        return (
          <span className="rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2 py-0.5 text-[11px] font-mono">
            llm adjudicated
          </span>
        );
      case "category":
        return (
          <span className="rounded bg-zinc-700/50 text-zinc-300 border border-zinc-600 px-2 py-0.5 text-[11px] font-mono">
            category
          </span>
        );
      default:
        return (
          <span className="rounded bg-zinc-800 text-zinc-400 px-2 py-0.5 text-[11px] font-mono">
            {m}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Matched Requirements ({matchedSkills.length})
        </h4>
        <span className="text-xs text-zinc-500">Colored by resolution stage</span>
      </div>

      <div className="divide-y divide-zinc-800/60 rounded-lg border border-zinc-800 bg-zinc-950/40">
        {matchedSkills.map((m, idx) => (
          <div
            key={idx}
            className="p-3.5 hover:bg-zinc-900/40 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
          >
            <div className="space-y-1 md:w-5/12">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-200">{m.jd_skill}</span>
                <span className="text-[10px] text-zinc-500 font-mono">[{m.category_code}]</span>
              </div>
              {m.jd_evidence && (
                <p className="text-zinc-400 italic line-clamp-1">"{m.jd_evidence}"</p>
              )}
            </div>

            <div className="flex items-center justify-center md:w-2/12">
              {getMethodBadge(m.method)}
            </div>

            <div className="space-y-1 md:w-5/12 md:text-right">
              <div className="flex items-center md:justify-end gap-2">
                <span className="text-emerald-400 font-medium">{m.candidate_skill}</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-1.5 py-0.2 text-[10px] font-mono">
                  {Math.round(m.credit * 100)}% credit
                </span>
              </div>
              {m.evidence && <p className="text-zinc-400 line-clamp-1">{m.evidence}</p>}
              {m.reason && (
                <p className="text-purple-300/80 text-[11px] font-mono line-clamp-1">
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
