import { useCallback, useRef, useState } from "react";
import axios from "axios";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { fromFormValues } from "../lib/formMapping";
import type { ChangeSource, ProfileValues, StoredProfile } from "../lib/types";
import { createProfileAPI, updateProfileAPI } from "../service/profile.api";
import { clearConflict, setConflict, setProfile, setSaving } from "../slice/profile.slice";

export interface SaveContext {
  /** Present when editing an existing profile. */
  id: string;
  version: number;
  source?: ChangeSource;
}

interface Attempt {
  payload: ProfileValues;
  id: string;
  source: ChangeSource | undefined;
}

/**
 * Create vs update, plus the two failures a candidate can actually hit:
 * 409 (that email already has a profile) and 412 (someone saved a newer version meanwhile).
 */
export function useSaveProfile() {
  const dispatch = useAppDispatch();
  const { saving, conflict } = useAppSelector((s) => s.profile.current);
  const [error, setError] = useState<string | null>(null);
  const [duplicateId, setDuplicateId] = useState<string | null>(null);
  const lastAttempt = useRef<Attempt | null>(null);

  const finish = useCallback(
    (stored: StoredProfile) => {
      dispatch(setProfile({ profile: stored, version: stored.version }));
      dispatch(clearConflict());
      toast.success(`Profile saved (v${stored.version})`);
      return stored;
    },
    [dispatch],
  );

  const save = useCallback(
    async (
      values: ProfileValues,
      ctx?: SaveContext,
      createSource: ChangeSource = "form",
    ): Promise<StoredProfile | null> => {
      const payload = fromFormValues(values);
      setError(null);
      setDuplicateId(null);
      dispatch(setSaving(true));
      try {
        if (!ctx) return finish(await createProfileAPI(payload, createSource));
        lastAttempt.current = { payload, id: ctx.id, source: ctx.source };
        return finish(await updateProfileAPI(ctx.id, ctx.version, payload, ctx.source));
      } catch (err) {
        if (axios.isAxiosError(err)) {
          const body = err.response?.data as
            | { existing_profile_id?: string; current?: StoredProfile; current_version?: number }
            | undefined;
          if (err.response?.status === 409 && body?.existing_profile_id) {
            setDuplicateId(body.existing_profile_id);
            setError("A profile with this email already exists.");
            toast.error("A profile with this email already exists.");
            return null;
          }
          if (err.response?.status === 412 && body?.current) {
            dispatch(
              setConflict({
                server: body.current,
                version: body.current_version ?? body.current.version,
              }),
            );
            return null;
          }
        }
        const message = toErrorMessage(err, "Could not save the profile.");
        setError(message);
        toast.error(message);
        return null;
      } finally {
        dispatch(setSaving(false));
      }
    },
    [dispatch, finish],
  );

  /**
   * "mine": save the attempted values on top of the server's version.
   * "theirs": drop them; returns the server's profile so the caller can reset the form.
   */
  const resolveConflict = useCallback(
    async (choice: "mine" | "theirs"): Promise<StoredProfile | null> => {
      if (!conflict) return null;
      if (choice === "theirs") {
        dispatch(setProfile({ profile: conflict.server, version: conflict.version }));
        dispatch(clearConflict());
        return conflict.server;
      }
      const attempt = lastAttempt.current;
      if (!attempt) return null;
      return save(attempt.payload as ProfileValues, {
        id: attempt.id,
        version: conflict.version,
        ...(attempt.source ? { source: attempt.source } : {}),
      });
    },
    [conflict, dispatch, save],
  );

  return { save, saving, error, duplicateId, conflict, resolveConflict };
}
