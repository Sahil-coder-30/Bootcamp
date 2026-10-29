import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { FlowJd, StepKey } from "../Hooks/flow.hooks";
import type { FlowProfile } from "../service/flow.api";
import type { SkillMatchResult } from "@/features/skillMatch/service/skillMatch.api";
import type { TalentCheckResult } from "@/features/talentCheck/service/talentCheck.api";

export interface FlowSliceState {
  jd: FlowJd | null;
  profile: FlowProfile | null;
  match: SkillMatchResult | null;
  check: TalentCheckResult | null;
  activeStep: StepKey;
  loading: boolean;
  error: string | null;
}

const initialState: FlowSliceState = {
  jd: null,
  profile: null,
  match: null,
  check: null,
  activeStep: "jd",
  loading: false,
  error: null,
};

export const flowSlice = createSlice({
  name: "flow",
  initialState,
  reducers: {
    setFlowJd: (state, action: PayloadAction<FlowJd | null>) => {
      state.jd = action.payload;
    },
    setFlowProfile: (state, action: PayloadAction<FlowProfile | null>) => {
      state.profile = action.payload;
    },
    setFlowMatch: (state, action: PayloadAction<SkillMatchResult | null>) => {
      state.match = action.payload;
    },
    setFlowCheck: (state, action: PayloadAction<TalentCheckResult | null>) => {
      state.check = action.payload;
    },
    setActiveStep: (state, action: PayloadAction<StepKey>) => {
      state.activeStep = action.payload;
    },
    setFlowLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setFlowError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetFlow: (state) => {
      state.jd = null;
      state.profile = null;
      state.match = null;
      state.check = null;
      state.activeStep = "jd";
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setFlowJd,
  setFlowProfile,
  setFlowMatch,
  setFlowCheck,
  setActiveStep,
  setFlowLoading,
  setFlowError,
  resetFlow,
} = flowSlice.actions;

export default flowSlice.reducer;
