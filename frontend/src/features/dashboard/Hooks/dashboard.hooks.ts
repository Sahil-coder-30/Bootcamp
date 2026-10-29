import { useCallback, useEffect } from "react";
import { toast } from "sonner";
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
import { toErrorMessage } from "@/services/apiClient";

export function useDashboardModals() {
  const dispatch = useAppDispatch();
  const isJDModalOpen = useAppSelector((s) => s.dashboard.isJDModalOpen);
  const isATSModalOpen = useAppSelector((s) => s.dashboard.isATSModalOpen);

  const openJDModal = useCallback(() => dispatch(setJDModalOpen(true)), [dispatch]);
  const closeJDModal = useCallback(() => dispatch(setJDModalOpen(false)), [dispatch]);
  const openATSModal = useCallback(() => dispatch(setATSModalOpen(true)), [dispatch]);
  const closeATSModal = useCallback(() => dispatch(setATSModalOpen(false)), [dispatch]);

  return {
    isJDModalOpen,
    isATSModalOpen,
    openJDModal,
    closeJDModal,
    openATSModal,
    closeATSModal,
  };
}

export function useDashboard(
  candidateId = "",
  candidateFallback?: { name?: string | undefined; email?: string | undefined; role?: string | undefined } | undefined,
  autoFetch = true,
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
      const cacheKey = `dashboard_${cid || candidateFallback?.email || "anon"}_${companyId}`;
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
        const msg = toErrorMessage(err, "Failed to load dashboard data");
        dispatch(setDashboardError(msg));
        toast.error(msg);
      } finally {
        dispatch(setDashboardLoading(false));
      }
    },
    [dispatch, targetCompanyId, candidateFallback?.name, candidateFallback?.email, candidateFallback?.role],
  );

  useEffect(() => {
    if (autoFetch) {
      void fetchDashboardData(candidateId, targetCompanyId);
    }
  }, [candidateId, targetCompanyId, fetchDashboardData, autoFetch]);

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
    async (stepId: string) => {
      dispatch(toggleStudyStep(stepId));
      try {
        const cacheKey = `dashboard_${candidateId || candidateFallback?.email || "anon"}_${targetCompanyId}`;
        const cached = await getCacheItem<DashboardSummary>(cacheKey, "dashboard");
        if (cached && cached.studyPlan?.steps) {
          cached.studyPlan.steps = cached.studyPlan.steps.map((s) =>
            s.id === stepId ? { ...s, completed: !s.completed } : s,
          );
          await setCacheItem(cacheKey, cached, "dashboard");
        }
      } catch {
        // Non-blocking cache persistence error
      }
    },
    [dispatch, candidateId, candidateFallback?.email, targetCompanyId],
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
