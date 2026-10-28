import { useCallback, useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { useAppDispatch, useAppSelector } from "@/store";
import { isReviewable } from "../lib/provenance";
import type { Confidence, ProfileValues, Provenance, ReviewState } from "../lib/types";
import { setReview, setReviewMany } from "../slice/profile.slice";

/** The "from resume" chip for one field: evidence, review state, accept / reject. */
export function useFieldProvenance(path: string) {
  const dispatch = useAppDispatch();
  const form = useFormContext<ProfileValues>();
  const provenance = useAppSelector((s) => s.profile.prefill.provenance[path]);
  const stored = useAppSelector((s) => s.profile.prefill.review[path]);
  const previous = useAppSelector((s) => s.profile.prefill.previous[path]);
  const value = useWatch({ control: form.control, name: path as never }) as unknown;

  // A skill's evidence is a quote, not the field value, so only plain fields can be "edited".
  const comparable = provenance && !path.startsWith("skills.");
  const rejected = stored === "rejected";
  const edited = Boolean(comparable) && !rejected && String(value ?? "") !== provenance?.evidence;
  const state: ReviewState = edited ? "edited" : (stored ?? "pending");

  useEffect(() => {
    if (provenance && edited && stored !== "edited") {
      dispatch(setReview({ path, state: "edited" }));
    }
  }, [dispatch, edited, path, provenance, stored]);

  const accept = useCallback(
    () => dispatch(setReview({ path, state: "accepted" })),
    [dispatch, path],
  );

  const reject = useCallback(() => {
    form.setValue(path as never, (previous ?? "") as never, {
      shouldDirty: true,
      shouldValidate: true,
    });
    dispatch(setReview({ path, state: "rejected" }));
  }, [dispatch, form, path, previous]);

  return { provenance: provenance as Provenance | undefined, state, accept, reject };
}

/** "14 of 23 reviewed" and the bulk "accept all high-confidence" action. */
export function useProvenanceSummary() {
  const dispatch = useAppDispatch();
  const { provenance, review } = useAppSelector((s) => s.profile.prefill);

  const paths = Object.keys(provenance).filter(isReviewable);
  const reviewed = paths.filter((p) => (review[p] ?? "pending") !== "pending").length;

  const acceptAllHigh = useCallback(() => {
    const updates: Record<string, ReviewState> = {};
    for (const p of paths) {
      const conf: Confidence | undefined = provenance[p]?.confidence;
      if (conf === "high" && (review[p] ?? "pending") === "pending") updates[p] = "accepted";
    }
    if (Object.keys(updates).length > 0) dispatch(setReviewMany(updates));
    return Object.keys(updates).length;
  }, [dispatch, paths, provenance, review]);

  return { total: paths.length, reviewed, acceptAllHigh };
}
