import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  DiffEntry,
  ProfileSummary,
  ProvenanceMap,
  ReviewState,
  StoredProfile,
} from "../lib/types";

export interface Conflict {
  server: StoredProfile;
  version: number;
}

export interface ProfileState {
  /** Server cache by id. Form values never go here (keystrokes would re-render the app). */
  byId: Record<string, { profile: StoredProfile; version: number; fetchedAt: number }>;
  list: {
    items: ProfileSummary[];
    nextCursor: string | null;
    query: string;
    loaded: boolean;
    loading: boolean;
    error: string | null;
  };
  current: {
    id: string | null;
    loading: boolean;
    saving: boolean;
    error: string | null;
    conflict: Conflict | null;
  };
  prefill: {
    extractionId: string | null;
    existingProfileId: string | null;
    provenance: ProvenanceMap;
    review: Record<string, ReviewState>;
    /** What each pre-filled field held before the resume was applied (for "reject"). */
    previous: Record<string, unknown>;
    diff: DiffEntry[] | null;
    warnings: string[];
  };
}

export const initialPrefill: ProfileState["prefill"] = {
  extractionId: null,
  existingProfileId: null,
  provenance: {},
  review: {},
  previous: {},
  diff: null,
  warnings: [],
};

const initialState: ProfileState = {
  byId: {},
  list: { items: [], nextCursor: null, query: "", loaded: false, loading: false, error: null },
  current: { id: null, loading: false, saving: false, error: null, conflict: null },
  prefill: initialPrefill,
};

const profileSlice = createSlice({
  name: "profile",
  initialState,
  reducers: {
    setProfile(state, action: PayloadAction<{ profile: StoredProfile; version: number }>) {
      const { profile, version } = action.payload;
      state.byId[profile.id] = { profile, version, fetchedAt: Date.now() };
      state.current.id = profile.id;
      state.current.error = null;
    },
    setCurrentId(state, action: PayloadAction<string | null>) {
      state.current.id = action.payload;
    },
    setProfileLoading(state, action: PayloadAction<boolean>) {
      state.current.loading = action.payload;
    },
    setProfileError(state, action: PayloadAction<string | null>) {
      state.current.error = action.payload;
      state.current.loading = false;
    },
    removeProfile(state, action: PayloadAction<string>) {
      delete state.byId[action.payload];
      state.list.items = state.list.items.filter((i) => i.id !== action.payload);
    },
    setList(
      state,
      action: PayloadAction<{ items: ProfileSummary[]; nextCursor: string | null; query: string }>,
    ) {
      state.list.items = action.payload.items;
      state.list.nextCursor = action.payload.nextCursor;
      state.list.query = action.payload.query;
      state.list.loaded = true;
      state.list.error = null;
    },
    appendList(
      state,
      action: PayloadAction<{ items: ProfileSummary[]; nextCursor: string | null }>,
    ) {
      const seen = new Set(state.list.items.map((i) => i.id));
      state.list.items.push(...action.payload.items.filter((i) => !seen.has(i.id)));
      state.list.nextCursor = action.payload.nextCursor;
    },
    setListLoading(state, action: PayloadAction<boolean>) {
      state.list.loading = action.payload;
    },
    setListError(state, action: PayloadAction<string | null>) {
      state.list.error = action.payload;
      state.list.loading = false;
    },
    setSaving(state, action: PayloadAction<boolean>) {
      state.current.saving = action.payload;
    },
    setConflict(state, action: PayloadAction<Conflict>) {
      state.current.conflict = action.payload;
    },
    clearConflict(state) {
      state.current.conflict = null;
    },
    setPrefill(state, action: PayloadAction<Partial<ProfileState["prefill"]>>) {
      state.prefill = { ...state.prefill, ...action.payload };
    },
    setReview(state, action: PayloadAction<{ path: string; state: ReviewState }>) {
      state.prefill.review[action.payload.path] = action.payload.state;
    },
    setReviewMany(state, action: PayloadAction<Record<string, ReviewState>>) {
      Object.assign(state.prefill.review, action.payload);
    },
    clearPrefill(state) {
      state.prefill = initialPrefill;
    },
    /**
     * A list item was removed from the form: drop its chips and shift the later items down,
     * so `skills.3.skill_name` keeps pointing at the same skill.
     */
    removeProvenanceItem(state, action: PayloadAction<{ list: string; index: number }>) {
      const { list, index } = action.payload;
      const prefix = `${list}.`;
      const rekey = <T>(rec: Record<string, T>): Record<string, T> => {
        const out: Record<string, T> = {};
        for (const [key, value] of Object.entries(rec)) {
          if (!key.startsWith(prefix)) {
            out[key] = value;
            continue;
          }
          const rest = key.slice(prefix.length);
          const dot = rest.indexOf(".");
          const head = dot === -1 ? rest : rest.slice(0, dot);
          if (!/^\d+$/.test(head)) {
            out[key] = value;
            continue;
          }
          const i = Number(head);
          const tail = dot === -1 ? "" : rest.slice(dot);
          if (i < index) out[key] = value;
          else if (i > index) out[`${prefix}${i - 1}${tail}`] = value;
        }
        return out;
      };
      state.prefill.provenance = rekey(state.prefill.provenance);
      state.prefill.review = rekey(state.prefill.review);
      state.prefill.previous = rekey(state.prefill.previous);
    },
  },
});

export const {
  setProfile,
  setCurrentId,
  setProfileLoading,
  setProfileError,
  removeProfile,
  setList,
  appendList,
  setListLoading,
  setListError,
  setSaving,
  setConflict,
  clearConflict,
  setPrefill,
  setReview,
  setReviewMany,
  clearPrefill,
  removeProvenanceItem,
} = profileSlice.actions;

export default profileSlice.reducer;
