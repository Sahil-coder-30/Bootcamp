/**
 * talentCheck.hooks.ts
 * Business logic and async orchestration hooks for Role 4: Talent Check.
 * Follows frontend-arch-init: handles try/catch/finally and dispatches to slice.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import {
  getCompanyRankingAPI,
  getSkillBarAPI,
  getTalentMatrixAPI,
  runTalentCheckAPI,
  type CompanyBar,
  type RankRow,
  type TalentCheckResult,
  type TalentMatrixResult,
} from "../service/talentCheck.api";
import {
  initWhatIf,
  resetWhatIf,
  setCompanyBar,
  setCompanyRanking,
  setError,
  setLoading,
  setTalentCheckResult,
  setTalentMatrix,
  setWhatIfOverride,
} from "../slice/talentCheck.slice";
import { scoreLevels } from "../lib/readiness";

/** Required skill levels for one company. */
export function useCompanySkillBar(companyId?: number | null) {
  const dispatch = useAppDispatch();
  const enabled = typeof companyId === "number" && companyId > 0;
  const { barsByCompany, loading, errors } = useAppSelector((s) => s.talentCheck);

  const data = enabled ? barsByCompany[companyId] : undefined;
  const isLoading = loading.bar;
  const error = errors.bar;

  const refetch = useCallback(async () => {
    if (!enabled) return null;
    dispatch(setLoading({ scope: "bar", loading: true }));
    dispatch(setError({ scope: "bar", error: null }));
    try {
      const result = await getSkillBarAPI(companyId);
      dispatch(setCompanyBar({ id: companyId, data: result }));
      return result;
    } catch (err) {
      dispatch(
        setError({
          scope: "bar",
          error: toErrorMessage(err, "Unable to retrieve company skill bar."),
        })
      );
      return null;
    } finally {
      dispatch(setLoading({ scope: "bar", loading: false }));
    }
  }, [dispatch, enabled, companyId]);

  useEffect(() => {
    if (enabled && !data && !isLoading && !error) {
      void refetch();
    }
  }, [enabled, data, isLoading, error, refetch]);

  return { data, isLoading, error, refetch };
}

/** Evaluates candidate readiness against an employer bar. */
export function useTalentCheck(profileId?: string, companyId?: number | null) {
  const dispatch = useAppDispatch();
  const enabled = Boolean(profileId) && typeof companyId === "number" && companyId > 0;
  const key = enabled ? `${profileId}:${companyId}` : "";
  const { resultsByKey, loading, errors } = useAppSelector((s) => s.talentCheck);

  const result = key ? resultsByKey[key] : undefined;
  const isLoading = loading.check;
  const error = errors.check;

  const run = useCallback(async () => {
    if (!enabled) return null;
    dispatch(setLoading({ scope: "check", loading: true }));
    dispatch(setError({ scope: "check", error: null }));
    try {
      const data = await runTalentCheckAPI({
        profile_id: profileId!,
        company_id: companyId!,
        persist: true,
      });
      dispatch(setTalentCheckResult({ key, data }));
      return data;
    } catch (err) {
      dispatch(
        setError({
          scope: "check",
          error: toErrorMessage(err, "Talent Check evaluation failed."),
        })
      );
      return null;
    } finally {
      dispatch(setLoading({ scope: "check", loading: false }));
    }
  }, [dispatch, enabled, profileId, companyId, key]);

  useEffect(() => {
    if (enabled && !result && !isLoading && !error) {
      void run();
    }
  }, [enabled, result, isLoading, error, run]);

  return { result, run, isLoading, error };
}

/** Real-time client-side What-If simulation hook (<1ms instant updates). */
export function useWhatIf(result?: TalentCheckResult | null) {
  const dispatch = useAppDispatch();
  const key = result ? `${result.profile_id}:${result.company_id}` : "";
  const { whatIf } = useAppSelector((s) => s.talentCheck);

  useEffect(() => {
    if (key && whatIf.key !== key) {
      dispatch(initWhatIf(key));
    }
  }, [key, whatIf.key, dispatch]);

  const setLevel = useCallback(
    (code: string, level: number) => {
      dispatch(setWhatIfOverride({ code, level }));
    },
    [dispatch]
  );

  const reset = useCallback(() => {
    dispatch(resetWhatIf());
  }, [dispatch]);

  // Compute instantaneous local preview
  const preview = useMemo(() => {
    if (!result || !result.skillset_gap) return null;

    const candLevels: number[] = result.skillset_gap.map((g) => {
      const val = whatIf.overrides[g.category_code];
      return typeof val === "number" ? val : g.candidate_level;
    });
    const reqLevels: number[] = result.skillset_gap.map((g) => g.required_level);

    const calculated = scoreLevels(candLevels, reqLevels);

    // Count blocking gaps in preview
    const blockingCount = calculated.blocking.filter(Boolean).length;

    return {
      score: calculated.score,
      verdict: calculated.verdict,
      blocking: calculated.blocking,
      blockingCount,
      candLevels,
      reqLevels,
      isModified: Object.keys(whatIf.overrides).length > 0,
    };
  }, [result, whatIf.overrides]);

  const applyPlan = useCallback(() => {
    if (!result?.study_plan?.steps) return;
    for (const step of result.study_plan.steps) {
      dispatch(setWhatIfOverride({ code: step.category_code, level: step.to_level }));
    }
  }, [dispatch, result]);

  return {
    overrides: whatIf.overrides,
    setLevel,
    reset,
    applyPlan,
    preview,
  };
}

/** Comparative matrix hook. */
export function useTalentMatrix(companyIds: number[] = [4, 78, 24]) {
  const dispatch = useAppDispatch();
  const { matrix, loading, errors } = useAppSelector((s) => s.talentCheck);

  const run = useCallback(async () => {
    dispatch(setLoading({ scope: "matrix", loading: true }));
    dispatch(setError({ scope: "matrix", error: null }));
    try {
      const data = await getTalentMatrixAPI(companyIds);
      dispatch(setTalentMatrix(data));
      return data;
    } catch (err) {
      dispatch(
        setError({
          scope: "matrix",
          error: toErrorMessage(err, "Failed to load comparison matrix."),
        })
      );
      return null;
    } finally {
      dispatch(setLoading({ scope: "matrix", loading: false }));
    }
  }, [dispatch, companyIds]);

  return { matrix, run, isLoading: loading.matrix, error: errors.matrix };
}

/** 115-company ranking hook. */
export function useCompanyRanking(profileId?: string) {
  const dispatch = useAppDispatch();
  const { rankingsByProfile, loading, errors } = useAppSelector((s) => s.talentCheck);

  const ranking = profileId ? rankingsByProfile[profileId] : undefined;

  const run = useCallback(async () => {
    if (!profileId) return null;
    dispatch(setLoading({ scope: "rank", loading: true }));
    dispatch(setError({ scope: "rank", error: null }));
    try {
      const data = await getCompanyRankingAPI(profileId, 115);
      dispatch(setCompanyRanking({ profileId, data }));
      return data;
    } catch (err) {
      dispatch(
        setError({
          scope: "rank",
          error: toErrorMessage(err, "Failed to rank companies."),
        })
      );
      return null;
    } finally {
      dispatch(setLoading({ scope: "rank", loading: false }));
    }
  }, [dispatch, profileId]);

  return { ranking, run, isLoading: loading.rank, error: errors.rank };
}
