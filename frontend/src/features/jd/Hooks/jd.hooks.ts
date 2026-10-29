/**
 * jd.hooks.ts
 * Async orchestration hooks for Role 1: JD Analytics. Components only use these.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { CATEGORY_CODES } from "@/lib/categories";
import {
  extractJdAPI,
  getJdAPI,
  listJdsAPI,
  uploadDocumentAPI,
  type JdSkill,
} from "../service/jd.api";
import {
  selectJd,
  setDetail,
  setError,
  setLibrary,
  setLoading,
  setUploadStage,
} from "../slice/jd.slice";

/** Saved JD extractions (GET /api/jds), loaded once. */
export function useJdLibrary() {
  const dispatch = useAppDispatch();
  const { library, libraryLoaded, loading, errors, selectedId } = useAppSelector((s) => s.jd);

  const refetch = useCallback(async () => {
    dispatch(setLoading({ scope: "library", loading: true }));
    dispatch(setError({ scope: "library", error: null }));
    try {
      const rows = await listJdsAPI();
      dispatch(setLibrary(rows));
      return rows;
    } catch (err) {
      dispatch(
        setError({
          scope: "library",
          error: toErrorMessage(err, "Could not load the JD library."),
        }),
      );
      return [];
    } finally {
      dispatch(setLoading({ scope: "library", loading: false }));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!libraryLoaded && !loading.library && !errors.library) void refetch();
  }, [libraryLoaded, loading.library, errors.library, refetch]);

  const select = useCallback((id: string | null) => dispatch(selectJd(id)), [dispatch]);

  return {
    items: library,
    isLoading: loading.library,
    error: errors.library,
    refetch,
    selectedId,
    select,
  };
}

/** One JD with its extraction and document text (GET /api/jds/:id). */
export function useJdDetail(jdId: string | null) {
  const dispatch = useAppDispatch();
  const { detailsById, loading, errors } = useAppSelector((s) => s.jd);
  const detail = jdId ? detailsById[jdId] : undefined;

  const refetch = useCallback(async () => {
    if (!jdId) return null;
    dispatch(setLoading({ scope: "detail", loading: true }));
    dispatch(setError({ scope: "detail", error: null }));
    try {
      const data = await getJdAPI(jdId);
      dispatch(setDetail(data));
      return data;
    } catch (err) {
      dispatch(
        setError({ scope: "detail", error: toErrorMessage(err, "Could not load this JD.") }),
      );
      return null;
    } finally {
      dispatch(setLoading({ scope: "detail", loading: false }));
    }
  }, [dispatch, jdId]);

  useEffect(() => {
    if (jdId && !detail && !loading.detail && !errors.detail) void refetch();
  }, [jdId, detail, loading.detail, errors.detail, refetch]);

  return { detail, isLoading: loading.detail, error: errors.detail, refetch };
}

/** Upload a JD file, extract it, refresh the library and select the result. */
export function useJdUpload() {
  const dispatch = useAppDispatch();
  const { uploadStage, errors } = useAppSelector((s) => s.jd);

  const run = useCallback(
    async (file: File, opts: { company_id?: number; role?: string; force?: boolean } = {}) => {
      dispatch(setError({ scope: "upload", error: null }));
      dispatch(setLoading({ scope: "upload", loading: true }));
      try {
        dispatch(setUploadStage("uploading"));
        const doc = await uploadDocumentAPI(file, "jd");
        dispatch(setUploadStage("extracting"));
        const result = await extractJdAPI({ document_id: doc.document_id, ...opts });
        if (result.jd_id) {
          const detail = await getJdAPI(result.jd_id);
          dispatch(setDetail(detail));
          dispatch(selectJd(result.jd_id));
        }
        dispatch(setLibrary(await listJdsAPI()));
        dispatch(setUploadStage("done"));
        return result;
      } catch (err) {
        dispatch(
          setError({ scope: "upload", error: toErrorMessage(err, "Upload or extraction failed.") }),
        );
        dispatch(setUploadStage("error"));
        return null;
      } finally {
        dispatch(setLoading({ scope: "upload", loading: false }));
      }
    },
    [dispatch],
  );

  /** Re-run the LLM for an existing JD (bypasses the cache). */
  const reextract = useCallback(
    async (documentId: string, jdId: string) => {
      dispatch(setError({ scope: "upload", error: null }));
      dispatch(setLoading({ scope: "upload", loading: true }));
      dispatch(setUploadStage("extracting"));
      try {
        await extractJdAPI({ document_id: documentId, force: true });
        dispatch(setDetail(await getJdAPI(jdId)));
        dispatch(setLibrary(await listJdsAPI()));
        dispatch(setUploadStage("done"));
      } catch (err) {
        dispatch(
          setError({ scope: "upload", error: toErrorMessage(err, "Re-extraction failed.") }),
        );
        dispatch(setUploadStage("error"));
      } finally {
        dispatch(setLoading({ scope: "upload", loading: false }));
      }
    },
    [dispatch],
  );

  return {
    run,
    reextract,
    stage: uploadStage,
    error: errors.upload,
    isBusy: uploadStage === "uploading" || uploadStage === "extracting",
  };
}

export interface CategoryGroup {
  code: string;
  level: number | null;
  must: JdSkill[];
  nice: JdSkill[];
}

/** Skills grouped by the 12 categories (+ OTHER), in contract order, empty groups dropped. */
export function useGroupedSkills(
  skills: JdSkill[] | undefined,
  levels: Record<string, number> | undefined,
) {
  return useMemo<CategoryGroup[]>(() => {
    const order: string[] = [...CATEGORY_CODES];
    const groups = new Map<string, CategoryGroup>();
    for (const s of skills ?? []) {
      const code = order.includes(s.category_code) ? s.category_code : "OTHER";
      const g = groups.get(code) ?? { code, level: levels?.[code] ?? null, must: [], nice: [] };
      (s.requirement === "nice" ? g.nice : g.must).push(s);
      groups.set(code, g);
    }
    return order.filter((c) => groups.has(c)).map((c) => groups.get(c)!);
  }, [skills, levels]);
}
