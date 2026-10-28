// Topic ladder for the "calibrate me" checklist: what a candidate should be able to do at
// levels L-1, L and L+1 of one category. Reads `skill_set_topics`, falls back to the bundled ladders.
import { CODES, type Code } from "../contract/profile.schema.js";
import { SKILL_TOPICS } from "../data/skillTopics.js";
import { asString } from "../lib/companyData.js";
import { supabase } from "./supabase.service.js";

/** `skill_set_id` per category in the live `skill_set_master` (contract section 2). */
export const SKILL_SET_ID: Record<Code, number> = {
  COD: 1,
  DSA: 2,
  APTI: 3,
  COMM: 4,
  OOD: 5,
  AI: 6,
  SQL: 7,
  SYSD: 8,
  CLOUD: 9,
  SWE: 10,
  NETW: 11,
  OS: 12,
};

/** The bundled ladders use their own ids (1 = DSA, 2 = OOP, ...); COD has none. */
const SEED_LADDER_ID: Partial<Record<Code, number>> = {
  DSA: 1,
  OOD: 2,
  SQL: 3,
  CLOUD: 4,
  OS: 5,
  NETW: 6,
  APTI: 7,
  COMM: 8,
  SYSD: 10,
  SWE: 11,
  AI: 12,
};

export interface CalibrationLevel {
  level: number;
  topics: string[];
}

export interface Calibration {
  code: Code;
  level: number;
  levels: CalibrationLevel[];
  source: "database" | "seed" | "none";
}

const window3 = (level: number): number[] =>
  [level - 1, level, level + 1].filter((l) => l >= 1 && l <= 10);

function seedLevels(code: Code, wanted: number[]): CalibrationLevel[] {
  const ladder = SKILL_TOPICS[SEED_LADDER_ID[code] ?? -1] ?? [];
  return wanted.map((level) => {
    const topic = (ladder[level - 1] ?? "").trim();
    return { level, topics: topic ? [topic] : [] };
  });
}

export async function getCalibration(code: Code, level: number): Promise<Calibration> {
  const wanted = window3(level);

  if (supabase) {
    const { data, error } = await supabase
      .from("skill_set_topics")
      .select("level_number, topics")
      .eq("skill_set_id", SKILL_SET_ID[code])
      .in("level_number", wanted)
      .order("level_number", { ascending: true });
    if (error) throw error;
    const byLevel = new Map<number, string[]>();
    for (const row of data ?? []) {
      const text = asString(row.topics).trim();
      if (!text) continue;
      const lvl = Number(row.level_number);
      byLevel.set(lvl, [...(byLevel.get(lvl) ?? []), text]);
    }
    if (byLevel.size > 0) {
      return {
        code,
        level,
        levels: wanted.map((l) => ({ level: l, topics: byLevel.get(l) ?? [] })),
        source: "database",
      };
    }
  }

  const levels = seedLevels(code, wanted);
  return { code, level, levels, source: levels.some((l) => l.topics.length > 0) ? "seed" : "none" };
}

export const isCode = (v: string): v is Code => (CODES as readonly string[]).includes(v);
