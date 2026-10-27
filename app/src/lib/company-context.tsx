import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

export interface SelectedCompany {
  companyId: number;
  companyName: string;
  logoUrl: string;
}

export const STORAGE_KEY = "selected-company";

interface Ctx {
  selected: SelectedCompany | null;
  hydrated: boolean;
  selectCompany: (c: SelectedCompany) => void;
}

const CompanyContext = createContext<Ctx | null>(null);

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

export function CompanyProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<SelectedCompany | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSelected(readSelectedCompany());
    setHydrated(true);
  }, []);

  const selectCompany = useCallback((c: SelectedCompany) => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    setSelected(c);
  }, []);

  return (
    <CompanyContext.Provider value={{ selected, hydrated, selectCompany }}>
      {children}
    </CompanyContext.Provider>
  );
}

export function useCompany() {
  const ctx = useContext(CompanyContext);
  if (!ctx) throw new Error("useCompany must be used inside CompanyProvider");
  return ctx;
}
