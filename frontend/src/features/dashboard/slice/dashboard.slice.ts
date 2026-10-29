import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompanyMatchItem } from "../components/TopCompanyMatchesCard";
import type { DashboardSummary, SkillGapItem, RoadmapStepItem } from "../service/dashboard.api";

export interface DashboardState {
  summary: DashboardSummary | null;
  readinessScore: number;
  topMatches: CompanyMatchItem[];
  skills: SkillGapItem[];
  studyPlan: RoadmapStepItem[];
  selectedSkill: SkillGapItem | null;
  targetCompanyId: number;
  loading: boolean;
  error: string | null;
  isJDModalOpen: boolean;
  isATSModalOpen: boolean;
}

const initialState: DashboardState = {
  summary: null,
  readinessScore: 0,
  topMatches: [],
  skills: [],
  studyPlan: [],
  selectedSkill: null,
  targetCompanyId: 4,
  loading: false,
  error: null,
  isJDModalOpen: false,
  isATSModalOpen: false,
};

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setDashboardSummary: (state, action: PayloadAction<DashboardSummary>) => {
      state.summary = action.payload;
      state.readinessScore = action.payload.readinessScore;
      state.topMatches = action.payload.topMatches;
      state.skills = action.payload.skills;
      state.studyPlan = action.payload.studyPlan.steps;
      if (!state.selectedSkill && action.payload.skills.length > 0) {
        state.selectedSkill = action.payload.skills[0] || null;
      }
    },
    setReadinessScore: (state, action: PayloadAction<number>) => {
      state.readinessScore = action.payload;
    },
    setTopMatches: (state, action: PayloadAction<CompanyMatchItem[]>) => {
      state.topMatches = action.payload;
    },
    setSelectedSkill: (state, action: PayloadAction<SkillGapItem | null>) => {
      state.selectedSkill = action.payload;
    },
    setTargetCompanyId: (state, action: PayloadAction<number>) => {
      state.targetCompanyId = action.payload;
    },
    toggleStudyStep: (state, action: PayloadAction<string>) => {
      state.studyPlan = state.studyPlan.map((s) =>
        s.id === action.payload ? { ...s, completed: !s.completed } : s,
      );
      if (state.summary) {
        state.summary.studyPlan.steps = state.studyPlan;
      }
    },
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setDashboardError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    setJDModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isJDModalOpen = action.payload;
    },
    setATSModalOpen: (state, action: PayloadAction<boolean>) => {
      state.isATSModalOpen = action.payload;
    },
  },
});

export const {
  setDashboardSummary,
  setReadinessScore,
  setTopMatches,
  setSelectedSkill,
  setTargetCompanyId,
  toggleStudyStep,
  setDashboardLoading,
  setDashboardError,
  setJDModalOpen,
  setATSModalOpen,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
