import { useCallback, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  setLandingStats,
  setSelectedTier,
  setLandingLoading,
  setLandingError,
} from "../slice/landing.slice";
import { getLandingDataAPI } from "../service/landing.api";
import { getCacheItem, setCacheItem } from "@/services/dbService";
import { toErrorMessage } from "@/services/apiClient";

export function useLanding() {
  const dispatch = useAppDispatch();
  const { stats, selectedTier, loading, error } = useAppSelector((s) => s.landing);

  const fetchStats = useCallback(async () => {
    dispatch(setLandingLoading(true));
    dispatch(setLandingError(null));

    // Try Dexie cache first
    const cached = await getCacheItem<Awaited<ReturnType<typeof getLandingDataAPI>>>(
      "landing_stats",
      "landing",
    );
    if (cached) {
      dispatch(setLandingStats(cached));
    }

    try {
      const data = await getLandingDataAPI();
      dispatch(setLandingStats(data));
      await setCacheItem("landing_stats", data, "landing");
    } catch (err) {
      const msg = toErrorMessage(err, "Failed to load platform stats");
      dispatch(setLandingError(msg));
    } finally {
      dispatch(setLandingLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const selectTier = useCallback(
    (tier: "All" | "Super Dream" | "Dream" | "Standard" | "Regular") => {
      dispatch(setSelectedTier(tier));
    },
    [dispatch],
  );

  return {
    stats,
    selectedTier,
    loading,
    error,
    selectTier,
    refresh: fetchStats,
  };
}
