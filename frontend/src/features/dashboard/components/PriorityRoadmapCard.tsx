import React, { useState } from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock, ArrowRight, Sparkles, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudyTopicItem {
  id: string;
  categoryCode: string;
  title: string;
  bloomTransition: string; // e.g. "L3 Apply → L4 Analyze"
  hours: number;
  completed: boolean;
  keyConcepts: string[];
}

const INITIAL_TOPICS: StudyTopicItem[] = [
  {
    id: "topic-1",
    categoryCode: "SYS",
    title: "Distributed Consensus: Raft Protocol & Leader Election",
    bloomTransition: "L3 → L4 (Analyze)",
    hours: 4,
    completed: false,
    keyConcepts: ["Leader Election", "Log Replication", "Split Brain Quorums"],
  },
  {
    id: "topic-2",
    categoryCode: "CNC",
    title: "Lock-Free Synchronization & CAS Primitives",
    bloomTransition: "L2 → L3 (Apply)",
    hours: 3.5,
    completed: false,
    keyConcepts: ["Compare-And-Swap", "Deadlock Prevention", "Atomic Variables"],
  },
  {
    id: "topic-3",
    categoryCode: "DBM",
    title: "B-Tree Storage Engines & Write-Ahead Logging (WAL)",
    bloomTransition: "L3 → L4 (Analyze)",
    hours: 3,
    completed: true,
    keyConcepts: ["Page Splitting", "Crash Recovery", "Buffer Pools"],
  },
];

export const PriorityRoadmapCard: React.FC = () => {
  const [topics, setTopics] = useState<StudyTopicItem[]>(INITIAL_TOPICS);

  const toggleTopic = (id: string) => {
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const completedCount = topics.filter((t) => t.completed).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Priority Study Roadmap (RADIX Curriculum)
            </h3>
            <p className="text-xs text-muted-foreground">
              High-ROI topics to bridge Super Dream hiring bar shortfalls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
            {completedCount}/{topics.length} Covered
          </span>
          <Link
            to="/company/skills"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Skill Ladders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Topics List */}
      <div className="mt-3.5 space-y-2.5">
        {topics.map((topic) => {
          return (
            <div
              key={topic.id}
              onClick={() => toggleTopic(topic.id)}
              className={cn(
                "group rounded-xl border p-3 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                topic.completed
                  ? "border-emerald-300 dark:border-emerald-800 bg-emerald-500/10 opacity-80"
                  : "border-border bg-card-sub hover:border-primary/60",
              )}
            >
              {/* Left Title and Tags */}
              <div className="flex items-start gap-3">
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    topic.completed
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : "border-border bg-card text-transparent group-hover:border-primary",
                  )}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 stroke-[3]" />
                </button>

                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.2 rounded bg-muted text-foreground border border-border">
                      {topic.categoryCode}
                    </span>
                    <span
                      className={cn(
                        "text-xs font-semibold",
                        topic.completed ? "line-through text-muted-foreground" : "text-foreground",
                      )}
                    >
                      {topic.title}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="text-foreground font-mono text-[10px] font-semibold">
                      {topic.bloomTransition}
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1 text-[10px]">
                      <Clock className="h-3 w-3" /> {topic.hours} hrs prep
                    </span>
                    <span>•</span>
                    <span className="text-[10px] text-muted-foreground">
                      {topic.keyConcepts.join(", ")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action pill */}
              <div className="shrink-0 text-right">
                <span
                  className={cn(
                    "text-[10px] font-semibold px-2 py-1 rounded-md border",
                    topic.completed
                      ? "border-emerald-400 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-950/40"
                      : "border-border text-foreground bg-card group-hover:border-primary/60",
                  )}
                >
                  {topic.completed ? "Completed ✓" : "Mark Done"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
