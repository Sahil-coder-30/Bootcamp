import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setDashboardSummary,
  setSelectedSkill,
  setTargetCompanyId,
  toggleStudyStep,
  setDashboardLoading,
  setDashboardError,
} from "../slice/dashboard.slice";
import {
  getDashboardSummaryAPI,
  type DashboardSummary,
  type SkillGapItem,
} from "../service/dashboard.api";
import { getCacheItem, setCacheItem } from "@/services/dbService";

export function useDashboard(candidateId = "3a000000-0000-4000-8000-000000000001") {
  const dispatch = useAppDispatch();
  const {
    summary,
    readinessScore,
    topMatches,
    skills,
    studyPlan,
    selectedSkill,
    targetCompanyId,
    loading,
    error,
  } = useAppSelector((s) => s.dashboard);

  const fetchDashboardData = useCallback(
    async (cid: string, companyId = targetCompanyId) => {
      dispatch(setDashboardLoading(true));
      dispatch(setDashboardError(null));

      // 1. Try Dexie cache first for instant render
      const cacheKey = `dashboard_${cid}_${companyId}`;
      const cached = await getCacheItem<DashboardSummary>(cacheKey, "dashboard");
      if (cached) {
        dispatch(setDashboardSummary(cached));
      }

      // 2. Fetch fresh from real backend APIs
      try {
        const data = await getDashboardSummaryAPI(cid, companyId);
        dispatch(setDashboardSummary(data));
        // Persist to Dexie for offline support
        await setCacheItem(cacheKey, data, "dashboard");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
        dispatch(setDashboardError(msg));
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, targetCompanyId],
  );

  useEffect(() => {
    void fetchDashboardData(candidateId, targetCompanyId);
  }, [candidateId, targetCompanyId, fetchDashboardData]);

  const selectSkill = useCallback(
    (skill: SkillGapItem | null) => {
      dispatch(setSelectedSkill(skill));
    },
    [dispatch],
  );

  const switchCompany = useCallback(
    (newCompanyId: number) => {
      dispatch(setTargetCompanyId(newCompanyId));
    },
    [dispatch],
  );

  const toggleStep = useCallback(
    (stepId: string) => {
      dispatch(toggleStudyStep(stepId));
    },
    [dispatch],
  );

  return {
    summary,
    readinessScore,
    topMatches,
    skills,
    studyPlan,
    selectedSkill,
    targetCompanyId,
    loading,
    error,
    selectSkill,
    switchCompany,
    toggleStep,
    refresh: () => fetchDashboardData(candidateId, targetCompanyId),
  };
}
