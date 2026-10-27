import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useCompany } from "@/lib/company-context";

/** Restores the selected company after refresh; sends the visitor home when none is saved. */
export function useSelectedCompanyGuard() {
  const { selected, hydrated } = useCompany();
  const navigate = useNavigate();
  useEffect(() => {
    if (hydrated && !selected) navigate({ to: "/", replace: true });
  }, [hydrated, selected, navigate]);
  return hydrated ? selected : null;
}
