import { describe, it, expect, vi, beforeEach } from "vitest";
import { getDashboardSummaryAPI } from "@/features/dashboard/service/dashboard.api";
import { apiClient } from "@/services/apiClient";

vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  toErrorMessage: vi.fn((err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
  ),
}));

describe("Dashboard Service & Candidate Profile Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns hasData: false with clean user info when candidate has no profile", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("Profile not found"));

    const result = await getDashboardSummaryAPI("", 4, {
      name: "Rahul Sharma",
      email: "rahul@example.com",
      role: "B.Tech CSE (IIT Delhi)",
    });

    expect(result.hasData).toBe(false);
    expect(result.candidateName).toBe("Rahul Sharma");
    expect(result.email).toBe("rahul@example.com");
    expect(result.education).toBe("B.Tech CSE (IIT Delhi)");
    expect(result.education).not.toContain("XYZ Institute");
    expect(result.readinessScore).toBe(0);
    expect(result.skills).toHaveLength(0);
    expect(result.targetCompany.verdict).toBe("not_uploaded");
  });

  it("does not bypass or return dummy Ananya seed when candidateId is unknown", async () => {
    vi.mocked(apiClient.get).mockRejectedValue(new Error("404"));

    const result = await getDashboardSummaryAPI("unknown-user-id", 4, {
      name: "Priya Patel",
      email: "priya@example.com",
    });

    expect(result.hasData).toBe(false);
    expect(result.candidateName).toBe("Priya Patel");
    expect(result.email).toBe("priya@example.com");
    expect(result.candidateId).toBe("unknown-user-id");
    expect(result.education).not.toContain("XYZ Institute");
  });

  it("handles empty profile with no skills as hasData: false", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      data: {
        id: "profile-123",
        name: "Vikram Singh",
        email: "vikram@example.com",
        skill_levels: {},
      },
    });

    const result = await getDashboardSummaryAPI("profile-123", 4);

    expect(result.hasData).toBe(false);
    expect(result.candidateName).toBe("Vikram Singh");
    expect(result.readinessScore).toBe(0);
    expect(result.skills).toHaveLength(0);
  });

  it("returns real candidate data when profile with skills is resolved", async () => {
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.startsWith("/profiles/")) {
        return {
          data: {
            id: "profile-real",
            name: "John Doe",
            email: "john@doe.com",
            education: "B.Tech Computer Science, NIT Trichy",
            skill_levels: {
              COD: { level: 6 },
              DSA: { level: 5 },
            },
          },
        };
      }
      if (url === "/talent-check/rank") {
        return {
          data: [
            {
              company_id: 4,
              company_name: "Google LLC",
              readiness_score: 78,
              verdict: "ready",
            },
          ],
        };
      }
      return { data: null };
    });

    vi.mocked(apiClient.post).mockResolvedValue({
      data: {
        company: "Google LLC",
        company_id: 4,
        readiness_score: 78,
        verdict: "ready",
        top_gaps: [],
        explanation: "Strong skills",
        blocking_gaps: [],
        levels_covered: 11,
        levels_needed: 72,
        categories_met: 2,
        skillset_gap: [
          {
            category_code: "COD",
            required_level: 6,
            candidate_level: 6,
            gap: false,
            shortfall: 0,
            required_bloom: "EV",
            candidate_bloom: "EV",
            weight: 0.083,
            blocking: false,
          },
        ],
        study_plan: {
          steps: [],
          total_steps: 0,
          total_hours: 0,
          summary: "Plan",
        },
      },
    });

    const result = await getDashboardSummaryAPI("profile-real", 4);

    expect(result.hasData).toBe(true);
    expect(result.candidateName).toBe("John Doe");
    expect(result.email).toBe("john@doe.com");
    expect(result.education).toBe("B.Tech Computer Science, NIT Trichy");
    expect(result.education).not.toContain("XYZ Institute");
    expect(result.readinessScore).toBe(78);
    expect(result.skills).toHaveLength(1);
    expect(result.skills[0]?.code).toBe("COD");
  });

  describe("Dashboard Slice pure sync reducers & 4-layer contract", () => {
    it("purely manages modal states and loading/error states", async () => {
      const {
        dashboardSlice,
        setJDModalOpen,
        setATSModalOpen,
        setDashboardLoading,
        setDashboardError,
        toggleStudyStep,
      } = await import("@/features/dashboard/slice/dashboard.slice");

      const state0 = dashboardSlice.reducer(undefined, { type: "@@INIT" });
      expect(state0.isJDModalOpen).toBe(false);
      expect(state0.isATSModalOpen).toBe(false);
      expect(state0.loading).toBe(false);
      expect(state0.error).toBeNull();

      const state1 = dashboardSlice.reducer(state0, setJDModalOpen(true));
      expect(state1.isJDModalOpen).toBe(true);

      const state2 = dashboardSlice.reducer(state1, setATSModalOpen(true));
      expect(state2.isATSModalOpen).toBe(true);

      const state3 = dashboardSlice.reducer(state2, setDashboardError("Network Error"));
      expect(state3.error).toBe("Network Error");

      const state4 = dashboardSlice.reducer(state3, setDashboardLoading(true));
      expect(state4.loading).toBe(true);

      const stateWithSteps = {
        ...state4,
        studyPlan: [
          {
            id: "step-1",
            categoryCode: "COD",
            categoryName: "Coding",
            fromLevel: 4,
            toLevel: 6,
            hours: 24,
            topics: "Recursion",
            completed: false,
          },
        ],
      };
      const state5 = dashboardSlice.reducer(stateWithSteps, toggleStudyStep("step-1"));
      expect(state5.studyPlan[0]?.completed).toBe(true);

      const state6 = dashboardSlice.reducer(state5, toggleStudyStep("step-1"));
      expect(state6.studyPlan[0]?.completed).toBe(false);
    });
  });
});
