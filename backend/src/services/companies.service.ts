// Company data access + business logic. Reads Supabase and falls back to the bundled
// seed data (src/data) when the database is empty or not configured.
import { supabase } from "./supabase.service.js";
import { SEED_COMPANIES } from "../data/seedCompanies.js";
import { SKILL_TOPICS } from "../data/skillTopics.js";
import {
  asString,
  normalizeCompanyProfile,
  normalizeCompanySummary,
  normalizeDashboardSkills,
  type CompanyProfile,
  type CompanySummary,
  type DashboardSkill,
} from "../lib/companyData.js";

export interface SkillWithTopics extends DashboardSkill {
  topics?: string[];
}

export interface CompanySkillsData {
  skills: SkillWithTopics[];
  topics: Record<number, string[]>;
}

const seedSummaries = (): CompanySummary[] =>
  SEED_COMPANIES.map((c) => normalizeCompanySummary(c.short_json, c.company_id));

const seedProfile = (id: number): CompanyProfile | null => {
  const seed = SEED_COMPANIES.find((c) => c.company_id === id);
  return seed ? normalizeCompanyProfile(seed.full_json, seed.short_json) : null;
};

export async function listCompanies(): Promise<CompanySummary[]> {
  if (!supabase) return seedSummaries();

  const { data, error } = await supabase
    .from("company_json")
    .select("company_id, short_json")
    .order("company_id", { ascending: true });
  if (error) throw error;

  // Empty or restricted database: fall back to the seed companies.
  if (!data || data.length === 0) return seedSummaries();

  return data.map((row) => normalizeCompanySummary(row.short_json, Number(row.company_id) || 0));
}

export async function getCompanyProfile(id: number): Promise<CompanyProfile | null> {
  if (!supabase) return seedProfile(id);

  const { data, error } = await supabase
    .from("company_json")
    .select("company_id, short_json, full_json")
    .eq("company_id", id)
    .maybeSingle();
  if (error) throw error;

  if (!data) return seedProfile(id);
  return normalizeCompanyProfile(data.full_json, data.short_json);
}

type SkillRow = {
  skill_set_id: number;
  skill_set_name: string;
  required_level: number;
  required_proficiency: string;
};

const seedSkillRows = (id: number): SkillRow[] =>
  (SEED_COMPANIES.find((c) => c.company_id === id)?.skill_levels ?? []).map((s) => ({
    skill_set_id: s.skill_set_id,
    skill_set_name: s.skill_set_name,
    required_level: s.required_level,
    required_proficiency: s.required_proficiency,
  }));

const withTopics = (rows: SkillRow[], topics: Record<number, string[]>): CompanySkillsData => ({
  skills: normalizeDashboardSkills(rows).map((s) => ({ ...s, topics: topics[s.id] ?? [] })),
  topics,
});

export async function getCompanySkills(id: number): Promise<CompanySkillsData> {
  if (!supabase) return withTopics(seedSkillRows(id), { ...SKILL_TOPICS });

  const [cslRes, masterRes, profRes, topicsRes] = await Promise.all([
    supabase
      .from("company_skill_levels")
      .select("company_id, skill_set_id, required_level, required_proficiency_level_id")
      .eq("company_id", id),
    supabase.from("skill_set_master").select("skill_set_id, skill_set_name, short_name"),
    supabase.from("proficiency_levels").select("proficiency_level_id, proficiency_name, proficiency_code"),
    supabase
      .from("skill_set_topics")
      .select("skill_set_id, level_number, topics")
      .order("level_number", { ascending: true }),
  ]);

  if (cslRes.error) throw cslRes.error;
  if (masterRes.error) throw masterRes.error;
  if (profRes.error) throw profRes.error;
  if (topicsRes.error) throw topicsRes.error;

  const masterMap = new Map<number, string>();
  for (const m of masterRes.data ?? []) {
    masterMap.set(Number(m.skill_set_id), asString(m.skill_set_name) || asString(m.short_name));
  }

  const profMap = new Map<number, string>();
  for (const p of profRes.data ?? []) {
    profMap.set(
      Number(p.proficiency_level_id),
      asString(p.proficiency_name) || asString(p.proficiency_code),
    );
  }

  // Group topics by skill_set_id and level_number
  const topicsBySkillAndLevel = new Map<number, Map<number, string[]>>();
  for (const row of topicsRes.data ?? []) {
    const skillId = Number(row.skill_set_id);
    const lvl = Number(row.level_number);
    if (!topicsBySkillAndLevel.has(skillId)) topicsBySkillAndLevel.set(skillId, new Map());
    const levelMap = topicsBySkillAndLevel.get(skillId)!;
    if (!levelMap.has(lvl)) levelMap.set(lvl, []);
    const text = asString(row.topics).trim();
    if (text) levelMap.get(lvl)!.push(text);
  }

  const topics: Record<number, string[]> = {};
  for (const [skillId, levelMap] of topicsBySkillAndLevel.entries()) {
    const ladder: string[] = [];
    for (let lvl = 1; lvl <= 10; lvl++) ladder[lvl - 1] = (levelMap.get(lvl) ?? []).join(", ");
    topics[skillId] = ladder;
  }

  // If database topics are empty for a skill, fall back to SKILL_TOPICS
  for (const skillIdStr of Object.keys(SKILL_TOPICS)) {
    const sid = Number(skillIdStr);
    if (!topics[sid] || topics[sid].filter(Boolean).length === 0) {
      topics[sid] = SKILL_TOPICS[sid] ?? [];
    }
  }

  // Assemble company skill level rows
  let rows: SkillRow[] = (cslRes.data ?? []).map((row) => ({
    skill_set_id: Number(row.skill_set_id) || 0,
    skill_set_name: masterMap.get(Number(row.skill_set_id)) ?? `Skill ${row.skill_set_id}`,
    required_level: Number(row.required_level) || 0,
    required_proficiency: profMap.get(Number(row.required_proficiency_level_id)) ?? "",
  }));

  // No custom skill levels in the DB yet: build from skill_set_master with seed/fallback values
  if (rows.length === 0 && (masterRes.data ?? []).length > 0) {
    const seedById = new Map(seedSkillRows(id).map((s) => [s.skill_set_id, s]));
    rows = (masterRes.data ?? []).map((m) => {
      const sid = Number(m.skill_set_id);
      const seed = seedById.get(sid);
      return {
        skill_set_id: sid,
        skill_set_name: asString(m.skill_set_name) || asString(m.short_name),
        required_level: seed ? seed.required_level : 6,
        required_proficiency: seed ? seed.required_proficiency : "Proficient",
      };
    });
  } else if (rows.length === 0) {
    rows = seedSkillRows(id);
  }

  return withTopics(rows, topics);
}
