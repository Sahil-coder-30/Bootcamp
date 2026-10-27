/**
 * readiness.ts
 * Pure TypeScript mirror of the Python tc-1.0 scoring algorithm.
 * Guarantees <1ms client-side preview for what-if slider manipulations.
 */

export const READY_THRESHOLD = 80;
export const ALMOST_THRESHOLD = 60;
export const BLOCKING_SHORTFALL = 3;

export const CODES = [
  "COD", "DSA", "APTI", "COMM", "OOD", "AI",
  "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS"
] as const;

export type CategoryCode = typeof CODES[number];

export const BLOOM_BANDS: Record<number, string> = {
  1: "CU", 2: "CU",
  3: "AP", 4: "AP",
  5: "AS", 6: "AS",
  7: "EV", 8: "EV",
  9: "CR", 10: "CR",
};

export function bloomFor(level: number): string {
  const clamped = Math.max(1, Math.min(10, Math.floor(level)));
  return BLOOM_BANDS[clamped] || "CU";
}

export function rawReadiness(c: number[], r: number[]): number {
  let neededSum = 0;
  for (let i = 0; i < r.length; i++) {
    const req = r[i] ?? 1;
    neededSum += Math.max(0, req - 1);
  }
  if (neededSum === 0) return 100.0;

  let coveredSum = 0;
  for (let i = 0; i < c.length; i++) {
    const cand = c[i] ?? 1;
    const req = r[i] ?? 1;
    coveredSum += Math.min(cand, req) - 1;
  }
  return (100.0 * coveredSum) / neededSum;
}

export function roundScore(x: number): number {
  return Math.max(0, Math.min(100, Math.floor(x + 0.5)));
}

export function verdictFor(score: number, shortfalls: number[]): "ready" | "almost" | "not_yet" {
  const hasBlocking = shortfalls.some((s) => s >= BLOCKING_SHORTFALL);
  if (score >= READY_THRESHOLD && !hasBlocking) return "ready";
  if (score >= ALMOST_THRESHOLD) return "almost";
  return "not_yet";
}

export function scoreLevels(
  candidateLevels: number[],
  requiredLevels: number[]
): {
  raw: number;
  score: number;
  verdict: "ready" | "almost" | "not_yet";
  blocking: boolean[];
  shortfalls: number[];
} {
  const shortfalls = requiredLevels.map((req, i) => Math.max(0, req - (candidateLevels[i] ?? 1)));
  const raw = rawReadiness(candidateLevels, requiredLevels);
  const score = roundScore(raw);
  const verdict = verdictFor(score, shortfalls);
  const blocking = shortfalls.map((s) => s >= BLOCKING_SHORTFALL);

  return { raw, score, verdict, blocking, shortfalls };
}
