import { act, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";

// Mock apiClient for talentCheck.api tests
vi.mock("@/services/apiClient", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  toErrorMessage: vi.fn((err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback,
  ),
}));

// Mock Recharts ResponsiveContainer to render properly in jsdom
vi.mock("recharts", async () => {
  const original = await vi.importActual<Record<string, unknown>>("recharts");
  return {
    ...original,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <div data-testid="recharts-container" style={{ width: 400, height: 360 }}>
        {children}
      </div>
    ),
  };
});

import { apiClient } from "@/services/apiClient";
import * as api from "@/features/talentCheck/service/talentCheck.api";
import type {
  CompanyBar,
  GapRow,
  RankRow,
  TalentCheckResult,
  TalentMatrixResult,
} from "@/features/talentCheck/service/talentCheck.api";
import {
  useCompanySkillBar,
  useTalentCheck,
  useWhatIf,
  useTalentMatrix,
  useCompanyRanking,
} from "@/features/talentCheck/Hooks/talentCheck.hooks";
import { ReadinessCard } from "@/features/talentCheck/components/ReadinessCard";
import { GapBars } from "@/features/talentCheck/components/GapBars";
import { SkillRadar } from "@/features/talentCheck/components/SkillRadar";
import { WhatIfPanel } from "@/features/talentCheck/components/WhatIfPanel";
import { StudyPlan } from "@/features/talentCheck/components/StudyPlan";
import { NextTopicsList } from "@/features/talentCheck/components/NextTopicsList";
import { HowComputedDrawer } from "@/features/talentCheck/components/HowComputedDrawer";
import { CompanyRanking } from "@/features/talentCheck/components/CompanyRanking";
import { ReadinessHeatmap } from "@/features/talentCheck/components/ReadinessHeatmap";
import { TalentCheckPage } from "@/features/talentCheck/components/TalentCheckPage";
import { Route } from "@/routes/talent-check";
import { makeStore, withStore } from "./utils";

const mockGapRow: GapRow = {
  category_code: "DSA",
  required_level: 8,
  candidate_level: 6,
  gap: true,
  shortfall: 2,
  required_bloom: "CR",
  candidate_bloom: "EV",
  weight: 0.15,
  next_topics: [
    { level: 7, topics: "Segment Trees; Fenwick Trees" },
    { level: 8, topics: "Treaps; Heavy-Light Decomposition" },
  ],
  blocking: false,
  points_lost: 4.5,
};

const mockMetRow: GapRow = {
  category_code: "SQL",
  required_level: 6,
  candidate_level: 7,
  gap: false,
  shortfall: 0,
  required_bloom: "EV",
  candidate_bloom: "CR",
  weight: 0.1,
  next_topics: [],
  blocking: false,
  points_lost: 0,
};

const mockBlockingRow: GapRow = {
  category_code: "SYS",
  required_level: 8,
  candidate_level: 4,
  gap: true,
  shortfall: 4,
  required_bloom: "CR",
  candidate_bloom: "AP",
  weight: 0.15,
  next_topics: [{ level: 5, topics: "Distributed Locking" }],
  blocking: true,
  points_lost: 9.0,
};

const mockResult: TalentCheckResult = {
  company: "Google LLC",
  company_id: 4,
  profile_id: "6f1c-ananya",
  readiness_score: 82,
  verdict: "ready",
  top_gaps: ["SYS", "DSA"],
  scoring_version: "tc-1.0",
  skillset_gap: [mockGapRow, mockMetRow, mockBlockingRow],
  explanation: "Candidate meets hiring bar with minor gaps.",
  readiness_range: { low: 78, high: 86 },
  blocking_gaps: ["SYS"],
  levels_covered: 65,
  levels_needed: 80,
  categories_met: 10,
  study_plan: {
    steps: [
      {
        category_code: "SYS",
        from_level: 4,
        to_level: 8,
        hours: 24,
        topics: "Distributed Systems Fundamentals",
      },
    ],
    total_steps: 1,
    total_hours: 24,
    summary: "Target SYS to clear the single blocking gap.",
  },
  meta: {
    bar_source: "db",
    cached: false,
    latency_ms: 12,
  },
};

const mockBar: CompanyBar = {
  company_id: 4,
  company_name: "Google LLC",
  source: "db",
  rows: [
    {
      skill_set_id: 1,
      category_code: "DSA",
      skill_set_name: "Data Structures & Algorithms",
      required_level: 8,
      bloom_code: "CR",
      bloom_mismatch: false,
    },
  ],
};

const mockMatrix: TalentMatrixResult = {
  companies: [
    { company_id: 4, company_name: "Google LLC" },
    { company_id: 78, company_name: "Microsoft" },
  ],
  profiles: [
    { id: "6f1c-ananya", name: "Ananya Rao" },
    { id: "6f1c-karthik", name: "Karthik" },
  ],
  cells: [
    {
      profile_id: "6f1c-ananya",
      company_id: 4,
      readiness_score: 82,
      verdict: "ready",
      blocking_count: 0,
    },
    {
      profile_id: "6f1c-ananya",
      company_id: 78,
      readiness_score: 74,
      verdict: "almost",
      blocking_count: 1,
    },
    {
      profile_id: "6f1c-karthik",
      company_id: 4,
      readiness_score: 45,
      verdict: "not_yet",
      blocking_count: 3,
    },
  ],
  scoring_version: "tc-1.0",
};

const mockRanking: RankRow[] = [
  {
    company_id: 4,
    company_name: "Google LLC",
    readiness_score: 82,
    verdict: "ready",
    top_gaps: ["SYS"],
    blocking_count: 0,
  },
  {
    company_id: 78,
    company_name: "Microsoft",
    readiness_score: 74,
    verdict: "almost",
    top_gaps: ["DSA"],
    blocking_count: 1,
  },
  {
    company_id: 24,
    company_name: "Oracle",
    readiness_score: 45,
    verdict: "not_yet",
    top_gaps: ["DSA", "OOP"],
    blocking_count: 2,
  },
];

afterEach(() => {
  vi.clearAllMocks();
});

describe("Talent Check API Client", () => {
  it("calls getSkillBarAPI with correct endpoint", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBar });
    const res = await api.getSkillBarAPI(4);
    expect(apiClient.get).toHaveBeenCalledWith("/companies/4/skill-bar");
    expect(res).toEqual(mockBar);
  });

  it("calls runTalentCheckAPI with correct payload", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResult });
    const res = await api.runTalentCheckAPI({
      profile_id: "6f1c-ananya",
      company_id: 4,
      persist: true,
    });
    expect(apiClient.post).toHaveBeenCalledWith("/talent-check", {
      profile_id: "6f1c-ananya",
      company_id: 4,
      persist: true,
    });
    expect(res).toEqual(mockResult);
  });

  it("calls getTalentMatrixAPI with comma-separated ids", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockMatrix });
    const res = await api.getTalentMatrixAPI([4, 78]);
    expect(apiClient.get).toHaveBeenCalledWith("/talent-check/matrix", {
      params: { company_ids: "4,78" },
    });
    expect(res).toEqual(mockMatrix);
  });

  it("calls getCompanyRankingAPI with profile_id and limit", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockRanking });
    const res = await api.getCompanyRankingAPI("6f1c-ananya", 25);
    expect(apiClient.get).toHaveBeenCalledWith("/talent-check/rank", {
      params: { profile_id: "6f1c-ananya", limit: 25 },
    });
    expect(res).toEqual(mockRanking);
  });

  it("calls listTalentChecksAPI", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: [] });
    const res = await api.listTalentChecksAPI("6f1c-ananya");
    expect(apiClient.get).toHaveBeenCalledWith("/talent-check", {
      params: { profile_id: "6f1c-ananya" },
    });
    expect(res).toEqual([]);
  });
});

describe("Talent Check Hooks", () => {
  it("useCompanySkillBar does not fetch when companyId is invalid", () => {
    const { result } = renderHook(() => useCompanySkillBar(0), {
      wrapper: withStore(makeStore()),
    });
    expect(result.current.data).toBeUndefined();
    expect(apiClient.get).not.toHaveBeenCalled();
  });

  it("useCompanySkillBar fetches data and handles errors", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockBar });
    const store = makeStore();
    const { result } = renderHook(() => useCompanySkillBar(4), {
      wrapper: withStore(store),
    });

    await waitFor(() => expect(result.current.data).toEqual(mockBar));
    expect(result.current.isLoading).toBe(false);

    // Test error branch via refetch
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Network failed"));
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.error).toBe("Network failed");
  });

  it("useTalentCheck handles lifecycle, success, and run() trigger", async () => {
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResult });
    const store = makeStore();
    const { result } = renderHook(() => useTalentCheck("6f1c-ananya", 4), {
      wrapper: withStore(store),
    });

    await waitFor(() => expect(result.current.result).toEqual(mockResult));

    // Refetch triggers post again
    vi.mocked(apiClient.post).mockResolvedValueOnce({ data: mockResult });
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.result?.company_id).toBe(4);

    // Error branch
    vi.mocked(apiClient.post).mockRejectedValueOnce(new Error("Server 500"));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBe("Server 500");
  });

  it("useWhatIf calculates live previews, sets levels, and applies plan", () => {
    const store = makeStore();
    const { result } = renderHook(() => useWhatIf(mockResult), {
      wrapper: withStore(store),
    });

    expect(result.current.preview).not.toBeNull();
    expect(result.current.preview?.score).toBeGreaterThan(0);

    // Adjust a level
    act(() => {
      result.current.setLevel("SYS", 8);
    });
    expect(result.current.overrides["SYS"]).toBe(8);

    // Apply study plan
    act(() => {
      result.current.applyPlan();
    });
    expect(result.current.overrides["SYS"]).toBe(8);

    // Reset
    act(() => {
      result.current.reset();
    });
    expect(result.current.overrides).toEqual({});
  });

  it("useTalentMatrix fetches comparative data", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockMatrix });
    const store = makeStore();
    const { result } = renderHook(() => useTalentMatrix([4, 78]), {
      wrapper: withStore(store),
    });

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.matrix).toEqual(mockMatrix);

    // Error branch
    vi.mocked(apiClient.get).mockRejectedValueOnce(new Error("Matrix error"));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.error).toBe("Matrix error");
  });

  it("useCompanyRanking runs ranking lookup", async () => {
    vi.mocked(apiClient.get).mockResolvedValueOnce({ data: mockRanking });
    const store = makeStore();
    const { result } = renderHook(() => useCompanyRanking("6f1c-ananya"), {
      wrapper: withStore(store),
    });

    await act(async () => {
      await result.current.run();
    });
    expect(result.current.ranking).toEqual(mockRanking);

    // Handles missing profileId
    const { result: emptyHook } = renderHook(() => useCompanyRanking(undefined), {
      wrapper: withStore(makeStore()),
    });
    await act(async () => {
      const res = await emptyHook.current.run();
      expect(res).toBeNull();
    });
  });
});

describe("Talent Check UI Components", () => {
  it("ReadinessCard renders scores, badges, and confidence range", () => {
    const { rerender } = render(
      <ReadinessCard
        score={82}
        verdict="ready"
        blockingCount={0}
        levelsCovered={65}
        levelsNeeded={80}
        categoriesMet={10}
        readinessRange={{ low: 78, high: 86 }}
        companyName="Google LLC"
        candidateName="Ananya Rao"
        source="snapshot"
        isWhatIf={true}
      />,
    );

    expect(screen.getByText("82")).toBeInTheDocument();
    expect(screen.getByText("Ready for Role")).toBeInTheDocument();
    expect(screen.getByText(/78 – 86/)).toBeInTheDocument();
    expect(screen.getByText("Offline Snapshot")).toBeInTheDocument();
    expect(screen.getByText("Live What-If Preview")).toBeInTheDocument();

    // Rerender as almost with blocking gaps
    rerender(
      <ReadinessCard
        score={68}
        verdict="almost"
        blockingCount={2}
        companyName="Microsoft"
        candidateName="Karthik"
      />,
    );
    expect(screen.getByText("Almost Ready")).toBeInTheDocument();
    expect(screen.getByText(/held back by 2 critical gaps/)).toBeInTheDocument();

    // Rerender as not_yet
    rerender(
      <ReadinessCard
        score={42}
        verdict="not_yet"
        blockingCount={4}
        companyName="Oracle"
        candidateName="Priya"
      />,
    );
    expect(screen.getByText("Needs Preparation")).toBeInTheDocument();
  });

  it("GapBars renders rows and handles onSelectCode", () => {
    const onSelect = vi.fn();
    render(
      <GapBars
        rows={[mockGapRow, mockMetRow, mockBlockingRow]}
        selectedCode="DSA"
        onSelectCode={onSelect}
      />,
    );

    expect(screen.getAllByText("L6 (EV)")[0]).toBeInTheDocument();
    expect(screen.getAllByText("L8 (CR)")[0]).toBeInTheDocument();
    expect(screen.getByText("Blocking")).toBeInTheDocument();
    expect(screen.getByText("Met")).toBeInTheDocument();

    fireEvent.click(screen.getAllByText("SQL")[0]!);
    expect(onSelect).toHaveBeenCalledWith("SQL");
  });

  it("SkillRadar renders legend and axes", () => {
    render(
      <SkillRadar
        rows={[mockGapRow, mockMetRow]}
        candidateName="Ananya"
        companyName="Google LLC"
      />,
    );
    expect(screen.getByText("Ananya")).toBeInTheDocument();
    expect(screen.getByText("Google LLC")).toBeInTheDocument();
    expect(screen.getByTestId("recharts-container")).toBeInTheDocument();
  });

  it("WhatIfPanel handles slider adjustments and button actions", () => {
    const onSetLevel = vi.fn();
    const onReset = vi.fn();
    const onApplyPlan = vi.fn();
    const onSave = vi.fn();

    render(
      <WhatIfPanel
        result={mockResult}
        overrides={{ DSA: 7 }}
        previewScore={86}
        previewVerdict="ready"
        previewBlockingCount={0}
        onSetLevel={onSetLevel}
        onReset={onReset}
        onApplyPlan={onApplyPlan}
        onSave={onSave}
      />,
    );

    expect(screen.getByText("What-If Simulation Sandbox")).toBeInTheDocument();
    expect(screen.getByText("+4")).toBeInTheDocument();

    // Click Apply
    fireEvent.click(screen.getByText("Apply Fastest Path to Ready"));
    expect(onApplyPlan).toHaveBeenCalled();

    // Click Reset
    fireEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalled();

    // Click Save
    fireEvent.click(screen.getByText("Save as My Level"));
    expect(onSave).toHaveBeenCalled();

    // Adjust slider
    const sliders = screen.getAllByRole("slider");
    expect(sliders.length).toBeGreaterThan(0);
    fireEvent.change(sliders[0]!, { target: { value: "8" } });
    expect(onSetLevel).toHaveBeenCalled();
  });

  it("StudyPlan renders milestones and triggers onApplyPlan", () => {
    const onApply = vi.fn();
    const { rerender } = render(<StudyPlan plan={mockResult.study_plan} onApplyPlan={onApply} />);

    expect(screen.getByText("Fastest Path to Ready")).toBeInTheDocument();
    expect(screen.getByText("24 Hours Total")).toBeInTheDocument();
    expect(screen.getByText("Distributed Systems Fundamentals")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Simulate in What-If"));
    expect(onApply).toHaveBeenCalled();

    // Empty state
    rerender(<StudyPlan plan={null} />);
    expect(
      screen.getByText("Candidate already meets or exceeds the required hiring bar."),
    ).toBeInTheDocument();
  });

  it("NextTopicsList renders curriculum details and empty state", () => {
    const { rerender } = render(
      <NextTopicsList rows={[mockGapRow, mockMetRow]} selectedCode="DSA" />,
    );

    expect(screen.getByText(/Target Level 7/)).toBeInTheDocument();
    expect(screen.getByText("Segment Trees")).toBeInTheDocument();
    expect(screen.getByText("Fenwick Trees")).toBeInTheDocument();

    // Empty state when selecting met code
    rerender(<NextTopicsList rows={[mockMetRow]} selectedCode="SQL" />);
    expect(
      screen.getByText("No gaps selected or candidate meets requirements in this category."),
    ).toBeInTheDocument();
  });

  it("HowComputedDrawer opens and closes", () => {
    const onClose = vi.fn();
    const { rerender } = render(
      <HowComputedDrawer isOpen={false} onClose={onClose} result={mockResult} />,
    );
    expect(screen.queryByText("How This Was Computed")).not.toBeInTheDocument();

    rerender(<HowComputedDrawer isOpen={true} onClose={onClose} result={mockResult} />);
    expect(screen.getByText("How This Was Computed")).toBeInTheDocument();
    expect(screen.getByText("readiness = 100 * sum(covered) / sum(needed)")).toBeInTheDocument();

    const closeBtn = screen.getByText("Close Audit Trail");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("CompanyRanking filters and selects company", async () => {
    const onSelect = vi.fn();
    render(<CompanyRanking ranking={mockRanking} onSelectCompany={onSelect} />);

    expect(screen.getByText("Google LLC")).toBeInTheDocument();
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
    expect(screen.getByText("Oracle")).toBeInTheDocument();

    // Filter by search
    const searchInput = screen.getByPlaceholderText("Search company...");
    await userEvent.type(searchInput, "Google");
    expect(screen.getByText("Google LLC")).toBeInTheDocument();
    expect(screen.queryByText("Oracle")).not.toBeInTheDocument();

    // Clear search and filter by verdict
    await userEvent.clear(searchInput);
    const almostFilterBtn = screen.getByRole("button", { name: /Almost/i });
    fireEvent.click(almostFilterBtn);
    expect(screen.getByText("Microsoft")).toBeInTheDocument();
    expect(screen.queryByText("Google LLC")).not.toBeInTheDocument();

    // Click select
    fireEvent.click(screen.getByText("Microsoft"));
    expect(onSelect).toHaveBeenCalledWith(78);
  });

  it("ReadinessHeatmap renders matrix cells and triggers onSelectCell", () => {
    const onSelectCell = vi.fn();
    const { rerender } = render(
      <ReadinessHeatmap matrix={mockMatrix} onSelectCell={onSelectCell} />,
    );

    expect(screen.getByText("Candidate Comparison Matrix")).toBeInTheDocument();
    expect(screen.getByText("Ananya Rao")).toBeInTheDocument();
    expect(screen.getByText("Karthik")).toBeInTheDocument();

    const scoreCell = screen.getByText("82");
    fireEvent.click(scoreCell);
    expect(onSelectCell).toHaveBeenCalledWith("6f1c-ananya", 4);

    // Empty matrix
    rerender(<ReadinessHeatmap matrix={null} />);
    expect(screen.getByText("No matrix data available.")).toBeInTheDocument();
  });

  it("TalentCheckPage renders with full interactivity and tab switching", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: mockResult });
    vi.mocked(apiClient.get).mockImplementation(async (url: string) => {
      if (url.includes("/matrix")) return { data: mockMatrix };
      if (url.includes("/rank")) return { data: mockRanking };
      return { data: [] };
    });

    const store = makeStore();
    render(<TalentCheckPage />, { wrapper: withStore(store) });

    expect(screen.getByText("Talent Check")).toBeInTheDocument();

    // Wait for the talent check result to load (what-if preview calculates 68 from gap rows)
    await waitFor(() => expect(screen.getByText("68")).toBeInTheDocument());

    // Open math drawer
    const auditBtn = screen.getByText("Audit Math & Provenance");
    fireEvent.click(auditBtn);
    expect(screen.getByText("How This Was Computed")).toBeInTheDocument();

    // Close math drawer
    const closeDrawerBtn = screen.getByText("Close Audit Trail");
    fireEvent.click(closeDrawerBtn);

    // Switch to what-if tab
    const whatIfTab = screen.getByText(/What-If Simulator/i);
    fireEvent.click(whatIfTab);
    expect(screen.getByText("What-If Simulation Sandbox")).toBeInTheDocument();

    // Switch to study tab
    const studyTab = screen.getByText(/Fastest Path & Curriculum/i);
    fireEvent.click(studyTab);
    expect(screen.getByText("Fastest Path to Ready")).toBeInTheDocument();

    // Switch to ranking tab
    const rankingTab = screen.getByText(/115-Company Rankings/i);
    fireEvent.click(rankingTab);
    expect(screen.getByText("Which Companies Am I Ready For?")).toBeInTheDocument();

    // Switch to matrix tab
    const matrixTab = screen.getByText(/Compare All/i);
    fireEvent.click(matrixTab);
    await waitFor(() =>
      expect(screen.getByText("Candidate Comparison Matrix")).toBeInTheDocument(),
    );
  });

  it("talent-check route definition provides meta header information", () => {
    expect(Route.options.component).toBe(TalentCheckPage);
    expect(typeof Route.options.head).toBe("function");
  });
});
