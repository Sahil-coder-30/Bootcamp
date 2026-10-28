import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { getProfileAPI } from "../service/profile.api";
import { setProfile, setProfileError, setProfileLoading } from "../slice/profile.slice";

/** One profile by id, cached in the store. */
export function useProfile(id?: string) {
  const dispatch = useAppDispatch();
  const cached = useAppSelector((s) => (id ? s.profile.byId[id] : undefined));
  const { loading, error } = useAppSelector((s) => s.profile.current);
  const attempted = useRef<string | null>(null);

  const refetch = useCallback(async () => {
    if (!id) return null;
    dispatch(setProfileError(null));
    dispatch(setProfileLoading(true));
    try {
      const data = await getProfileAPI(id);
      dispatch(setProfile(data));
      return data;
    } catch (err) {
      dispatch(setProfileError(toErrorMessage(err, "Unable to load this profile.")));
      return null;
    } finally {
      dispatch(setProfileLoading(false));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!id || attempted.current === id) return;
    attempted.current = id;
    if (!cached) void refetch();
  }, [id, cached, refetch]);

  return {
    profile: cached?.profile ?? null,
    version: cached?.version ?? null,
    loading: Boolean(id) && !cached && loading,
    error: id && !cached ? error : null,
    refetch,
  };
}
