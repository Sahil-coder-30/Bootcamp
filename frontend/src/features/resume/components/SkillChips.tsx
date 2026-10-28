import React from "react";
import type { Skill } from "../service/resume.api";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  COD: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  DSA: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  SYSD: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  SQL: { bg: "bg-cyan-500/10", text: "text-cyan-400", border: "border-cyan-500/30" },
  CLOUD: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  SWE: { bg: "bg-purple-500/10", text: "text-purple-400", border: "border-purple-500/30" },
  AI: { bg: "bg-rose-500/10", text: "text-rose-400", border: "border-rose-500/30" },
  NETW: { bg: "bg-teal-500/10", text: "text-teal-400", border: "border-teal-500/30" },
  OS: { bg: "bg-indigo-500/10", text: "text-indigo-400", border: "border-indigo-500/30" },
  OOD: { bg: "bg-yellow-500/10", text: "text-yellow-400", border: "border-yellow-500/30" },
  COMM: { bg: "bg-pink-500/10", text: "text-pink-400", border: "border-pink-500/30" },
  APTI: { bg: "bg-zinc-500/10", text: "text-zinc-400", border: "border-zinc-500/30" },
};

interface SkillChipsProps {
  skills: Skill[];
  onSkillClick?: (skillName: string) => void;
  highlightedSkill?: string | null;
}

export const SkillChips: React.FC<SkillChipsProps> = ({
  skills,
  onSkillClick,
  highlightedSkill,
}) => {
  if (!skills.length) {
    return <p className="text-xs text-zinc-500 italic">No skills extracted.</p>;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-wrap gap-2">
        {skills.map((skill, idx) => {
          const color = CATEGORY_COLORS[skill.category_code] || {
            bg: "bg-zinc-800/50",
            text: "text-zinc-300",
            border: "border-zinc-700",
          };
          const isHighlighted = highlightedSkill === skill.skill_name;
          const isHighConf = skill.confidence === "high";

          return (
            <Tooltip key={`${skill.skill_name}-${idx}`}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onSkillClick?.(skill.skill_name)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                    color.bg
                  } ${color.text} border ${
                    isHighConf ? color.border : "border-dashed border-zinc-600/70"
                  } ${
                    isHighlighted
                      ? "ring-2 ring-orange-400 scale-105 shadow-[0_0_12px_rgba(249,115,22,0.4)]"
                      : "hover:scale-102 hover:brightness-110"
                  }`}
                >
                  <span className="font-semibold">{skill.skill_name}</span>
                  <span className="text-[10px] opacity-70 uppercase font-mono">
                    {skill.category_code}
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-xs border border-zinc-800 bg-[#0e0e12] p-2.5 text-zinc-200 shadow-xl"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-1">
                    <span className="font-bold text-white text-xs">{skill.skill_name}</span>
                    <Badge variant="outline" className="text-[9px] uppercase border-zinc-700">
                      {skill.confidence} confidence
                    </Badge>
                  </div>
                  <p className="text-[11px] leading-relaxed text-zinc-400">
                    <span className="text-zinc-500 font-semibold">Evidence:</span> &ldquo;
                    {skill.evidence}&rdquo;
                  </p>
                  {skill.section && (
                    <p className="text-[10px] text-zinc-500">
                      Found in: <span className="capitalize text-zinc-300">{skill.section}</span>
                    </p>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
