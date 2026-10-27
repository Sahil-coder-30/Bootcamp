import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { CompanySummary } from "@/lib/companyData";

export interface SelectedCompany {
  companyId: number;
  companyName: string;
  logoUrl: string;
}

interface CompaniesState {
  list: CompanySummary[];
  loaded: boolean;
  loading: boolean;
  error: string | null;
  /** Company the student picked; persisted to localStorage by the hooks layer. */
  selected: SelectedCompany | null;
  /** True once the saved selection has been read from localStorage. */
  hydrated: boolean;
}

const initialState: CompaniesState = {
  list: [],
  loaded: false,
  loading: false,
  error: null,
  selected: null,
  hydrated: false,
};

const companiesSlice = createSlice({
  name: "companies",
  initialState,
  reducers: {
    setCompaniesList(state, action: PayloadAction<CompanySummary[]>) {
      state.list = action.payload;
      state.loaded = true;
      state.error = null;
    },
    setCompaniesLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload;
    },
    setCompaniesError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
      state.loading = false;
    },
    setSelectedCompany(state, action: PayloadAction<SelectedCompany | null>) {
      state.selected = action.payload;
      state.hydrated = true;
    },
  },
});

export const { setCompaniesList, setCompaniesLoading, setCompaniesError, setSelectedCompany } =
  companiesSlice.actions;

export default companiesSlice.reducer;
