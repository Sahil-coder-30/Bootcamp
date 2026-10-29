import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setReadinessScore,
  setTopMatches,
  setSelectedSkill,
  setDashboardLoading,
  setDashboardError,
} from "../slice/dashboard.slice";
import { getDashboardSummaryAPI } from "../service/dashboard.api";
import { getCacheItem, setCacheItem } from "@/services/dbService";
import type { SkillItem } from "../components/SkillHistogramCard";

export function useDashboard(candidateId = "6f1c-ananya") {
  const dispatch = useAppDispatch();
  const { readinessScore, topMatches, selectedSkill, loading, error } = useAppSelector(
    (s) => s.dashboard,
  );

  const fetchDashboardData = useCallback(
    async (cid: string) => {
      dispatch(setDashboardLoading(true));
      dispatch(setDashboardError(null));

      // 1. Try Dexie cache first for instant render
      const cached = await getCacheItem<Awaited<ReturnType<typeof getDashboardSummaryAPI>>>(
        `dashboard_${cid}`,
        "dashboard",
      );
      if (cached) {
        dispatch(setReadinessScore(cached.tier1ReadinessPercent));
        dispatch(setTopMatches(cached.topMatches));
      }

      // 2. Fetch fresh from backend
      try {
        const data = await getDashboardSummaryAPI(cid);
        dispatch(setReadinessScore(data.tier1ReadinessPercent));
        dispatch(setTopMatches(data.topMatches));
        // Persist to Dexie
        await setCacheItem(`dashboard_${cid}`, data, "dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
        dispatch(setDashboardError(msg));
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch],
  );

  useEffect(() => {
    void fetchDashboardData(candidateId);
  }, [candidateId, fetchDashboardData]);

  const selectSkill = useCallback(
    (skill: SkillItem | null) => {
      dispatch(setSelectedSkill(skill));
    },
    [dispatch],
  );

  return {
    readinessScore,
    topMatches,
    selectedSkill,
    loading,
    error,
    selectSkill,
    refresh: () => fetchDashboardData(candidateId),
  };
}
