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

export const NextTopicsList: React.FC<NextTopicsListProps> = ({ rows, selectedCode }) => {
  const activeRows = selectedCode
    ? rows.filter((r) => r.category_code === selectedCode && r.gap)
    : rows.filter((r) => r.gap);

  if (activeRows.length === 0) {
    return (
      <div className="bg-card-sub border border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
        No gaps selected or candidate meets requirements in this category.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {activeRows.map((row) => (
        <div
          key={row.category_code}
          className="bg-card border border-border rounded-2xl p-5 shadow-xs"
        >
          <div className="flex items-center justify-between pb-3 border-b border-border mb-4">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <h4 className="text-sm font-bold text-foreground font-mono">
                {row.category_code}: Level {row.candidate_level} → Level {row.required_level}
              </h4>
            </div>
            <span className="text-xs text-rose-600 dark:text-rose-400 font-mono font-semibold">
              {row.shortfall} level{row.shortfall > 1 ? "s" : ""} to bridge
            </span>
          </div>

          <div className="space-y-3">
            {row.next_topics.map((t) => {
              const topicItems = t.topics
                .split(";")
                .map((s) => s.trim())
                .filter(Boolean);
              return (
                <div key={t.level} className="bg-card-sub rounded-xl p-3.5 border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary font-mono">
                      Target Level {t.level}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-mono">Bloom Tier</span>
                  </div>

                  <ul className="space-y-1.5">
                    {topicItems.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-foreground">
                        <CheckSquare className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
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
