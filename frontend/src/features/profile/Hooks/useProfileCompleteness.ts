import { useMemo } from "react";
import { useWatch, type Control } from "react-hook-form";
import { computeCompleteness } from "../lib/completeness";
import type { ProfileValues } from "../lib/types";

/** Live 0-100 meter and the "what to add next" hints (same weights as the backend). */
export function useProfileCompleteness(control: Control<ProfileValues>) {
  const values = useWatch({ control }) as ProfileValues;
  return useMemo(() => computeCompleteness(values), [values]);
}
