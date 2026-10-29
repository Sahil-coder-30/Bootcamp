import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { PlatformStats } from "../service/landing.api";

export interface LandingState {
  stats: PlatformStats;
  selectedTier: "All" | "Super Dream" | "Dream" | "Standard" | "Regular";
  loading: boolean;
  error: string | null;
}

const initialState: LandingState = {
  stats: {
    recruiterCount: 115,
    maxCtcLpa: 55,
    bloomTopicsCount: 1380,
    verifiedYear: "2025–26",
  },
  selectedTier: "All",
  loading: false,
  error: null,
};

export const landingSlice = createSlice({
  name: "landing",
  initialState,
  reducers: {
    setLandingStats: (state, action: PayloadAction<PlatformStats>) => {
      state.stats = action.payload;
    },
    setSelectedTier: (
      state,
      action: PayloadAction<"All" | "Super Dream" | "Dream" | "Standard" | "Regular">,
    ) => {
      state.selectedTier = action.payload;
    },
    setLandingLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setLandingError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
  },
});

export const {
  setLandingStats,
  setSelectedTier,
  setLandingLoading,
  setLandingError,
} = landingSlice.actions;

export default landingSlice.reducer;
