import React from "react";
import { Link } from "@tanstack/react-router";
import { BookOpen, CheckCircle2, Clock, ArrowRight, CheckSquare, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoadmapStepItem } from "../service/dashboard.api";

export interface PriorityRoadmapCardProps {
  studyPlan?:
    | {
        totalHours: number;
        totalSteps: number;
        summary: string;
        steps: RoadmapStepItem[];
      }
    | undefined;
  onToggleStep?: ((id: string) => void) | undefined;
  loading?: boolean | undefined;
}

export const PriorityRoadmapCard: React.FC<PriorityRoadmapCardProps> = ({
  studyPlan,
  onToggleStep,
  loading = false,
}) => {
  const steps = studyPlan?.steps || [];
  const completedCount = steps.filter((t) => t.completed).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3.5 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-foreground">
              Priority Study Roadmap
            </h3>
            <p className="text-xs text-muted-foreground">
              AST High-ROI curriculum to bridge hiring bar shortfalls
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-foreground bg-muted px-2.5 py-0.5 rounded-full border border-border">
            {completedCount}/{steps.length} Covered ({studyPlan?.totalHours || 0}h)
          </span>
          <Link
            to="/company/skills"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1 transition-colors"
          >
            Skill Ladders <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* Steps List */}
      <div className="mt-3.5 space-y-2.5">
        {loading && steps.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Synthesizing personalized study roadmap from AST shortfall analysis...</p>
          </div>
        ) : steps.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
            <p className="font-semibold text-foreground">All hiring bar topics met!</p>
            <p className="mt-1">Candidate profile meets or exceeds target recruiter standards.</p>
          </div>
        ) : (
          steps.map((topic) => {
            return (
              <div
                key={topic.id}
                onClick={() => onToggleStep?.(topic.id)}
                className={cn(
                  "group rounded-xl border p-3 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3",
                  topic.completed
                    ? "border-emerald-500/30 bg-emerald-500/10 opacity-80"
                    : "border-border bg-card-sub hover:border-primary/60",
                )}
              >
                {/* Left Title and Tags */}
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    className="mt-0.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors cursor-pointer"
                    aria-label={topic.completed ? "Mark incomplete" : "Mark complete"}
                  >
                    {topic.completed ? (
                      <CheckSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </button>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                        {topic.categoryCode}
                      </span>
                      <h4
                        className={cn(
                          "font-heading text-xs font-bold text-foreground transition-all",
                          topic.completed && "line-through text-muted-foreground",
                        )}
                      >
                        {topic.categoryName}
                      </h4>
                      <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2 py-0.2 text-[10px] font-mono font-semibold">
                        L{topic.fromLevel} → L{topic.toLevel}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-foreground/85 leading-relaxed">
                      {topic.topics}
                    </p>
                  </div>
                </div>

                {/* Right Hours Badge */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-border/40">
                  <div className="inline-flex items-center gap-1 text-[11px] font-mono font-semibold text-muted-foreground">
                    <Clock className="h-3 w-3 text-primary" />
                    <span>{topic.hours}h</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">Estimated</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      {studyPlan?.summary && (
        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span className="truncate max-w-[450px]">{studyPlan.summary}</span>
          <span className="text-[11px] font-semibold text-primary shrink-0">
            {studyPlan.totalHours} Total Hours
          </span>
        </div>
      )}
    </div>
  );
};
