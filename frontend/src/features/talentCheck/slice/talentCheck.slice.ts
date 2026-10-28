/**
 * talentCheck.slice.ts
 * Synchronous Redux Toolkit slice for Role 4: Talent Check.
 * Follows frontend-arch-init rules: synchronous reducers only, no async thunks.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  CompanyBar,
  RankRow,
  TalentCheckResult,
  TalentMatrixResult,
} from "../service/talentCheck.api";

interface TalentCheckState {
  barsByCompany: Record<number, CompanyBar>;
  resultsByKey: Record<string, TalentCheckResult>;
  matrix: TalentMatrixResult | null;
  rankingsByProfile: Record<string, RankRow[]>;
  whatIf: {
    key: string | null;
    overrides: Record<string, number>;
  };
  loading: {
    bar: boolean;
    check: boolean;
    matrix: boolean;
    rank: boolean;
  };
  errors: {
    bar: string | null;
    check: string | null;
    matrix: string | null;
    rank: string | null;
  };
}

const initialState: TalentCheckState = {
  barsByCompany: {},
  resultsByKey: {},
  matrix: null,
  rankingsByProfile: {},
  whatIf: {
    key: null,
    overrides: {},
  },
  loading: {
    bar: false,
    check: false,
    matrix: false,
    rank: false,
  },
  errors: {
    bar: null,
    check: null,
    matrix: null,
    rank: null,
  },
};

const talentCheckSlice = createSlice({
  name: "talentCheck",
  initialState,
  reducers: {
    setCompanyBar(state, action: PayloadAction<{ id: number; data: CompanyBar }>) {
      state.barsByCompany[action.payload.id] = action.payload.data;
      state.errors.bar = null;
    },
    setTalentCheckResult(state, action: PayloadAction<{ key: string; data: TalentCheckResult }>) {
      state.resultsByKey[action.payload.key] = action.payload.data;
      state.errors.check = null;
    },
    setTalentMatrix(state, action: PayloadAction<TalentMatrixResult>) {
      state.matrix = action.payload;
      state.errors.matrix = null;
    },
    setCompanyRanking(state, action: PayloadAction<{ profileId: string; data: RankRow[] }>) {
      state.rankingsByProfile[action.payload.profileId] = action.payload.data;
      state.errors.rank = null;
    },
    initWhatIf(state, action: PayloadAction<string>) {
      state.whatIf.key = action.payload;
      state.whatIf.overrides = {};
    },
    setWhatIfOverride(state, action: PayloadAction<{ code: string; level: number }>) {
      state.whatIf.overrides[action.payload.code] = action.payload.level;
    },
    resetWhatIf(state) {
      state.whatIf.overrides = {};
    },
    setLoading(
      state,
      action: PayloadAction<{ scope: keyof TalentCheckState["loading"]; loading: boolean }>,
    ) {
      state.loading[action.payload.scope] = action.payload.loading;
    },
    setError(
      state,
      action: PayloadAction<{ scope: keyof TalentCheckState["errors"]; error: string | null }>,
    ) {
      state.errors[action.payload.scope] = action.payload.error;
    },
  },
});

export const {
  setCompanyBar,
  setTalentCheckResult,
  setTalentMatrix,
  setCompanyRanking,
  initWhatIf,
  setWhatIfOverride,
  resetWhatIf,
  setLoading,
  setError,
} = talentCheckSlice.actions;

export default talentCheckSlice.reducer;
