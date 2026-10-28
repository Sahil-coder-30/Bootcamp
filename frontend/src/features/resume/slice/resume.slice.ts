/**
 * resume.slice.ts
 * Synchronous Redux Toolkit slice for Role 2: Resume Parsing.
 * Follows frontend-arch-init rules: synchronous reducers only, no async thunks.
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { ResumeExtraction } from "../service/resume.api";

export type ResumeTab =
  | "overview"
  | "experience"
  | "projects"
  | "skills"
  | "education"
  | "hackathons"
  | "radar"
  | "invariance";

interface ResumeState {
  currentExtraction: ResumeExtraction | null;
  compareExtraction: ResumeExtraction | null;
  status: "idle" | "uploading" | "parsing" | "done" | "error";
  error: string | null;
  activeTab: ResumeTab;
  highlightedSkill: string | null;
  isDrawerOpen: boolean;
}

const initialState: ResumeState = {
  currentExtraction: null,
  compareExtraction: null,
  status: "idle",
  error: null,
  activeTab: "overview",
  highlightedSkill: null,
  isDrawerOpen: false,
};

export const resumeSlice = createSlice({
  name: "resume",
  initialState,
  reducers: {
    setResumeStatus(state, action: PayloadAction<ResumeState["status"]>) {
      state.status = action.payload;
      if (action.payload === "parsing" || action.payload === "uploading") {
        state.error = null;
      }
    },
    setResumeExtraction(state, action: PayloadAction<ResumeExtraction | null>) {
      state.currentExtraction = action.payload;
      state.status = action.payload ? "done" : "idle";
      state.highlightedSkill = null;
      state.error = null;
    },
    setCompareExtraction(state, action: PayloadAction<ResumeExtraction | null>) {
      state.compareExtraction = action.payload;
    },
    setResumeError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.status = action.payload ? "error" : "idle";
    },
    setActiveTab(state, action: PayloadAction<ResumeTab>) {
      state.activeTab = action.payload;
    },
    setHighlightedSkill(state, action: PayloadAction<string | null>) {
      state.highlightedSkill = action.payload;
    },
    setDrawerOpen(state, action: PayloadAction<boolean>) {
      state.isDrawerOpen = action.payload;
    },
    resetResumeState(state) {
      state.currentExtraction = null;
      state.compareExtraction = null;
      state.status = "idle";
      state.error = null;
      state.highlightedSkill = null;
      state.isDrawerOpen = false;
    },
  },
});

export const {
  setResumeStatus,
  setResumeExtraction,
  setCompareExtraction,
  setResumeError,
  setActiveTab,
  setHighlightedSkill,
  setDrawerOpen,
  resetResumeState,
} = resumeSlice.actions;

export default resumeSlice.reducer;
