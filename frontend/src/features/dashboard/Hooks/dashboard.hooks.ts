import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setDashboardSummary,
  setSelectedSkill,
  setTargetCompanyId,
  toggleStudyStep,
  setDashboardLoading,
  setDashboardError,
  setJDModalOpen,
  setATSModalOpen,
} from "../slice/dashboard.slice";
import {
  getDashboardSummaryAPI,
  type DashboardSummary,
  type SkillGapItem,
} from "../service/dashboard.api";
import { getCacheItem, setCacheItem, deleteCacheItem } from "@/services/dbService";

export function useDashboard(
  candidateId = "3a000000-0000-4000-8000-000000000001",
  candidateFallback?: { name?: string | undefined; email?: string | undefined; role?: string | undefined } | undefined,
) {
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
    isJDModalOpen,
    isATSModalOpen,
  } = useAppSelector((s) => s.dashboard);

  const fetchDashboardData = useCallback(
    async (cid: string, companyId = targetCompanyId) => {
      dispatch(setDashboardLoading(true));
      dispatch(setDashboardError(null));

      // 1. Try Dexie cache first for instant render
      const cacheKey = `dashboard_${cid}_${companyId}`;
      const cached = await getCacheItem<DashboardSummary>(cacheKey, "dashboard");
      if (cached) {
        const emailMismatch = candidateFallback?.email && cached.email && cached.email !== candidateFallback.email;
        if (emailMismatch || cached.hasData === false) {
          await deleteCacheItem(cacheKey, "dashboard");
        } else {
          dispatch(setDashboardSummary(cached));
        }
      }

      // 2. Fetch fresh from real backend APIs
      try {
        const data = await getDashboardSummaryAPI(cid, companyId, candidateFallback);
        dispatch(setDashboardSummary(data));
        // Persist to Dexie only when data exists
        if (data.hasData) {
          await setCacheItem(cacheKey, data, "dashboard");
        } else {
          await deleteCacheItem(cacheKey, "dashboard");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
        dispatch(setDashboardError(msg));
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, targetCompanyId, candidateFallback?.name, candidateFallback?.email, candidateFallback?.role],
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

  const openJDModal = useCallback(() => dispatch(setJDModalOpen(true)), [dispatch]);
  const closeJDModal = useCallback(() => dispatch(setJDModalOpen(false)), [dispatch]);
  const openATSModal = useCallback(() => dispatch(setATSModalOpen(true)), [dispatch]);
  const closeATSModal = useCallback(() => dispatch(setATSModalOpen(false)), [dispatch]);

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
    isJDModalOpen,
    isATSModalOpen,
    openJDModal,
    closeJDModal,
    openATSModal,
    closeATSModal,
    selectSkill,
    switchCompany,
    toggleStep,
    refresh: () => fetchDashboardData(candidateId, targetCompanyId),
  };
}
