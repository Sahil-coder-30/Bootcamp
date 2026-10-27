import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { getCompanyProfileAPI } from "../service/intelligence.api";
import { setProfile, setProfileError, setProfileLoading } from "../slice/intelligence.slice";

/** Full research profile of one company (22 intelligence sections). */
export function useCompanyProfile(id?: number | null) {
  const dispatch = useAppDispatch();
  const enabled = typeof id === "number" && id > 0;
  const { profiles, errors, loadingId } = useAppSelector((s) => s.intelligence);
  const cached = enabled && id in profiles;
  const error = enabled ? (errors[id] ?? null) : null;

  const refetch = useCallback(async () => {
    if (!enabled) return null;
    dispatch(setProfileLoading(id));
    dispatch(setProfileError({ id, error: null }));
    try {
      const profile = await getCompanyProfileAPI(id);
      dispatch(setProfile({ id, profile }));
      return profile;
    } catch (err) {
      dispatch(
        setProfileError({
          id,
          error: toErrorMessage(err, "Unable to retrieve intelligence parameters."),
        }),
      );
      return null;
    } finally {
      dispatch(setProfileLoading(null));
    }
  }, [dispatch, enabled, id]);

  // Skip while a request for this id is in flight, so a retry (which clears the error)
  // does not trigger a second request from here.
  const inFlight = enabled && loadingId === id;
  useEffect(() => {
    if (enabled && !cached && !error && !inFlight) void refetch();
  }, [enabled, cached, error, inFlight, refetch]);

  return {
    data: enabled ? (profiles[id] ?? null) : null,
    isLoading: enabled && !cached && !error,
    isError: Boolean(error),
    error,
    refetch,
  };
}
