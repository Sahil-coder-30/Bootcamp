/**
 * StudyPlan.tsx
 * Fastest Path to Ready roadmap displaying prioritized steps and estimated effort hours.
 */

import React from "react";
import { Milestone, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import type { StudyPlan as StudyPlanType } from "../service/talentCheck.api";

interface StudyPlanProps {
  plan?: StudyPlanType | null | undefined;
  onApplyPlan?: (() => void) | undefined;
}

export const StudyPlan: React.FC<StudyPlanProps> = ({ plan, onApplyPlan }) => {
  if (!plan || !plan.steps || plan.steps.length === 0) {
    return (
      <div className="bg-card-sub border border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
        Candidate already meets or exceeds the required hiring bar.
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-xs space-y-6">
      {/* Summary Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Milestone className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />
            <h3 className="text-base font-bold text-foreground">Fastest Path to Ready</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{plan.summary}</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card-sub border border-border text-xs font-mono text-foreground">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{plan.total_hours} Hours Total</span>
          </div>

          {onApplyPlan && (
            <button
              onClick={onApplyPlan}
              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer shadow-xs"
            >
              Simulate in What-If
            </button>
          )}
        </div>
      </div>

      {/* Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {plan.steps.map((step, idx) => (
          <div
            key={idx}
            className="bg-card hover:bg-card-sub border border-border hover:border-primary/40 rounded-xl p-4 flex flex-col justify-between transition-colors"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-bold text-xs text-foreground px-2 py-0.5 rounded bg-card-sub border border-border">
                  {step.category_code}
                </span>
                <span className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                  Level {step.from_level} <ArrowRight className="w-3 h-3 text-muted-foreground" />{" "}
                  Level {step.to_level}
                </span>
              </div>

              {step.topics && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-2 leading-relaxed">
                  {step.topics}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-border mt-3 text-[11px] text-muted-foreground font-mono">
              <span>
                {step.to_level - step.from_level} step
                {step.to_level - step.from_level > 1 ? "s" : ""}
              </span>
              <span className="text-primary font-medium">~{step.hours} hours</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
