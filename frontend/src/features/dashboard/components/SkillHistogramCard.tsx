import React, { useState } from "react";
import { BarChart3, Info, Sparkles, Filter, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SkillItem {
  code: string;
  name: string;
  candidateLevel: number; // 1 to 5
  requiredLevel: number; // 1 to 5
  bloomStage: "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
  bloomCode: "CU" | "AP" | "AS" | "EV" | "CR";
  category: "Core" | "Systems" | "Engineering";
}

export const RADIX_12_SKILLS: SkillItem[] = [
  {
    code: "DSA",
    name: "Data Structures & Algorithms",
    candidateLevel: 4,
    requiredLevel: 4,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Core",
  },
  {
    code: "SYS",
    name: "System Design & Distributed",
    candidateLevel: 3,
    requiredLevel: 4,
    bloomStage: "Apply",
    bloomCode: "AP",
    category: "Systems",
  },
  {
    code: "DBM",
    name: "Database Internals & Storage",
    candidateLevel: 4,
    requiredLevel: 4,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Core",
  },
  {
    code: "CNC",
    name: "Concurrency & Threading",
    candidateLevel: 2,
    requiredLevel: 3,
    bloomStage: "Understand",
    bloomCode: "CU",
    category: "Systems",
  },
  {
    code: "API",
    name: "API Protocols (gRPC/REST)",
    candidateLevel: 4,
    requiredLevel: 3,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Engineering",
  },
  {
    code: "NET",
    name: "Computer Networks & Sockets",
    candidateLevel: 3,
    requiredLevel: 3,
    bloomStage: "Apply",
    bloomCode: "AP",
    category: "Systems",
  },
  {
    code: "TST",
    name: "Testing & Determinism",
    candidateLevel: 4,
    requiredLevel: 3,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Engineering",
  },
  {
    code: "CLD",
    name: "Cloud Architecture & AWS",
    candidateLevel: 3,
    requiredLevel: 4,
    bloomStage: "Apply",
    bloomCode: "AP",
    category: "Engineering",
  },
  {
    code: "SEC",
    name: "Security, Auth & Crypto",
    candidateLevel: 2,
    requiredLevel: 3,
    bloomStage: "Understand",
    bloomCode: "CU",
    category: "Systems",
  },
  {
    code: "DEV",
    name: "DevOps & CI/CD Pipelines",
    candidateLevel: 3,
    requiredLevel: 3,
    bloomStage: "Apply",
    bloomCode: "AP",
    category: "Engineering",
  },
  {
    code: "OOD",
    name: "Object-Oriented Design",
    candidateLevel: 4,
    requiredLevel: 4,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Core",
  },
  {
    code: "PRB",
    name: "Complex Problem Solving",
    candidateLevel: 4,
    requiredLevel: 4,
    bloomStage: "Analyze",
    bloomCode: "AS",
    category: "Core",
  },
];

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
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
  EV: {
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/30",
  },
  CR: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
};

interface SkillHistogramCardProps {
  onSelectSkill?: ((skill: SkillItem) => void) | undefined;
  selectedSkillCode?: string | null | undefined;
}

export const SkillHistogramCard: React.FC<SkillHistogramCardProps> = ({
  onSelectSkill,
  selectedSkillCode,
}) => {
  const [filterCategory, setFilterCategory] = useState<"All" | "Core" | "Systems" | "Engineering">(
    "All",
  );

  const counts = {
    All: RADIX_12_SKILLS.length,
    Core: RADIX_12_SKILLS.filter((s) => s.category === "Core").length,
    Systems: RADIX_12_SKILLS.filter((s) => s.category === "Systems").length,
    Engineering: RADIX_12_SKILLS.filter((s) => s.category === "Engineering").length,
  };

  const filteredSkills = RADIX_12_SKILLS.filter(
    (s) => filterCategory === "All" || s.category === filterCategory,
  );

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
            Bloom Gap Depth vs L4 Enterprise Hiring Cutoffs
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
            <span className="h-3 w-1 rounded-full bg-white shadow-[0_0_6px_rgba(255,255,255,0.8)]" />
            Target Hiring Bar Notch
          </span>
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">Scale: L1 to L5</span>
      </div>

      {/* Histogram Bars List */}
      <div className="mt-3 space-y-2.5 overflow-y-auto max-h-[440px] pr-1.5 no-scrollbar flex-1">
        {filteredSkills.map((skill) => {
          const isSelected = selectedSkillCode === skill.code;
          const meetsBar = skill.candidateLevel >= skill.requiredLevel;
          const fallbackBloom = BLOOM_COLORS["CU"]!;
          const bloom = BLOOM_COLORS[skill.bloomCode] ?? fallbackBloom;

          // Width percent based on max level 5
          const candWidthPercent = (skill.candidateLevel / 5) * 100;
          const reqPositionPercent = (skill.requiredLevel / 5) * 100;

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
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-foreground">
                    {skill.code}
                  </span>
                  <span className="font-semibold text-foreground truncate max-w-[170px] sm:max-w-[220px]">
                    {skill.name}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                      bloom.bg,
                      bloom.text,
                      bloom.border,
                    )}
                  >
                    {skill.bloomCode} L{skill.candidateLevel}
                  </span>

                  {meetsBar ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3 text-emerald-400" /> Met
                    </span>
                  ) : (
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.2 rounded-md">
                      <AlertTriangle className="h-3 w-3 text-amber-400" /> ▲ -
                      {skill.requiredLevel - skill.candidateLevel}L Gap (Needs L
                      {skill.requiredLevel})
                    </span>
                  )}
                </div>
              </div>

              {/* Progress Histogram Track */}
              <div className="relative mt-2 h-2.5 w-full rounded-full bg-track overflow-hidden">
                {/* Level Grid ticks (1, 2, 3, 4, 5) */}
                <div className="absolute inset-0 flex justify-between pointer-events-none px-1">
                  {[1, 2, 3, 4].map((i) => (
                    <span key={i} className="h-full w-[1px] bg-border/40" />
                  ))}
                </div>

                {/* Candidate Filled Bar (Luminous Amber / Orange) */}
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-500 shadow-[0_0_8px_rgba(249,115,22,0.4)]"
                  style={{ width: `${candWidthPercent}%` }}
                />

                {/* Target Requirement Marker */}
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_6px_rgba(255,255,255,0.9)] rounded-full"
                  style={{ left: `calc(${reqPositionPercent}% - 3px)` }}
                  title={`Target Bar: Level ${skill.requiredLevel}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">8 of 12</strong> skills satisfy Super Dream bar
        </span>
        <span className="text-[11px] font-semibold text-foreground">Composite Index: 3.4/5.0</span>
      </div>
    </div>
  );
};
