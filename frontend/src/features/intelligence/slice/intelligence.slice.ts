import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompanyProfile } from "@/lib/companyData";

interface IntelligenceState {
  /** Profiles cached by company id. */
  profiles: Record<number, CompanyProfile | null>;
  loadingId: number | null;
  errors: Record<number, string>;
}

const initialState: IntelligenceState = { profiles: {}, loadingId: null, errors: {} };

const intelligenceSlice = createSlice({
  name: "intelligence",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<{ id: number; profile: CompanyProfile | null }>) {
      state.profiles[action.payload.id] = action.payload.profile;
      delete state.errors[action.payload.id];
    },
    setProfileLoading(state, action: PayloadAction<number | null>) {
      state.loadingId = action.payload;
    },
    setProfileError(state, action: PayloadAction<{ id: number; error: string | null }>) {
      if (action.payload.error) state.errors[action.payload.id] = action.payload.error;
      else delete state.errors[action.payload.id];
    },
  },
});

export const { setProfile, setProfileLoading, setProfileError } = intelligenceSlice.actions;

export default intelligenceSlice.reducer;
