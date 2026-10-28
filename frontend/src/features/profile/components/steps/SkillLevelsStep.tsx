import { useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { useCompanies, useCompany } from "@/features/companies/Hooks/companies.hooks";
import { CODES, type Code } from "@/lib/categories";
import { useCompanyBarOverlay } from "../../Hooks/useCompanyBarOverlay";
import { useSkillLevels } from "../../Hooks/useSkillLevels";
import type { ProfileValues } from "../../lib/types";
import { CalibrateSheet } from "../CalibrateSheet";
import { Section } from "../Field";
import { SkillLevelSlider } from "../SkillLevelSlider";

const selectClass =
  "flex h-9 w-full max-w-xs rounded-md border border-input bg-background px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm";

export default function SkillLevelsStep({ form }: { form: UseFormReturn<ProfileValues> }) {
  const sl = useSkillLevels(form);
  const { data: companies } = useCompanies();
  const { selected } = useCompany();
  const [companyId, setCompanyId] = useState<number | null>(selected?.companyId ?? null);
  const overlay = useCompanyBarOverlay(companyId);
  const [calibrating, setCalibrating] = useState<Code | null>(null);

  const levels = sl.levels;
  const untouchedLow = levels
    ? CODES.filter(
        (c) => levels[c]?.confidence === "low" && levels[c]?.source === "resume_inferred",
      )
    : [];

  return (
    <div className="space-y-4">
      <Section
        title="Skill levels"
        description="Talent Check compares these 12 levels (1 to 10) with a company's bar. Resume-based values are suggestions: move a slider to set your own."
      >
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <label htmlFor="overlay-company" className="text-sm font-medium">
              Show a company's bar
            </label>
            <select
              id="overlay-company"
              className={selectClass}
              value={companyId ?? ""}
              onChange={(e) => setCompanyId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">None</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {overlay.loading && <p className="text-xs text-muted-foreground">Loading the bar...</p>}
          {overlay.unavailable && companyId !== null && (
            <p role="status" className="text-xs text-muted-foreground">
              The company bar is not available right now. The sliders still work.
            </p>
          )}
        </div>
        {untouchedLow.length > 0 && (
          <p role="status" className="text-sm text-amber-400">
            {untouchedLow.length} level{untouchedLow.length === 1 ? "" : "s"} have no evidence yet (
            {untouchedLow.join(", ")}). Review them or leave them at 1.
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          Hollow circle: what your resume suggested. Amber line: the company's required level.
        </p>
      </Section>

      <div className="grid gap-3 lg:grid-cols-2">
        {CODES.map((code) => {
          const value = levels?.[code];
          if (!value) return null;
          return (
            <SkillLevelSlider
              key={code}
              code={code}
              value={value}
              companyLevel={overlay.bar?.[code]}
              warning={sl.isHighSelfRating(code)}
              onChange={(n) => sl.setLevel(code, n)}
              onReset={() => sl.resetToInferred(code)}
              onCalibrate={() => setCalibrating(code)}
            />
          );
        })}
      </div>

      <CalibrateSheet
        code={calibrating}
        level={calibrating ? (levels?.[calibrating]?.level ?? 5) : 5}
        onClose={() => setCalibrating(null)}
        onApply={sl.applyCalibration}
      />
    </div>
  );
}
