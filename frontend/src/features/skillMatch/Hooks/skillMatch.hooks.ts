/**
 * skillMatch.hooks.ts
 * Custom hooks for Role 5 Skill Matching.
 */

import { useEffect, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  runSkillMatchAPI,
  getSkillMatchMatrixAPI,
  type SkillMatchResult,
  type MissingSkill,
} from "../service/skillMatch.api";
import {
  setMatchLoading,
  setMatchResult,
  setMatchError,
  setMatrixLoading,
  setMatrix,
  setMatrixError,
  setSelectedProfileId,
  setSelectedJdId,
  setHoveredJdSkill,
  toggleMethodFilter,
} from "../slice/skillMatch.slice";

export function useSkillMatch(profileId?: string, jdId?: string, autoFetch: boolean = true) {
  const dispatch = useAppDispatch();
  const currentProfileId = useAppSelector((s) => profileId || s.skillMatch.selectedProfileId);
  const currentJdId = useAppSelector((s) => jdId || s.skillMatch.selectedJdId);
  const byKey = useAppSelector((s) => s.skillMatch.byKey);
  const loadingKey = useAppSelector((s) => s.skillMatch.loadingKey);
  const error = useAppSelector((s) => s.skillMatch.error);

  const matchKey = `${currentProfileId}:${currentJdId}`;
  const result: SkillMatchResult | undefined = byKey[matchKey];
  const isLoading = loadingKey === matchKey;

  const fetchMatch = useCallback(
    async (refresh: boolean = false) => {
      if (!currentProfileId || !currentJdId) return;
      dispatch(setMatchLoading(matchKey));
      try {
        const data = await runSkillMatchAPI({
          profile_id: currentProfileId,
          jd_id: currentJdId,
          refresh,
        });
        dispatch(setMatchResult({ key: matchKey, result: data }));
      } catch (err: any) {
        dispatch(
          setMatchError(err?.response?.data?.error || err.message || "Failed to load skill match"),
        );
      }
    },
    [currentProfileId, currentJdId, matchKey, dispatch],
  );

  useEffect(() => {
    if (autoFetch && !result && !isLoading && currentProfileId && currentJdId) {
      fetchMatch();
    }
  }, [autoFetch, result, isLoading, currentProfileId, currentJdId, fetchMatch]);

  const selectProfile = (id: string) => dispatch(setSelectedProfileId(id));
  const selectJd = (id: string) => dispatch(setSelectedJdId(id));

  return {
    profileId: currentProfileId,
    jdId: currentJdId,
    result,
    isLoading,
    error,
    fetchMatch,
    selectProfile,
    selectJd,
  };
}

export function useSkillMatchMatrix(autoFetch: boolean = true) {
  const dispatch = useAppDispatch();
  const matrix = useAppSelector((s) => s.skillMatch.matrix);
  const isLoading = useAppSelector((s) => s.skillMatch.matrixLoading);
  const error = useAppSelector((s) => s.skillMatch.matrixError);

  const fetchMatrix = useCallback(
    async (refresh: boolean = false) => {
      dispatch(setMatrixLoading(true));
      try {
        const data = await getSkillMatchMatrixAPI({ refresh });
        dispatch(setMatrix(data));
      } catch (err: any) {
        dispatch(
          setMatrixError(
            err?.response?.data?.error || err.message || "Failed to load match matrix",
          ),
        );
      }
    },
    [dispatch],
  );

  useEffect(() => {
    if (autoFetch && !matrix && !isLoading) {
      fetchMatrix();
    }
  }, [autoFetch, matrix, isLoading, fetchMatrix]);

  return {
    matrix,
    isLoading,
    error,
    fetchMatrix,
  };
}

export function useGapGroups(missingSkills: MissingSkill[]) {
  return useMemo(() => {
    const quickWins: MissingSkill[] = [];
    const bigGaps: MissingSkill[] = [];
    const minor: MissingSkill[] = [];

    for (const item of missingSkills) {
      if (item.gap_type === "partial" && item.impact_points < 2) {
        minor.push(item);
      } else if (item.effort === "quick_win") {
        quickWins.push(item);
      } else {
        bigGaps.push(item);
      }
    }

    return { quickWins, bigGaps, minor };
  }, [missingSkills]);
}

export function useSkillMatchUI() {
  const dispatch = useAppDispatch();
  const hoveredJdSkill = useAppSelector((s) => s.skillMatch.ui.hoveredJdSkill);
  const methodFilter = useAppSelector((s) => s.skillMatch.ui.methodFilter);

  const setHovered = (skill: string | null) => dispatch(setHoveredJdSkill(skill));
  const toggleFilter = (method: any) => dispatch(toggleMethodFilter(method));

  return {
    hoveredJdSkill,
    methodFilter,
    setHovered,
    toggleFilter,
  };
}
