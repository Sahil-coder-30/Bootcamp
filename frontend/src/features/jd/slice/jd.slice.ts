/**
 * jd.slice.ts
 * Synchronous Redux Toolkit slice for Role 1: JD Analytics. No thunks (frontend-arch-init).
 */

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { JdDetail, JdSummary } from "../service/jd.api";

type Scope = "library" | "detail" | "upload";
export type UploadStage = "idle" | "uploading" | "extracting" | "done" | "error";

interface JdState {
  library: JdSummary[];
  libraryLoaded: boolean;
  detailsById: Record<string, JdDetail>;
  selectedId: string | null;
  uploadStage: UploadStage;
  loading: Record<Scope, boolean>;
  errors: Record<Scope, string | null>;
}

const initialState: JdState = {
  library: [],
  libraryLoaded: false,
  detailsById: {},
  selectedId: null,
  uploadStage: "idle",
  loading: { library: false, detail: false, upload: false },
  errors: { library: null, detail: null, upload: null },
};

const jdSlice = createSlice({
  name: "jd",
  initialState,
  reducers: {
    setLibrary(state, action: PayloadAction<JdSummary[]>) {
      state.library = action.payload;
      state.libraryLoaded = true;
    },
    setDetail(state, action: PayloadAction<JdDetail>) {
      state.detailsById[action.payload.jd_id] = action.payload;
    },
    selectJd(state, action: PayloadAction<string | null>) {
      state.selectedId = action.payload;
    },
    setUploadStage(state, action: PayloadAction<UploadStage>) {
      state.uploadStage = action.payload;
    },
    setLoading(state, action: PayloadAction<{ scope: Scope; loading: boolean }>) {
      state.loading[action.payload.scope] = action.payload.loading;
    },
    setError(state, action: PayloadAction<{ scope: Scope; error: string | null }>) {
      state.errors[action.payload.scope] = action.payload.error;
    },
  },
});

export const { setLibrary, setDetail, selectJd, setUploadStage, setLoading, setError } = jdSlice.actions;
export default jdSlice.reducer;
