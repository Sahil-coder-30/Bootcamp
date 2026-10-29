import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/features/jd/service/jd.api", () => ({
  listJdsAPI: vi.fn().mockResolvedValue([
    {
      jd_id: "jd1",
      company_name: "Google LLC",
      company_id: 4,
      role: "SWE",
      skill_count: 12,
      file_name: "g.pdf",
    },
  ]),
  uploadDocumentAPI: vi.fn(),
  extractJdAPI: vi.fn(),
}));
vi.mock("@/features/resume/service/resume.api", () => ({
  getSampleResumeAPI: vi.fn().mockResolvedValue({ source_type: "resume" }),
  parseResumeAPI: vi.fn(),
}));
vi.mock("@/features/flow/service/flow.api", () => ({
  saveFlowProfileAPI: vi.fn().mockResolvedValue({
    profile_id: "p1",
    created: true,
    warnings: [],
    profile: {
      id: "p1",
      name: "Ananya",
      email: "a@x.com",
      version: 1,
      skills: [],
      skill_levels: {},
    },
  }),
}));
vi.mock("@/features/skillMatch/service/skillMatch.api", () => ({
  runSkillMatchAPI: vi.fn().mockResolvedValue({
    match_score: 81,
    match_band: "strong",
    matched_skills: [],
    missing_skills: [],
  }),
}));
vi.mock("@/features/talentCheck/service/talentCheck.api", () => ({
  runTalentCheckAPI: vi.fn().mockResolvedValue({
    readiness_score: 74,
    verdict: "almost",
    company: "Google LLC",
    top_gaps: [],
  }),
}));

import { useFlow } from "@/features/flow/Hooks/flow.hooks";

describe("useFlow", () => {
  beforeEach(() => sessionStorage.clear());

  it("walks JD -> profile -> match -> check", async () => {
    const { result } = renderHook(() => useFlow());
    await waitFor(() => expect(result.current.library).toHaveLength(1));

    act(() => result.current.pickJd(result.current.library[0]!));
    expect(result.current.jd?.company_id).toBe(4);

    await act(() => result.current.useSample("ananya"));
    expect(result.current.profile?.profile_id).toBe("p1");

    await act(() => result.current.runMatch());
    expect(result.current.match?.match_score).toBe(81);

    await act(() => result.current.runCheck(4));
    expect(result.current.check?.readiness_score).toBe(74);
  });

  it("picking another JD clears the match but keeps the profile", async () => {
    const { result } = renderHook(() => useFlow());
    await waitFor(() => expect(result.current.library).toHaveLength(1));
    act(() => result.current.pickJd(result.current.library[0]!));
    await act(() => result.current.useSample("ananya"));
    act(() => result.current.pickJd(result.current.library[0]!));
    expect(result.current.profile?.profile_id).toBe("p1");
    expect(result.current.match).toBeNull();
  });
});
