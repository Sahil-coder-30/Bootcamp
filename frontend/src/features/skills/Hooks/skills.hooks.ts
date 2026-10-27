import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { getCompanySkillsAPI } from "../service/skills.api";
import { setCompanySkills, setSkillsError, setSkillsLoading } from "../slice/skills.slice";

export type { CompanySkillsData, SkillWithTopics } from "../service/skills.api";

/** Required skill levels + 10-level topic ladders for one company. */
export function useCompanySkills(id?: number | null) {
  const dispatch = useAppDispatch();
  const enabled = typeof id === "number" && id > 0;
  const { byCompany, errors, loadingId } = useAppSelector((s) => s.skills);
  const data = enabled ? byCompany[id] : undefined;
  const error = enabled ? (errors[id] ?? null) : null;

  const refetch = useCallback(async () => {
    if (!enabled) return null;
    dispatch(setSkillsLoading(id));
    dispatch(setSkillsError({ id, error: null }));
    try {
      const result = await getCompanySkillsAPI(id);
      dispatch(setCompanySkills({ id, data: result }));
      return result;
    } catch (err) {
      dispatch(
        setSkillsError({ id, error: toErrorMessage(err, "Unable to retrieve skill data.") }),
      );
      return null;
    } finally {
      dispatch(setSkillsLoading(null));
    }
  }, [dispatch, enabled, id]);

  // Skip while a request for this id is in flight, so a retry (which clears the error)
  // does not trigger a second request from here.
  const inFlight = enabled && loadingId === id;
  useEffect(() => {
    if (enabled && !data && !error && !inFlight) void refetch();
  }, [enabled, data, error, inFlight, refetch]);

  return {
    data,
    isLoading: enabled && !data && !error,
    isError: Boolean(error),
    error,
    refetch,
  };
}
