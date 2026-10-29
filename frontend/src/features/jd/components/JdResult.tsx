import React from "react";
import { AlertTriangle, Building2, Database, RefreshCw, Zap } from "lucide-react";
import { bloomOf, categoryColor, categoryName } from "@/lib/categories";
import { cn } from "@/lib/utils";
import type { CategoryGroup } from "../Hooks/jd.hooks";
import type { ExtractedSkillList, JdSkill } from "../service/jd.api";

interface JdResultProps {
  result: ExtractedSkillList;
  groups: CategoryGroup[];
  selected: JdSkill | null;
  onSelect: (skill: JdSkill) => void;
  onReextract: () => void;
  isBusy: boolean;
}

const CONFIDENCE_DOT: Record<JdSkill["confidence"], string> = {
  high: "bg-emerald-500",
  medium: "bg-amber-500",
  low: "bg-slate-400",
};

const SkillChip: React.FC<{ skill: JdSkill; active: boolean; onClick: () => void }> = ({
  skill,
  active,
  onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    title={`${skill.confidence} confidence${skill.level_hint ? ` · level ${skill.level_hint}` : ""}: ${skill.evidence}`}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors",
      active
        ? "border-primary bg-primary/10 text-foreground"
        : "border-border text-foreground hover:border-primary/50",
      skill.requirement === "nice" && "border-dashed",
    )}
  >
    <span
      className={cn("h-1.5 w-1.5 rounded-full", CONFIDENCE_DOT[skill.confidence])}
      aria-hidden
    />
    {skill.skill_name}
    {skill.level_hint ? (
      <span className="text-[10px] text-muted-foreground">L{skill.level_hint}</span>
    ) : null}
  </button>
);

/** ExtractedSkillList: header, provenance badges and skills grouped by category with must/nice. */
export const JdResult: React.FC<JdResultProps> = ({
  result,
  groups,
  selected,
  onSelect,
  onReextract,
  isBusy,
}) => {
  const m = result.meta;
  const must = result.skills.filter((s) => s.requirement !== "nice").length;
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-foreground">{result.role ?? result.source_file}</h2>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" />
            {result.company ?? "Company not resolved"}
            {result.company_id ? ` (id ${result.company_id})` : ""}
            {m.location ? ` · ${m.location}` : ""}
            {m.seniority ? ` · ${m.seniority}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onReextract}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:border-primary/60 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isBusy && "animate-spin")} /> Re-extract
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-[11px]">
        <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
          {result.skills.length} skills · {must} must · {result.skills.length - must} nice
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
          <Zap className="h-3 w-3" /> {m.model} · {m.prompt_version}
          {typeof m.latency_ms === "number" ? ` · ${(m.latency_ms / 1000).toFixed(1)} s` : ""}
        </span>
        {m.cached && (
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/40 px-2 py-0.5 text-emerald-600 dark:text-emerald-400">
            <Database className="h-3 w-3" /> cached
          </span>
        )}
        {m.degraded && (
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/50 px-2 py-0.5 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> degraded: keyword mode, LLM unavailable
          </span>
        )}
        {(m.dropped?.length ?? 0) > 0 && (
          <span className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {m.dropped!.length} dropped (no evidence)
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> high
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500" /> medium
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-400" /> low
        </span>
        <span>dashed border = nice to have</span>
      </div>

      <div className="space-y-3">
        {groups.map((g) => (
          <section
            key={g.code}
            className="rounded-xl border border-border p-3"
            aria-label={categoryName(g.code)}
          >
            <div className="mb-2 flex items-center gap-2">
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                style={{ backgroundColor: categoryColor(g.code) }}
              >
                {g.code}
              </span>
              <h3 className="text-xs font-semibold text-foreground">{categoryName(g.code)}</h3>
              {g.level != null && (
                <span
                  className="ml-auto text-[11px] text-muted-foreground"
                  title={m.level_basis?.[g.code] ?? undefined}
                >
                  required level {g.level} ({bloomOf(g.level)})
                </span>
              )}
            </div>
            {g.must.length > 0 && (
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span className="w-9 text-[10px] font-bold uppercase text-muted-foreground">
                  Must
                </span>
                {g.must.map((s) => (
                  <SkillChip
                    key={s.skill_name}
                    skill={s}
                    active={selected === s}
                    onClick={() => onSelect(s)}
                  />
                ))}
              </div>
            )}
            {g.nice.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="w-9 text-[10px] font-bold uppercase text-muted-foreground">
                  Nice
                </span>
                {g.nice.map((s) => (
                  <SkillChip
                    key={s.skill_name}
                    skill={s}
                    active={selected === s}
                    onClick={() => onSelect(s)}
                  />
                ))}
              </div>
            )}
          </section>
        ))}
      </div>

      {selected && (
        <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 text-xs">
          <div className="font-semibold text-foreground">
            {selected.skill_name} · {selected.requirement ?? "must"} · {selected.confidence}{" "}
            confidence
            {selected.level_hint ? ` · level ${selected.level_hint}` : ""}
          </div>
          <p className="mt-1 text-muted-foreground">"{selected.evidence}"</p>
        </div>
      )}
    </div>
  );
};
