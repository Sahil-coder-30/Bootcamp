import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompanyMatchItem } from "../components/TopCompanyMatchesCard";
import type { SkillItem } from "../components/SkillHistogramCard";

export interface DashboardState {
  readinessScore: number;
  topMatches: CompanyMatchItem[];
  selectedSkill: SkillItem | null;
  loading: boolean;
  error: string | null;
}

const initialState: DashboardState = {
  readinessScore: 78,
  topMatches: [],
  selectedSkill: null,
  loading: false,
  error: null,
};

export const dashboardSlice = createSlice({
  name: "dashboard",
  initialState,
  reducers: {
    setReadinessScore: (state, action: PayloadAction<number>) => {
      state.readinessScore = action.payload;
    },
    setTopMatches: (state, action: PayloadAction<CompanyMatchItem[]>) => {
      state.topMatches = action.payload;
    },
    setSelectedSkill: (state, action: PayloadAction<SkillItem | null>) => {
      state.selectedSkill = action.payload;
    },
    setDashboardLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setDashboardError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setReadinessScore,
  setTopMatches,
  setSelectedSkill,
  setDashboardLoading,
  setDashboardError,
} = dashboardSlice.actions;

export default dashboardSlice.reducer;
