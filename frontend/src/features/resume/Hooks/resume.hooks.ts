/**
 * resume.hooks.ts
 * React hooks encapsulating Redux dispatchers, async API integration, and file reading.
 */

import { useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import {
  parseResumeAPI,
  getSampleResumeAPI,
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

      const reader = new FileReader();
      reader.onload = async () => {
        const raw = reader.result as string;
        const base64 = raw && raw.includes(",") ? (raw.split(",")[1] ?? "") : "";
        dispatch(setResumeStatus("parsing"));

        try {
          const result = await parseResumeAPI({
            content_b64: base64,
            file_name: file.name,
            mime: file.type || "application/pdf",
          });
          dispatch(setResumeExtraction(result));
        } catch (err) {
          dispatch(
            setResumeError(err instanceof Error ? err.message : "Failed to parse resume document"),
          );
        }
      };

      reader.onerror = () => {
        dispatch(setResumeError("Could not read local file. Please try another."));
      };

      reader.readAsDataURL(file);
    },
    [dispatch],
  );

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
    loadSample,
    loadCompare,
    recalculateLevels,
    setTab: (tab: ResumeTab) => dispatch(setActiveTab(tab)),
    setHighlight: (skill: string | null) => dispatch(setHighlightedSkill(skill)),
    setDrawer: (open: boolean) => dispatch(setDrawerOpen(open)),
    reset: () => dispatch(resetResumeState()),
  };
}
