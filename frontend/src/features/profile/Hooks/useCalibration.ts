import { useCallback, useEffect, useMemo, useState } from "react";
import type { Code } from "@/lib/categories";
import { toErrorMessage } from "@/services/apiClient";
import { getCalibrationAPI, type Calibration } from "../service/profile.api";

/** Share of a level's topics that must be ticked for the level to count. */
export const PASS_RATIO = 0.6;

export interface CalibrationItem {
  key: string;
  level: number;
  text: string;
}

/**
 * Suggested level from a checklist: the highest level with at least 60% of its topics ticked,
 * counted contiguously from the bottom of the window (a ticked level 7 does not count if level 6
 * is not). Everything below the window is assumed known; nothing ticked suggests window-start - 1.
 */
export function suggestLevel(levels: Calibration["levels"], ticked: ReadonlySet<string>): number {
  const sorted = [...levels].sort((a, b) => a.level - b.level);
  const first = sorted[0]?.level ?? 1;
  let suggested = Math.max(1, first - 1);
  for (const l of sorted) {
    if (l.topics.length === 0) break;
    const done = l.topics.filter((_, i) => ticked.has(`${l.level}:${i}`)).length;
    if (done / l.topics.length < PASS_RATIO) break;
    suggested = l.level;
  }
  return suggested;
}

/** The "calibrate me" checklist for one category, around the candidate's current level. */
export function useCalibration(code: Code | null, startLevel: number, enabled = true) {
  const [data, setData] = useState<Calibration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ticked, setTicked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!code || !enabled) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setTicked(new Set());
    getCalibrationAPI(code, startLevel)
      .then((res) => !cancelled && setData(res))
      .catch((err) => !cancelled && setError(toErrorMessage(err, "Could not load the topic list.")))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [code, startLevel, enabled]);

  const toggle = useCallback((level: number, index: number) => {
    setTicked((prev) => {
      const next = new Set(prev);
      const key = `${level}:${index}`;
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const levels = useMemo(() => data?.levels ?? [], [data]);
  const suggested = useMemo(() => suggestLevel(levels, ticked), [levels, ticked]);
  const totalTopics = levels.reduce((n, l) => n + l.topics.length, 0);

  /** The basis recorded on the level, e.g. "Self-check: 7/9 topics around level 5". */
  const basis = useMemo(() => {
    const done = levels.reduce(
      (n, l) => n + l.topics.filter((_, i) => ticked.has(`${l.level}:${i}`)).length,
      0,
    );
    return `Self-check: ${done}/${totalTopics} topics around level ${startLevel}`;
  }, [levels, ticked, totalTopics, startLevel]);

  return {
    levels,
    available: totalTopics > 0,
    loading,
    error,
    ticked,
    toggle,
    suggested,
    basis,
  };
}
