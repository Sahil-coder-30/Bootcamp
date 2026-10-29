import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { AuthUser } from "../service/auth.api";

interface AuthState {
  user: AuthUser | null;
  /** True once the saved session (if any) has been checked against the server. */
  ready: boolean;
  loading: boolean;
  error: string | null;
}

const initialState: AuthState = { user: null, ready: false, loading: false, error: null };

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuthUser(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.ready = true;
      state.loading = false;
      state.error = null;
    },
    setAuthLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setAuthError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    setAuthReady(state) {
      state.ready = true;
    },
  },
});

export const { setAuthUser, setAuthLoading, setAuthError, setAuthReady } = authSlice.actions;
export default authSlice.reducer;
