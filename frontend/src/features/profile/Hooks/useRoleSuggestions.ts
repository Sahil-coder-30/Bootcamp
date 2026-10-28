import { useEffect, useState } from "react";
import { listJdRolesAPI } from "../service/profile.api";

/** The roles in the 6 sample JDs: shown even when Role 1's list is not reachable. */
export const DEFAULT_ROLES = [
  "Software Engineer",
  "Data Scientist",
  "Data Analyst",
  "Associate Software Engineer",
  "Application Support Analyst",
];

/** Target-role suggestions: the saved JDs' roles when available, else the defaults. */
export function useRoleSuggestions(): string[] {
  const [roles, setRoles] = useState<string[]>(DEFAULT_ROLES);
  useEffect(() => {
    let cancelled = false;
    listJdRolesAPI()
      .then((found) => {
        if (!cancelled && found.length > 0) setRoles([...new Set([...found, ...DEFAULT_ROLES])]);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);
  return roles;
}
