/**
 * flow.hooks.ts
 * State machine for the guided flow: JD -> resume + profile -> skill match -> talent check.
 * The ids are kept in sessionStorage so a refresh does not lose the demo.
 */

import { useCallback, useEffect, useState } from "react";
import { toErrorMessage } from "@/services/apiClient";
import {
  extractJdAPI,
  listJdsAPI,
  uploadDocumentAPI,
  type JdSummary,
} from "@/features/jd/service/jd.api";
import { getSampleResumeAPI, parseResumeAPI } from "@/features/resume/service/resume.api";
import {
  runSkillMatchAPI,
  type SkillMatchResult,
} from "@/features/skillMatch/service/skillMatch.api";
import {
  runTalentCheckAPI,
  type TalentCheckResult,
} from "@/features/talentCheck/service/talentCheck.api";
import { saveFlowProfileAPI, type FlowProfile } from "../service/flow.api";

export type StepKey = "jd" | "resume" | "match" | "check";

export interface FlowJd {
  jd_id: string;
  company: string | null;
  company_id: number | null;
  role: string | null;
  skill_count: number;
}

interface FlowState {
  jd: FlowJd | null;
  profile: FlowProfile | null;
  match: SkillMatchResult | null;
  check: TalentCheckResult | null;
}

const KEY = "flow-state-v1";
const EMPTY: FlowState = { jd: null, profile: null, match: null, check: null };

function load(): FlowState {
  try {
    return { ...EMPTY, ...(JSON.parse(sessionStorage.getItem(KEY) ?? "{}") as Partial<FlowState>) };
  } catch {
    return EMPTY;
  }
}

const toBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export function useFlow() {
  const [state, setState] = useState<FlowState>(load);
  const [busy, setBusy] = useState<StepKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [library, setLibrary] = useState<JdSummary[]>([]);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage unavailable: the flow still works for this page load
    }
  }, [state]);

  const loadLibrary = useCallback(async () => {
    try {
      setLibrary(await listJdsAPI());
    } catch (err) {
      setError(toErrorMessage(err, "Something went wrong."));
    }
  }, []);

  useEffect(() => {
    void loadLibrary();
  }, [loadLibrary]);

  const run = useCallback(async <T>(step: StepKey, fn: () => Promise<T>): Promise<T | null> => {
    setBusy(step);
    setError(null);
    try {
      return await fn();
    } catch (err) {
      setError(toErrorMessage(err, "Something went wrong."));
      return null;
    } finally {
      setBusy(null);
    }
  }, []);

  const pickJd = useCallback((s: JdSummary) => {
    setState((prev) => ({
      ...prev,
      match: null,
      check: null,
      jd: {
        jd_id: s.jd_id,
        company: s.company_name,
        company_id: s.company_id,
        role: s.role,
        skill_count: s.skill_count,
      },
    }));
  }, []);

  const uploadJd = useCallback(
    (file: File) =>
      run("jd", async () => {
        const doc = await uploadDocumentAPI(file, "jd");
        const ex = await extractJdAPI({ document_id: doc.document_id });
        setState((prev) => ({
          ...prev,
          match: null,
          check: null,
          jd: {
            jd_id: ex.jd_id ?? doc.document_id,
            company: ex.company,
            company_id: ex.company_id,
            role: ex.role,
            skill_count: ex.skills.length,
          },
        }));
        void loadLibrary();
      }),
    [run, loadLibrary],
  );

  const useSample = useCallback(
    (key: string) =>
      run("resume", async () => {
        const extraction = await getSampleResumeAPI(key);
        const profile = await saveFlowProfileAPI(extraction);
        setState((s) => ({ ...s, profile, match: null, check: null }));
      }),
    [run],
  );

  const uploadResume = useCallback(
    (file: File) =>
      run("resume", async () => {
        const extraction = await parseResumeAPI({
          content_b64: await toBase64(file),
          file_name: file.name,
          mime: file.type,
        });
        const profile = await saveFlowProfileAPI(extraction);
        setState((s) => ({ ...s, profile, match: null, check: null }));
      }),
    [run],
  );

  const runMatch = useCallback(
    () =>
      run("match", async () => {
        if (!state.jd || !state.profile) return;
        const match = await runSkillMatchAPI({
          profile_id: state.profile.profile_id,
          jd_id: state.jd.jd_id,
          refresh: true,
        });
        setState((s) => ({ ...s, match }));
      }),
    [run, state.jd, state.profile],
  );

  const runCheck = useCallback(
    (companyId: number) =>
      run("check", async () => {
        if (!state.profile) return;
        const check = await runTalentCheckAPI({
          profile_id: state.profile.profile_id,
          company_id: companyId,
          persist: false,
        });
        setState((s) => ({ ...s, check }));
      }),
    [run, state.profile],
  );

  const reset = useCallback(() => setState(EMPTY), []);

  return {
    ...state,
    library,
    busy,
    error,
    pickJd,
    uploadJd,
    useSample,
    uploadResume,
    runMatch,
    runCheck,
    reset,
  };
}
