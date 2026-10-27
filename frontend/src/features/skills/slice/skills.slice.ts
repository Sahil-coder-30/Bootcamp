import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompanySkillsData } from "../service/skills.api";

interface SkillsState {
  /** Skill matrix cached by company id. */
  byCompany: Record<number, CompanySkillsData>;
  loadingId: number | null;
  errors: Record<number, string>;
}

const initialState: SkillsState = { byCompany: {}, loadingId: null, errors: {} };

const skillsSlice = createSlice({
  name: "skills",
  initialState,
  reducers: {
    setCompanySkills(state, action: PayloadAction<{ id: number; data: CompanySkillsData }>) {
      state.byCompany[action.payload.id] = action.payload.data;
      delete state.errors[action.payload.id];
    },
    setSkillsLoading(state, action: PayloadAction<number | null>) {
      state.loadingId = action.payload;
    },
    setSkillsError(state, action: PayloadAction<{ id: number; error: string | null }>) {
      if (action.payload.error) state.errors[action.payload.id] = action.payload.error;
      else delete state.errors[action.payload.id];
    },
  },
});

export const { setCompanySkills, setSkillsLoading, setSkillsError } = skillsSlice.actions;

export default skillsSlice.reducer;
