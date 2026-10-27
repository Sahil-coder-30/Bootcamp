/**
 * NextTopicsList.tsx
 * Curriculum topic viewer pulling exact learning objectives from RADIX's topic ladder.
 */

import React from "react";
import { BookOpen, CheckSquare } from "lucide-react";
import type { GapRow } from "../service/talentCheck.api";

interface NextTopicsListProps {
  rows: GapRow[];
  selectedCode?: string | null;
}

export const NextTopicsList: React.FC<NextTopicsListProps> = ({
  rows,
  selectedCode,
}) => {
  const activeRows = selectedCode
    ? rows.filter((r) => r.category_code === selectedCode && r.gap)
    : rows.filter((r) => r.gap);

  if (activeRows.length === 0) {
    return (
      <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-sm">
        No gaps selected or candidate meets requirements in this category.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeRows.map((row) => (
        <div
          key={row.category_code}
          className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 backdrop-blur-md"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-blue-400" />
              <h4 className="text-sm font-bold text-white font-mono">
                {row.category_code}: Level {row.candidate_level} → Level {row.required_level}
              </h4>
            </div>
            <span className="text-xs text-rose-400 font-mono font-semibold">
              {row.shortfall} level{row.shortfall > 1 ? "s" : ""} to bridge
            </span>
          </div>

          <div className="space-y-3">
            {row.next_topics.map((t) => {
              const topicItems = t.topics.split(";").map((s) => s.trim()).filter(Boolean);
              return (
                <div
                  key={t.level}
                  className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400 font-mono">
                      Target Level {t.level}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Bloom Tier
                    </span>
                  </div>

                  <ul className="space-y-1.5">
                    {topicItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                        <CheckSquare className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
