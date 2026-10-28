import { useEffect, useRef, useState } from "react";
import { CODES, isCode, type Code } from "@/lib/categories";
import type { CompanyBarRow } from "../lib/types";
import { getCompanySkillBarAPI } from "../service/profile.api";

export type CompanyBar = Record<Code, number>;

/** Role 4's rows -> one required level per category. No gap maths here: we only draw it. */
export function toBar(rows: CompanyBarRow[]): CompanyBar | null {
  const bar: Partial<CompanyBar> = {};
  for (const r of rows) {
    if (isCode(r.category_code) && Number.isFinite(r.required_level)) {
      bar[r.category_code] = Math.min(10, Math.max(1, Math.round(r.required_level)));
    }
  }
  return CODES.every((c) => bar[c] !== undefined) ? (bar as CompanyBar) : null;
}

/** The chosen company's 12-category bar, drawn as faint markers on the sliders. */
export function useCompanyBarOverlay(companyId?: number | null) {
  const [bar, setBar] = useState<CompanyBar | null>(null);
  const [loading, setLoading] = useState(false);
  // Role 4's route may not exist yet (or the network is down): the overlay simply stays off.
  const [unavailable, setUnavailable] = useState(false);
  const cache = useRef(new Map<number, CompanyBar | null>());

  useEffect(() => {
    if (!companyId) {
      setBar(null);
      setUnavailable(false);
      return;
    }
    const cached = cache.current.get(companyId);
    if (cached !== undefined) {
      setBar(cached);
      setUnavailable(cached === null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);
    getCompanySkillBarAPI(companyId)
      .then((rows) => {
        const next = toBar(rows);
        cache.current.set(companyId, next);
        if (!cancelled) {
          setBar(next);
          setUnavailable(next === null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBar(null);
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  return { bar, loading, unavailable };
}
