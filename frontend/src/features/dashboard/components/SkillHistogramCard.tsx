import React, { useState } from "react";
import { BarChart3, Sparkles, CheckCircle2, AlertTriangle, BookOpen, Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SkillGapItem } from "../service/dashboard.api";

export type { SkillGapItem as SkillItem };

const BLOOM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  CU: {
    bg: "bg-muted/80",
    text: "text-muted-foreground",
    border: "border-border",
  },
  AP: {
    bg: "bg-primary/10",
    text: "text-primary",
    border: "border-primary/30",
  },
  AS: {
    bg: "bg-amber-500/10",
    text: "text-amber-500 dark:text-amber-400",
    border: "border-amber-500/30",
  },
  EV: {
    bg: "bg-orange-500/10",
    text: "text-orange-500 dark:text-orange-400",
    border: "border-orange-500/30",
  },
  CR: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
  },
};

interface SkillHistogramCardProps {
  skills?: SkillGapItem[] | undefined;
  onSelectSkill?: ((skill: SkillGapItem) => void) | undefined;
  selectedSkillCode?: string | null | undefined;
  targetCompanyName?: string | undefined;
  loading?: boolean | undefined;
}

export const SkillHistogramCard: React.FC<SkillHistogramCardProps> = ({
  skills = [],
  onSelectSkill,
  selectedSkillCode,
  targetCompanyName = "Google LLC",
  loading = false,
}) => {
  const [filterCategory, setFilterCategory] = useState<"All" | "Core" | "Systems" | "Engineering">(
    "All",
  );

  const counts = {
    All: skills.length,
    Core: skills.filter((s) => s.category === "Core").length,
    Systems: skills.filter((s) => s.category === "Systems").length,
    Engineering: skills.filter((s) => s.category === "Engineering").length,
  };

  const filteredSkills = skills.filter(
    (s) => filterCategory === "All" || s.category === filterCategory,
  );

  const selectedSkill =
    skills.find((s) => s.code === selectedSkillCode) || (skills.length > 0 ? skills[0] : null);

  const metCount = skills.filter((s) => !s.gap).length;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col h-full transition-colors">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted border border-border text-foreground">
              <BarChart3 className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-heading text-base font-bold text-foreground">
              12 RADIX Skillset Histogram
            </h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            AST Gap Depth vs <strong className="text-foreground">{targetCompanyName}</strong> Hiring
            Bar
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 rounded-full bg-muted p-1 border border-border text-[11px]">
          {(["All", "Core", "Systems", "Engineering"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={cn(
                "rounded-full px-2.5 py-1 font-medium transition-all cursor-pointer",
                filterCategory === cat
                  ? "bg-primary text-white font-bold shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {cat} ({counts[cat]})
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground pb-1">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-primary" />
            Candidate Level (Bloom Depth)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-1 rounded-full bg-foreground shadow-xs" />
            Recruiter Cutoff Notch
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">AST Scale: L1 to L10</span>
      </div>

      {/* Histogram Bars List */}
      <div className="mt-3.5 space-y-2.5 overflow-y-auto max-h-[560px] pr-1.5 no-scrollbar flex-1">
        {loading && skills.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mb-2" />
            <p>Benchmarking skills against live AST topic ladders...</p>
          </div>
        ) : (
          filteredSkills.map((skill) => {
            const isSelected = selectedSkill?.code === skill.code;
            const meetsBar = !skill.gap;
            const bloom = BLOOM_COLORS[skill.candidateBloom] ?? BLOOM_COLORS["CU"]!;

            // Scale L1 to L10
            const candWidthPercent = Math.min(100, Math.max(10, (skill.candidateLevel / 10) * 100));
            const reqPositionPercent = Math.min(
              100,
              Math.max(10, (skill.requiredLevel / 10) * 100),
            );

            return (
              <div
                key={skill.code}
                onClick={() => onSelectSkill?.(skill)}
                className={cn(
                  "group relative rounded-xl border p-2.5 transition-all cursor-pointer",
                  isSelected
                    ? "border-primary bg-card-sub ring-1 ring-primary shadow-xs"
                    : "border-border bg-card-sub hover:border-primary/60",
                )}
              >
                {/* Row Header */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="shrink-0 rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                      {skill.code}
                    </span>
                    <span className="font-semibold text-foreground truncate">{skill.name}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold shrink-0",
                        bloom.bg,
                        bloom.text,
                        bloom.border,
                      )}
                    >
                      {skill.candidateBloom} L{skill.candidateLevel}
                    </span>

                    {meetsBar ? (
                      <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                        <CheckCircle2 className="h-3 w-3" /> Met
                      </span>
                    ) : (
                      <span
                        className={cn(
                          "flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.2 rounded-md border shrink-0",
                          skill.blocking
                            ? "text-red-500 bg-red-500/10 border-red-500/20"
                            : "text-amber-500 bg-amber-500/10 border-amber-500/20",
                        )}
                      >
                        <AlertTriangle className="h-3 w-3" /> -{skill.shortfall}L Gap
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress Histogram Track */}
                <div className="relative mt-2 h-2.5 w-full rounded-full bg-track overflow-hidden">
                  {/* Grid lines for 10 levels */}
                  <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => (
                      <span key={i} className="h-full w-[1px] bg-border/40" />
                    ))}
                  </div>

                  {/* Candidate Filled Bar */}
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500 shadow-xs",
                      meetsBar
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-400"
                        : skill.blocking
                          ? "bg-gradient-to-r from-red-600 to-amber-500"
                          : "bg-gradient-to-r from-primary to-amber-500",
                    )}
                    style={{ width: `${candWidthPercent}%` }}
                  />

                  {/* Target Requirement Notch */}
                  <div
                    className="absolute top-0 bottom-0 w-1.5 bg-foreground rounded-full shadow-sm"
                    style={{ left: `calc(${reqPositionPercent}% - 3px)` }}
                    title={`Target Cutoff: Level ${skill.requiredLevel}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Selected Skill Next Topics Preview */}
      {selectedSkill && selectedSkill.nextTopics.length > 0 && (
        <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-primary mb-1">
            <BookOpen className="h-3.5 w-3.5" />
            <span>Next AST Topics for {selectedSkill.name}:</span>
          </div>
          <p className="text-[11px] text-foreground leading-relaxed">
            {selectedSkill.nextTopics[0]?.topics}
          </p>
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">
            {metCount} of {skills.length}
          </strong>{" "}
          skills meet {targetCompanyName} cutoff
        </span>
        <span className="text-[11px] font-semibold text-primary">
          {metCount === skills.length ? "100% Ready" : `${skills.length - metCount} Gaps to Bridge`}
        </span>
      </div>
    </div>
  );
};
