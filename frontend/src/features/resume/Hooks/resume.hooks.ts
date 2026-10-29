/**
 * resume.hooks.ts
 * React hooks encapsulating Redux dispatchers, async API integration, and file reading.
 */

import { useCallback } from "react";
import { useAppDispatch, useAppSelector, store } from "@/store";
import { saveFlowProfileAPI } from "@/features/flow/service/flow.api";
import { getStoredUser, saveStoredUser } from "@/lib/auth";
import { setAuthUser } from "@/features/auth/slice/auth.slice";
import { updateMeAPI } from "@/features/auth/service/auth.api";
import { clearDashboardCache } from "@/services/dbService";
import {
  parseResumeAPI,
  getSampleResumeAPI,
  getUserLatestResumeAPI,
  inferLevelsAPI,
  type ResumeExtraction,
} from "../service/resume.api";
import {
  setResumeStatus,
  setResumeExtraction,
  setCompareExtraction,
  setResumeError,
  setActiveTab,
  setHighlightedSkill,
  setDrawerOpen,
  resetResumeState,
  type ResumeTab,
} from "../slice/resume.slice";

export function useResume() {
  const dispatch = useAppDispatch();
  const {
    currentExtraction,
    compareExtraction,
    status,
    error,
    activeTab,
    highlightedSkill,
    isDrawerOpen,
  } = useAppSelector((state) => state.resume);

  const loadSample = useCallback(
    async (candidateKey: string) => {
      dispatch(setResumeStatus("parsing"));
      try {
        const result = await getSampleResumeAPI(candidateKey);
        dispatch(setResumeExtraction(result));
      } catch (err) {
        dispatch(
          setResumeError(err instanceof Error ? err.message : "Failed to load candidate sample"),
        );
      }
    },
    [dispatch],
  );

  const loadCompare = useCallback(
    async (candidateKey: string) => {
      try {
        const result = await getSampleResumeAPI(candidateKey);
        dispatch(setCompareExtraction(result));
      } catch {
        dispatch(setCompareExtraction(null));
      }
    },
    [dispatch],
  );

  const uploadAndParse = useCallback(
    async (file: File) => {
      dispatch(setResumeStatus("uploading"));
      try {
        dispatch(setResumeStatus("parsing"));
        const result = await parseResumeAPI(file);
        dispatch(setResumeExtraction(result));

        // Automatically persist parsed resume as a candidate profile in the DB
        try {
          const authUser = store.getState().auth.user;
          const storedUser = getStoredUser();
          const userEmail = authUser?.email || storedUser?.email;
          const userId = authUser?.id;
          const profileId =
            authUser?.candidateProfileId ||
            (storedUser?.id && !storedUser.id.startsWith("candidate_")
              ? storedUser.id
              : undefined);

          const saved = await saveFlowProfileAPI(result, {
            email: userEmail,
            userId: userId,
            profileId: profileId,
          });

          if (saved?.profile_id) {
            if (storedUser) {
              saveStoredUser({
                ...storedUser,
                id: saved.profile_id,
                name: saved.profile?.name || storedUser.name,
                email: saved.profile?.email || storedUser.email,
              });
            }
            if (authUser) {
              dispatch(
                setAuthUser({
                  ...authUser,
                  candidateProfileId: saved.profile_id,
                }),
              );
              void updateMeAPI({ candidateProfileId: saved.profile_id }).catch(() => {});
            }
            await clearDashboardCache();
          }
        } catch (saveErr) {
          console.warn("[resume.hooks] Auto-save profile to DB notice:", saveErr);
        }
      } catch (err) {
        dispatch(
          setResumeError(err instanceof Error ? err.message : "Failed to parse resume document"),
        );
      }
    },
    [dispatch],
  );

  const loadUserResume = useCallback(async () => {
    try {
      const result = await getUserLatestResumeAPI();
      if (result) {
        dispatch(setResumeExtraction(result));
        return true;
      }
    } catch {
      // not logged in or no resume stored
    }
    return false;
  }, [dispatch]);

  const recalculateLevels = useCallback(async () => {
    if (!currentExtraction) return;
    try {
      const resp = await inferLevelsAPI(currentExtraction);
      const updated: ResumeExtraction = {
        ...currentExtraction,
        category_levels: resp.category_levels,
        category_level_details: resp.category_level_details,
        meta: {
          ...currentExtraction.meta,
          latency_ms: resp.latency_ms,
        },
      };
      dispatch(setResumeExtraction(updated));
    } catch (err) {
      console.error("Recalculate error:", err);
    }
  }, [currentExtraction, dispatch]);

  return {
    currentExtraction,
    compareExtraction,
    status,
    isLoading: status === "uploading" || status === "parsing",
    error,
    activeTab,
    highlightedSkill,
    isDrawerOpen,
    uploadAndParse,
    loadUserResume,
    loadSample,
    loadCompare,
    recalculateLevels,
    setTab: (tab: ResumeTab) => dispatch(setActiveTab(tab)),
    setHighlight: (skill: string | null) => dispatch(setHighlightedSkill(skill)),
    setDrawer: (open: boolean) => dispatch(setDrawerOpen(open)),
    reset: () => dispatch(resetResumeState()),
  };
}
