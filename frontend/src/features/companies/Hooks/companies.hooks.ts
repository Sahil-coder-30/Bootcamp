import { useCallback, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { getCompaniesAPI } from "../service/companies.api";
import {
  setCompaniesError,
  setCompaniesList,
  setCompaniesLoading,
  setSelectedCompany,
  type SelectedCompany,
} from "../slice/companies.slice";

export type { SelectedCompany };

export const STORAGE_KEY = "selected-company";

export function readSelectedCompany(): SelectedCompany | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SelectedCompany;
    const valid =
      parsed &&
      typeof parsed.companyId === "number" &&
      parsed.companyId > 0 &&
      typeof parsed.companyName === "string";
    return valid ? parsed : null;
  } catch {
    return null;
  }
}

/** Company list for the picker. Fetches once; `refetch` reloads on demand. */
export function useCompanies() {
  const dispatch = useAppDispatch();
  const { list, loaded, loading, error } = useAppSelector((s) => s.companies);

  const refetch = useCallback(async () => {
    dispatch(setCompaniesLoading(true));
    dispatch(setCompaniesError(null));
    try {
      const data = await getCompaniesAPI();
      dispatch(setCompaniesList(data));
      return data;
    } catch (err) {
      dispatch(setCompaniesError(toErrorMessage(err, "Unable to retrieve company records.")));
      return null;
    } finally {
      dispatch(setCompaniesLoading(false));
    }
  }, [dispatch]);

  useEffect(() => {
    if (!loaded && !loading && !error) void refetch();
  }, [loaded, loading, error, refetch]);

  return {
    data: list,
    isLoading: !loaded && !error,
    isError: Boolean(error),
    error,
    refetch,
  };
}

/** Selected company, restored from localStorage on first use. */
export function useCompany() {
  const dispatch = useAppDispatch();
  const { selected, hydrated } = useAppSelector((s) => s.companies);

  useEffect(() => {
    if (!hydrated) dispatch(setSelectedCompany(readSelectedCompany()));
  }, [hydrated, dispatch]);

  const selectCompany = useCallback(
    (c: SelectedCompany) => {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
      dispatch(setSelectedCompany(c));
    },
    [dispatch],
  );

  return { selected, hydrated, selectCompany };
}

/** Restores the selected company after refresh; sends the visitor home when none is saved. */
export function useSelectedCompanyGuard() {
  const { selected, hydrated } = useCompany();
  const navigate = useNavigate();
  useEffect(() => {
    if (hydrated && !selected) void navigate({ to: "/", replace: true });
  }, [hydrated, selected, navigate]);
  return hydrated ? selected : null;
}
