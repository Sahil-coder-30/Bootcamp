/**
 * companyBar.service.ts
 * Company skill bar data service with 3-tier resilience:
 * 1. Supabase view `v_company_skill_bar`
 * 2. In-memory cache (TTL 10 minutes)
 * 3. Offline JSON snapshot fallback (`talent_check_company_skillsets.json`)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { supabase } from "./supabase.service.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { cleanTopicText } from "../lib/textClean.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface CompanyBarRow {
  skill_set_id: number;
  category_code: string;
  skill_set_name: string;
  required_level: number;
  bloom_code: string;
  raw_bloom_code?: string | null;
  bloom_mismatch: boolean;
}

export interface CompanyBar {
  company_id: number;
  company_name: string;
  display_name?: string | null;
  source: "db" | "cache" | "snapshot";
  rows: CompanyBarRow[];
}

export interface BarMatrix {
  company_ids: number[];
  company_names: string[];
  levels: number[][];
}

// In-memory cache with 10-minute TTL
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const barCache = new Map<number, CacheEntry<CompanyBar>>();
const CACHE_TTL_MS = 10 * 60 * 1000;

// Path to offline JSON snapshot
const SNAPSHOT_PATH =
  process.env.TALENT_SNAPSHOT_PATH ||
  path.resolve(__dirname, "../../../agent/data/snapshots/talent_check_company_skillsets.json");

let snapshotDataCache: any = null;

function loadSnapshot(): any {
  if (snapshotDataCache) return snapshotDataCache;
  if (!fs.existsSync(SNAPSHOT_PATH)) {
    throw new Error(`Snapshot not found at ${SNAPSHOT_PATH}`);
  }
  const raw = fs.readFileSync(SNAPSHOT_PATH, "utf-8");
  snapshotDataCache = JSON.parse(raw);
  return snapshotDataCache;
}

export async function getCompanyBar(id: number): Promise<CompanyBar> {
  // 1. Check in-memory cache
  const cached = barCache.get(id);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...cached.data, source: "cache" };
  }

  // 2. Try Supabase view v_company_skill_bar (3s timeout)
  if (supabase) {
    try {
      const abortCtrl = new AbortController();
      const timeoutId = setTimeout(() => abortCtrl.abort(), 3000);

      const { data, error } = await supabase
        .from("v_company_skill_bar")
        .select("company_id, company_name, skill_set_id, category_code, skill_set_name, required_level, bloom_code, raw_bloom_code, bloom_mismatch")
        .eq("company_id", id);

      clearTimeout(timeoutId);

      if (!error && data && data.length > 0) {
        if (data.length < 12) {
          throw new HttpError(422, `Skill bar for company ${id} is incomplete (${data.length}/12)`);
        }

        const compName = data[0]?.company_name ?? `Company ${id}`;
        const bar: CompanyBar = {
          company_id: id,
          company_name: compName,
          display_name: compName,
          source: "db",
          rows: data.map((r: any) => ({
            skill_set_id: r.skill_set_id,
            category_code: r.category_code,
            skill_set_name: r.skill_set_name,
            required_level: r.required_level,
            bloom_code: r.bloom_code,
            raw_bloom_code: r.raw_bloom_code,
            bloom_mismatch: Boolean(r.bloom_mismatch),
          })),
        };

        barCache.set(id, { data: bar, expiresAt: Date.now() + CACHE_TTL_MS });
        return bar;
      }
    } catch (dbErr: any) {
      if (dbErr instanceof HttpError) throw dbErr;
      console.warn(`[companyBar.service] Supabase query failed for company ${id}, using snapshot fallback:`, dbErr?.message);
    }
  }

  // 3. Fallback to snapshot
  try {
    const snapshot = loadSnapshot();
    const found = snapshot.companies?.find((c: any) => c.company_id === id);

    if (found) {
      const bar: CompanyBar = {
        company_id: found.company_id,
        company_name: found.company_name,
        display_name: found.display_name,
        source: "snapshot",
        rows: found.skills.map((s: any) => ({
          skill_set_id: s.skill_set_id,
          category_code: s.category_code,
          skill_set_name: s.skill_set_name,
          required_level: s.required_level,
          bloom_code: s.bloom_code,
          raw_bloom_code: s.raw_bloom_code,
          bloom_mismatch: Boolean(s.bloom_mismatch),
        })),
      };
      barCache.set(id, { data: bar, expiresAt: Date.now() + CACHE_TTL_MS });
      return bar;
    }

    // Check if in bar_matrix
    const matrix = snapshot.bar_matrix;
    const idx = matrix?.company_ids?.indexOf(id);
    if (idx !== undefined && idx >= 0) {
      const compName = matrix.company_names[idx];
      const levels = matrix.levels[idx];
      const CODES = ["COD", "DSA", "APTI", "COMM", "OOD", "AI", "SQL", "SYSD", "CLOUD", "SWE", "NETW", "OS"];
      const rows: CompanyBarRow[] = CODES.map((code, i) => ({
        skill_set_id: i + 1,
        category_code: code,
        skill_set_name: code,
        required_level: levels[i],
        bloom_code: levels[i] >= 9 ? "CR" : levels[i] >= 7 ? "EV" : levels[i] >= 5 ? "AS" : levels[i] >= 3 ? "AP" : "CU",
        bloom_mismatch: false,
      }));

      const bar: CompanyBar = {
        company_id: id,
        company_name: compName,
        display_name: compName,
        source: "snapshot",
        rows,
      };
      barCache.set(id, { data: bar, expiresAt: Date.now() + CACHE_TTL_MS });
      return bar;
    }
  } catch (snapErr: any) {
    console.error("[companyBar.service] Snapshot read failed:", snapErr?.message);
  }

  throw new HttpError(404, `No skill bar found for company ${id}`);
}

export async function getAllBars(): Promise<BarMatrix> {
  const snapshot = loadSnapshot();
  return snapshot.bar_matrix as BarMatrix;
}

export async function getTopicLadder(): Promise<Record<string, Record<string, string>>> {
  // If supabase available, we can query v_skill_topics, otherwise fallback to snapshot
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("v_skill_topics")
        .select("skill_set_id, level_number, topics");

      if (!error && data && data.length > 0) {
        const ID_TO_CODE: Record<number, string> = {
          1: "COD", 2: "DSA", 3: "APTI", 4: "COMM", 5: "OOD", 6: "AI",
          7: "SQL", 8: "SYSD", 9: "CLOUD", 10: "SWE", 11: "NETW", 12: "OS"
        };
        const ladder: Record<string, Record<string, string>> = {};
        for (const row of data) {
          const code = ID_TO_CODE[row.skill_set_id];
          if (!code) continue;
          if (!ladder[code]) ladder[code] = {};
          ladder[code][String(row.level_number)] = cleanTopicText(row.topics);
        }
        const snapshot = loadSnapshot();
        for (const [code, topics] of Object.entries(snapshot.topics || {})) {
          if (!ladder[code] || Object.keys(ladder[code]).length === 0) {
            ladder[code] = topics as Record<string, string>;
          }
        }
        return ladder;
      }
    } catch {
      // Fallback
    }
  }

  const snapshot = loadSnapshot();
  return snapshot.topics || {};
}

const PINNED_ALIASES: Record<string, number> = {
  google: 4,
  "google llc": 4,
  alphabet: 4,
  microsoft: 78,
  "microsoft corporation": 78,
  msft: 78,
  "oracle financial services software": 24,
  "oracle financial services software limited": 24,
  "oracle fss": 24,
  ofss: 24,
  accenture: 1,
  adobe: 2,
  amazon: 3,
};

export async function resolveCompanyId(name: string): Promise<{ company_id: number; matched_by: string } | null> {
  if (!name) return null;
  const normalized = name
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(llc|inc|ltd|limited|corporation|corp|plc|private|pvt)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // 1. Check pinned aliases
  if (PINNED_ALIASES[normalized]) {
    return { company_id: PINNED_ALIASES[normalized], matched_by: "pinned_alias" };
  }

  for (const [alias, id] of Object.entries(PINNED_ALIASES)) {
    if (normalized.includes(alias) || alias.includes(normalized)) {
      return { company_id: id, matched_by: "alias_substring" };
    }
  }

  // 2. Check snapshot matrix
  const snapshot = loadSnapshot();
  const names: string[] = snapshot.bar_matrix?.company_names || [];
  const ids: number[] = snapshot.bar_matrix?.company_ids || [];

  for (let i = 0; i < names.length; i++) {
    const compName = names[i];
    const compId = ids[i];
    if (compName && compId !== undefined) {
      const normComp = compName.toLowerCase();
      if (normComp.includes(normalized) || normalized.includes(normComp)) {
        return { company_id: compId, matched_by: "snapshot_name" };
      }
    }
  }

  return null;
}
