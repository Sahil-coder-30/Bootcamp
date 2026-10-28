import { useCallback, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { applyDiffDecisions, getPath } from "../lib/diff";
import { toFormValues } from "../lib/formMapping";
import { isReviewable } from "../lib/provenance";
import type { DiffDecision, ProfileValues, ReviewState } from "../lib/types";
import { draftFromResumeAPI } from "../service/profile.api";
import { clearPrefill, setPrefill } from "../slice/profile.slice";

/** Values the reviewable fields hold right now, so "reject" can restore them. */
function snapshot(values: ProfileValues, paths: string[]): Record<string, unknown> {
  return Object.fromEntries(paths.map((p) => [p, getPath(values, p) ?? ""]));
}

interface Options {
  /** True while the form has unsaved edits: re-importing into a saved profile would overwrite them. */
  dirty?: boolean;
}

/**
 * Pre-fill the form from a parsed resume (Role 2's extraction).
 * - New profile: the draft fills the form; every field gets a provenance chip.
 * - Existing profile: the backend returns a merge diff; nothing is applied until the candidate decides.
 */
export function usePrefillFromResume(
  form: UseFormReturn<ProfileValues>,
  { dirty = false }: Options = {},
) {
  const dispatch = useAppDispatch();
  const { diff, existingProfileId, warnings } = useAppSelector((s) => s.profile.prefill);
  const [loading, setLoading] = useState(false);
  /** The merged draft and the saved profile it was merged into, held until the diff is decided. */
  const [pending, setPending] = useState<{ draft: ProfileValues; base: ProfileValues } | null>(
    null,
  );

  const prefill = useCallback(
    async (extractionId: string, profileId?: string, base?: ProfileValues) => {
      if (profileId && dirty) {
        toast.error("Save your changes first, then import the CV, so nothing you typed is lost.");
        return null;
      }
      setLoading(true);
      try {
        const res = await draftFromResumeAPI({
          resume_extraction_id: extractionId,
          ...(profileId ? { profile_id: profileId } : {}),
        });
        const reviewable = Object.keys(res.provenance).filter(isReviewable);
        const review = Object.fromEntries(reviewable.map((p) => [p, "pending" as ReviewState]));
        const common = {
          extractionId,
          existingProfileId: res.existing_profile_id,
          provenance: res.provenance,
          review,
          warnings: res.warnings,
        };

        if (res.diff !== null) {
          // Merging into a saved profile: hold the draft until the candidate decides.
          const saved = base ?? toFormValues(form.getValues());
          setPending({ draft: toFormValues(res.draft), base: saved });
          dispatch(
            setPrefill({ ...common, previous: snapshot(saved, reviewable), diff: res.diff }),
          );
          return res;
        }

        dispatch(
          setPrefill({ ...common, previous: snapshot(form.getValues(), reviewable), diff: null }),
        );
        form.reset(toFormValues(res.draft), { keepDefaultValues: true });
        if (res.existing_profile_id) {
          toast.info("A profile with this email already exists. You can update it instead.");
        }
        return res;
      } catch (err) {
        toast.error(toErrorMessage(err, "Could not pre-fill from this CV."));
        return null;
      } finally {
        setLoading(false);
      }
    },
    [dirty, dispatch, form],
  );

  /** Apply the candidate's accept/keep decisions (missing = the entry's default). */
  const applyDiff = useCallback(
    (decisions: Record<string, DiffDecision>) => {
      if (!pending || !diff) return;
      const result = applyDiffDecisions(pending.base, pending.draft, diff, decisions);
      form.reset(result, { keepDefaultValues: true });
      setPending(null);
      dispatch(setPrefill({ diff: null }));
    },
    [pending, diff, form, dispatch],
  );

  /** Close the diff without changing anything. */
  const discardDiff = useCallback(() => {
    setPending(null);
    dispatch(clearPrefill());
  }, [dispatch]);

  return { prefill, loading, diff, applyDiff, discardDiff, existingProfileId, warnings };
}
