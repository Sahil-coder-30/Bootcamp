import { useQuery } from "@tanstack/react-query";
import { isSupabaseConfigured, supabase } from "./supabaseClient";
import { SEED_COMPANIES } from "@/data/seedCompanies";
import { SKILL_TOPICS } from "@/data/skillTopics";
import {
  asString,
  normalizeCompanyProfile,
  normalizeCompanySummary,
  normalizeDashboardSkills,
  type CompanyProfile,
  type CompanySummary,
  type DashboardSkill,
} from "./companyData";

export interface SkillWithTopics extends DashboardSkill {
  topics?: string[];
}

export interface CompanySkillsData {
  skills: SkillWithTopics[];
  topics: Record<number, string[]>;
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async (): Promise<CompanySummary[]> => {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
        );
      }

      const { data, error } = await supabase
        .from("company_json")
        .select("company_id, short_json")
        .order("company_id", { ascending: true });

      if (error) {
        throw error;
      }

      // If database is empty or restricted, fallback gracefully to seed companies
      if (!data || data.length === 0) {
        return SEED_COMPANIES.map((c) =>
          normalizeCompanySummary(c.short_json, c.company_id),
        );
      }

      return data.map((row) =>
        normalizeCompanySummary(row.short_json, Number(row.company_id) || 0),
      );
    },
  });
}

export function useCompanyProfile(id?: number | null) {
  return useQuery({
    queryKey: ["companyProfile", id],
    enabled: typeof id === "number" && id > 0,
    queryFn: async (): Promise<CompanyProfile | null> => {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
        );
      }

      const { data, error } = await supabase
        .from("company_json")
        .select("company_id, short_json, full_json")
        .eq("company_id", id!)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (!data) {
        // Documented fallback if company exists in seed
        const seed = SEED_COMPANIES.find((c) => c.company_id === id);
        return seed ? normalizeCompanyProfile(seed.full_json, seed.short_json) : null;
      }

      return normalizeCompanyProfile(data.full_json, data.short_json);
    },
  });
}

export function useCompanySkills(id?: number | null) {
  return useQuery({
    queryKey: ["companySkills", id],
    enabled: typeof id === "number" && id > 0,
    queryFn: async (): Promise<CompanySkillsData> => {
      if (!isSupabaseConfigured) {
        throw new Error(
          "Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.",
        );
      }

      const [cslRes, masterRes, profRes, topicsRes] = await Promise.all([
        supabase
          .from("company_skill_levels")
          .select("company_id, skill_set_id, required_level, required_proficiency_level_id")
          .eq("company_id", id!),
        supabase
          .from("skill_set_master")
          .select("skill_set_id, skill_set_name, short_name"),
        supabase
          .from("proficiency_levels")
          .select("proficiency_level_id, proficiency_name, proficiency_code"),
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
        masterMap.set(
          Number(m.skill_set_id),
          asString(m.skill_set_name) || asString(m.short_name),
        );
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
        if (!topicsBySkillAndLevel.has(skillId)) {
          topicsBySkillAndLevel.set(skillId, new Map());
        }
        const levelMap = topicsBySkillAndLevel.get(skillId)!;
        if (!levelMap.has(lvl)) {
          levelMap.set(lvl, []);
        }
        const text = asString(row.topics).trim();
        if (text) {
          levelMap.get(lvl)!.push(text);
        }
      }

      const topics: Record<number, string[]> = {};
      for (const [skillId, levelMap] of topicsBySkillAndLevel.entries()) {
        topics[skillId] = [];
        for (let lvl = 1; lvl <= 10; lvl++) {
          const list = levelMap.get(lvl) ?? [];
          topics[skillId][lvl - 1] = list.join(", ");
        }
      }

      // If database topics are empty for a skill, fallback to SKILL_TOPICS
      for (const skillIdStr of Object.keys(SKILL_TOPICS)) {
        const sid = Number(skillIdStr);
        if (!topics[sid] || topics[sid].filter(Boolean).length === 0) {
          topics[sid] = SKILL_TOPICS[sid] ?? [];
        }
      }

      // Assemble company skill level rows
      const cslRows = cslRes.data ?? [];
      let assembledRows = cslRows.map((row) => ({
        skill_set_id: Number(row.skill_set_id) || 0,
        skill_set_name: masterMap.get(Number(row.skill_set_id)) ?? `Skill ${row.skill_set_id}`,
        required_level: Number(row.required_level) || 0,
        required_proficiency: profMap.get(Number(row.required_proficiency_level_id)) ?? "",
      }));

      // If company has no custom skill levels in DB yet, build from skill_set_master with fallback values
      if (assembledRows.length === 0 && (masterRes.data ?? []).length > 0) {
        const seedCompany = SEED_COMPANIES.find((c) => c.company_id === id);
        const seedSkillsMap = new Map(
          (seedCompany?.skill_levels ?? []).map((s) => [s.skill_set_id, s]),
        );

        assembledRows = (masterRes.data ?? []).map((m) => {
          const sid = Number(m.skill_set_id);
          const seed = seedSkillsMap.get(sid);
          return {
            skill_set_id: sid,
            skill_set_name: asString(m.skill_set_name) || asString(m.short_name),
            required_level: seed ? seed.required_level : 6,
            required_proficiency: seed ? seed.required_proficiency : "Proficient",
          };
        });
      } else if (assembledRows.length === 0) {
        const seedCompany = SEED_COMPANIES.find((c) => c.company_id === id);
        assembledRows = (seedCompany?.skill_levels ?? []).map((s) => ({
          skill_set_id: s.skill_set_id,
          skill_set_name: s.skill_set_name,
          required_level: s.required_level,
          required_proficiency: s.required_proficiency,
        }));
      }

      const normalizedSkills = normalizeDashboardSkills(assembledRows);
      const skills: SkillWithTopics[] = normalizedSkills.map((s) => ({
        ...s,
        topics: topics[s.id] ?? [],
      }));

      return { skills, topics };
    },
  });
}
