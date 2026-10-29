import { describe, it, expect } from "vitest";
import skillMatchReducer, {
  setMatchResult,
  setMatchLoading,
  setSelectedProfileId,
  setSelectedJdId,
  setSelection,
  setHoveredJdSkill,
  toggleMethodFilter,
} from "./slice/skillMatch.slice";
import type { SkillMatchResult } from "./service/skillMatch.api";

const mockResult: SkillMatchResult = {
  jd_source_file: "google_swe.pdf",
  match_score: 71,
  match_band: "good",
  jd_id: "b2f4-google-swe",
  profile_id: "6f1c-ananya",
  matched_skills: [
    {
      jd_skill: "Distributed systems",
      candidate_skill: "Kafka event pipeline",
      category_code: "SYSD",
      method: "llm",
      similarity: 0.82,
      requirement: "must",
      evidence: "Built Kafka pipeline",
      credit: 0.9,
    },
  ],
  missing_skills: [
    {
      skill_name: "Kubernetes",
      category_code: "CLOUD",
      requirement: "must",
      why_it_matters: "Hands-on experience required. Closing it adds about 8 points.",
      closest_candidate_skill: "Docker",
      learn_next: "Pods, Deployments, Services",
      gap_type: "missing",
      effort: "quick_win",
      impact_points: 8,
      priority: 1,
    },
  ],
  category_coverage: { COD: 1.0, SYSD: 0.72, CLOUD: 0.13 },
  score_breakdown: {
    must_coverage: 0.713,
    nice_coverage: 0.485,
    level_fit: 0.943,
    raw_score: 71.3,
    cap: 90,
    cap_reason: "1 must-have skill missing",
    weights: { must: 0.6, nice: 0.2, level: 0.2 },
  },
  matching_version: "sm-1.0",
  meta: {
    taxonomy_version: "tx-1.0",
    prompt_version: "sm-adj-v1",
    stage_counts: { exact: 2, alias: 1, llm: 1 },
    llm_calls: 1,
    llm_pairs: 3,
    latency_ms: 120.5,
    cached: false,
    warnings: [],
  },
};

describe("Skill Match Redux Slice", () => {
  it("initializes with empty selection and allows dynamic selection", () => {
    let state = skillMatchReducer(undefined, { type: "@@INIT" });
    expect(state.selectedProfileId).toBe("");
    expect(state.selectedJdId).toBe("");
    expect(state.loadingKey).toBeNull();

    state = skillMatchReducer(state, setSelectedProfileId("6f1c-ananya"));
    state = skillMatchReducer(state, setSelectedJdId("b2f4-google-swe"));
    expect(state.selectedProfileId).toBe("6f1c-ananya");
    expect(state.selectedJdId).toBe("b2f4-google-swe");

    state = skillMatchReducer(state, setSelection({ profileId: "new-p", jdId: "new-j" }));
    expect(state.selectedProfileId).toBe("new-p");
    expect(state.selectedJdId).toBe("new-j");
  });

  it("stores match result by compound key", () => {
    let state = skillMatchReducer(undefined, setMatchLoading("6f1c-ananya:b2f4-google-swe"));
    expect(state.loadingKey).toBe("6f1c-ananya:b2f4-google-swe");

    state = skillMatchReducer(
      state,
      setMatchResult({
        key: "6f1c-ananya:b2f4-google-swe",
        result: mockResult,
      }),
    );
    expect(state.loadingKey).toBeNull();
    expect(state.byKey["6f1c-ananya:b2f4-google-swe"]!.match_score).toBe(71);
  });

  it("toggles method filter", () => {
    let state = skillMatchReducer(undefined, toggleMethodFilter("exact"));
    expect(state.ui.methodFilter).toContain("exact");

    state = skillMatchReducer(state, toggleMethodFilter("exact"));
    expect(state.ui.methodFilter).not.toContain("exact");
  });
});
