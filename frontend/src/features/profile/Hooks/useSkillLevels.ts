import { useCallback, useRef } from "react";
import { useWatch, type UseFormReturn } from "react-hook-form";
import type { Code } from "@/lib/categories";
import type { ProfileValues, SkillLevel } from "../lib/schema";

/** A level this many points above the resume's value gets a (non-blocking) heads-up. */
export const SELF_RATING_GAP = 3;
/** An MCQ cannot prove level 9-10 ("Creation"), so assessed results are capped. */
export const ASSESSED_CAP = 8;

type Original = Pick<SkillLevel, "basis" | "confidence">;

export interface CalibrationResult {
  level: number;
  source: "self" | "assessed";
  basis: string;
}

/**
 * The editing rules for the 12 sliders (plan 3.5): moving a slider makes the value `self`,
 * "reset" goes back to what the resume suggested, calibration records how it was measured.
 */
export function useSkillLevels(form: UseFormReturn<ProfileValues>) {
  const levels = useWatch({ control: form.control, name: "skill_levels" });
  // The resume's original basis/confidence, remembered for "reset" once a slider has been moved.
  const originals = useRef<Partial<Record<Code, Original>>>({});

  const write = useCallback(
    (code: Code, next: SkillLevel) =>
      form.setValue(`skill_levels.${code}`, next, { shouldDirty: true, shouldValidate: true }),
    [form],
  );

  const setLevel = useCallback(
    (code: Code, n: number) => {
      const cur = form.getValues(`skill_levels.${code}`);
      if (cur.level === n) return;
      const inferred = cur.inferred_level ?? (cur.source === "resume_inferred" ? cur.level : null);
      if (cur.source === "resume_inferred" && !originals.current[code]) {
        originals.current[code] = { basis: cur.basis, confidence: cur.confidence };
      }
      write(code, {
        level: n,
        source: "self",
        confidence: "medium",
        basis:
          inferred !== null
            ? `Adjusted by candidate (resume suggested ${inferred})`
            : "Set by candidate",
        inferred_level: inferred,
      });
    },
    [form, write],
  );

  const resetToInferred = useCallback(
    (code: Code) => {
      const cur = form.getValues(`skill_levels.${code}`);
      const inferred = cur.inferred_level;
      if (inferred === null || inferred === undefined) return;
      const original = originals.current[code];
      write(code, {
        level: inferred,
        source: "resume_inferred",
        confidence: original?.confidence ?? "medium",
        basis: original?.basis ?? `Inferred from resume (level ${inferred})`,
        inferred_level: inferred,
      });
    },
    [form, write],
  );

  /** "Talent Check will treat this as self-reported": a soft warning, never blocks Save. */
  const isHighSelfRating = useCallback(
    (code: Code): boolean => {
      const l = levels?.[code];
      if (!l || l.source !== "self" || l.inferred_level == null) return false;
      const inferredConfidence = originals.current[code]?.confidence ?? "medium";
      return l.level >= l.inferred_level + SELF_RATING_GAP && inferredConfidence !== "low";
    },
    [levels],
  );

  const applyCalibration = useCallback(
    (code: Code, result: CalibrationResult) => {
      const cur = form.getValues(`skill_levels.${code}`);
      const level = Math.min(
        10,
        Math.max(
          1,
          result.source === "assessed" ? Math.min(result.level, ASSESSED_CAP) : result.level,
        ),
      );
      write(code, {
        level,
        source: result.source,
        confidence: "medium",
        basis: result.basis.slice(0, 200),
        inferred_level: cur.inferred_level ?? null,
      });
    },
    [form, write],
  );

  return { levels, setLevel, resetToInferred, isHighSelfRating, applyCalibration };
}
