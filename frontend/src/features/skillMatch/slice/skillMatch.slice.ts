/**
 * skillMatch.slice.ts
 * Redux Toolkit slice for Skill Matching. Pure sync reducers.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { MatchMethod, SkillMatchMatrix, SkillMatchResult } from "../service/skillMatch.api";

export interface SkillMatchState {
  byKey: Record<string, SkillMatchResult>; // key `${profileId}:${jdId}`
  loadingKey: string | null;
  error: string | null;
  matrix: SkillMatchMatrix | null;
  matrixLoading: boolean;
  matrixError: string | null;
  selectedProfileId: string;
  selectedJdId: string;
  ui: {
    hoveredJdSkill: string | null;
    methodFilter: MatchMethod[];
  };
}

const initialState: SkillMatchState = {
  byKey: {},
  loadingKey: null,
  error: null,
  matrix: null,
  matrixLoading: false,
  matrixError: null,
  selectedProfileId: "",
  selectedJdId: "",
  ui: {
    hoveredJdSkill: null,
    methodFilter: [],
  },
};

export const skillMatchSlice = createSlice({
  name: "skillMatch",
  initialState,
  reducers: {
    setMatchLoading: (state, action: PayloadAction<string | null>) => {
      state.loadingKey = action.payload;
      if (action.payload) {
        state.error = null;
      }
    },
    setMatchResult: (state, action: PayloadAction<{ key: string; result: SkillMatchResult }>) => {
      state.byKey[action.payload.key] = action.payload.result;
      state.loadingKey = null;
      state.error = null;
    },
    setMatchError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loadingKey = null;
    },
    setMatrixLoading: (state, action: PayloadAction<boolean>) => {
      state.matrixLoading = action.payload;
      if (action.payload) {
        state.matrixError = null;
      }
    },
    setMatrix: (state, action: PayloadAction<SkillMatchMatrix>) => {
      state.matrix = action.payload;
      state.matrixLoading = false;
      state.matrixError = null;
    },
    setMatrixError: (state, action: PayloadAction<string | null>) => {
      state.matrixError = action.payload;
      state.matrixLoading = false;
    },
    setSelectedProfileId: (state, action: PayloadAction<string>) => {
      state.selectedProfileId = action.payload;
    },
    setSelectedJdId: (state, action: PayloadAction<string>) => {
      state.selectedJdId = action.payload;
    },
    setSelection: (
      state,
      action: PayloadAction<{ profileId?: string; jdId?: string }>,
    ) => {
      if (action.payload.profileId !== undefined) {
        state.selectedProfileId = action.payload.profileId;
      }
      if (action.payload.jdId !== undefined) {
        state.selectedJdId = action.payload.jdId;
      }
    },
    setHoveredJdSkill: (state, action: PayloadAction<string | null>) => {
      state.ui.hoveredJdSkill = action.payload;
    },
    toggleMethodFilter: (state, action: PayloadAction<MatchMethod>) => {
      const idx = state.ui.methodFilter.indexOf(action.payload);
      if (idx >= 0) {
        state.ui.methodFilter.splice(idx, 1);
      } else {
        state.ui.methodFilter.push(action.payload);
      }
    },
    clearMethodFilter: (state) => {
      state.ui.methodFilter = [];
    },
  },
});

export const {
  setMatchLoading,
  setMatchResult,
  setMatchError,
  setMatrixLoading,
  setMatrix,
  setMatrixError,
  setSelectedProfileId,
  setSelectedJdId,
  setSelection,
  setHoveredJdSkill,
  toggleMethodFilter,
  clearMethodFilter,
} = skillMatchSlice.actions;

export default skillMatchSlice.reducer;
