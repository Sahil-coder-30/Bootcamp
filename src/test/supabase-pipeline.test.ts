import { describe, expect, it } from "vitest";
import { isSupabaseConfigured, supabase } from "@/lib/supabaseClient";
import {
  normalizeCompanyProfile,
  normalizeCompanySummary,
  normalizeDashboardSkills,
  scoreToDifficulty,
  scoreToCriticality,
  proficiencyToBloom,
  type CompanySummary,
} from "@/lib/companyData";
import { SEED_COMPANIES } from "@/data/seedCompanies";

describe("Database Pipeline: Supabase Configuration", () => {
  it("has Supabase properly configured from environment", () => {
    expect(isSupabaseConfigured).toBe(true);
    expect(supabase).toBeDefined();
    expect(supabase.from).toBeTypeOf("function");
  });
});

describe("Database Pipeline: Normalizers with Raw Database Shapes", () => {
  it("normalizes short_json into CompanySummary shape", () => {
    const rawShortJson = {
      name: "Acme Corp",
      short_name: "Acme",
      logo_url: "https://example.com/logo.svg",
      category: "Tech",
      company_type: "Dream",
      incorporation_year: 2010,
      employee_size: "5,000 employees",
      headquarters_address: "Bengaluru, India",
      operating_countries: "India; USA",
      office_locations: "Bengaluru; San Francisco",
      yoy_growth_rate: "15%",
      website_url: "https://example.com",
    };

    const normalized = normalizeCompanySummary(rawShortJson, 42);

    expect(normalized.id).toBe(42);
    expect(normalized.name).toBe("Acme Corp");
    expect(normalized.shortName).toBe("Acme");
    expect(normalized.companyType).toBe("Dream");
    expect(normalized.websiteUrl).toBe("https://example.com");
  });

  it("handles null and unexpected values safely in normalizeCompanySummary", () => {
    const malformedJson = {
      name: null,
      company_type: "UnknownType",
    };

    const normalized = normalizeCompanySummary(malformedJson, 0);

    expect(normalized.id).toBe(0);
    expect(normalized.name).toBe("");
    expect(normalized.companyType).toBe("Regular"); // Defaults to Regular
    expect(normalized.websiteUrl).toBe("");
  });

  it("normalizes and merges short_json and full_json for CompanyProfile", () => {
    const shortJson = { name: "Acme Corp", short_name: "Acme", logo_url: "https://example.com/logo.png" };
    const fullJson = {
      overview_text: "A tech company",
      ceo_name: "Jane Doe",
      annual_revenue: "$100M",
      tech_stack: ["TypeScript", "React", "PostgreSQL"],
    };

    const profile = normalizeCompanyProfile(fullJson, shortJson);

    expect(profile.name).toBe("Acme Corp");
    expect(profile.short_name).toBe("Acme");
    expect(profile["ceo_name"]).toBe("Jane Doe");
    expect(profile["annual_revenue"]).toBe("$100M");
    expect(profile["tech_stack"]).toBe("TypeScript; React; PostgreSQL");
  });

  it("normalizes skill_levels into sorted DashboardSkill array", () => {
    const rawSkills = [
      { skill_set_id: 1, skill_set_name: "DSA", required_level: 5, required_proficiency: "Proficient" },
      { skill_set_id: 2, skill_set_name: "System Design", required_level: 9, required_proficiency: "Expert" },
      { skill_set_id: 3, skill_set_name: "Git", required_level: 3, required_proficiency: "Beginner" },
    ];

    const normalized = normalizeDashboardSkills(rawSkills);

    expect(normalized).toHaveLength(3);
    // Should be sorted in descending order of level (9 -> 5 -> 3)
    expect(normalized[0]?.name).toBe("System Design");
    expect(normalized[0]?.difficulty).toBe("EXPERT");
    expect(normalized[1]?.name).toBe("DSA");
    expect(normalized[1]?.difficulty).toBe("PRO");
    expect(normalized[2]?.name).toBe("Git");
    expect(normalized[2]?.difficulty).toBe("BEGINNER");
  });

  it("maps numeric levels to Bloom, Criticality and Difficulty metrics", () => {
    expect(proficiencyToBloom(1)).toBe("CU");
    expect(proficiencyToBloom(4)).toBe("AP");
    expect(proficiencyToBloom(6)).toBe("AS");
    expect(proficiencyToBloom(8)).toBe("EV");
    expect(proficiencyToBloom(10)).toBe("CR");

    expect(scoreToCriticality(9)).toBe("Critical");
    expect(scoreToCriticality(6)).toBe("Important");
    expect(scoreToCriticality(3)).toBe("Baseline");

    expect(scoreToDifficulty(8)).toBe("EXPERT");
    expect(scoreToDifficulty(7)).toBe("ADVANCED");
    expect(scoreToDifficulty(5)).toBe("PRO");
    expect(scoreToDifficulty(2)).toBe("BEGINNER");
  });
});

describe("Database Pipeline: End-to-End Live Supabase Connectivity", () => {
  it("queries company_json table successfully", async () => {
    const { data, error, status } = await supabase
      .from("company_json")
      .select("company_id, short_json")
      .limit(5);

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("queries skill_set_master table successfully", async () => {
    const { data, error, status } = await supabase
      .from("skill_set_master")
      .select("skill_set_id, skill_set_name, short_name")
      .limit(5);

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("queries proficiency_levels table successfully", async () => {
    const { data, error, status } = await supabase
      .from("proficiency_levels")
      .select("proficiency_level_id, proficiency_name, proficiency_code")
      .limit(5);

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("queries skill_set_topics table successfully", async () => {
    const { data, error, status } = await supabase
      .from("skill_set_topics")
      .select("skill_set_id, level_number, topics")
      .limit(5);

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });

  it("queries company_skill_levels table successfully", async () => {
    const { data, error, status } = await supabase
      .from("company_skill_levels")
      .select("company_id, skill_set_id, required_level, required_proficiency_level_id")
      .limit(5);

    expect(error).toBeNull();
    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("Database Pipeline: Seed Companies Integrity Check", () => {
  it("contains all 6 expected companies with valid IDs and skills", () => {
    expect(SEED_COMPANIES.length).toBe(6);

    for (const company of SEED_COMPANIES) {
      expect(company.company_id).toBeGreaterThan(0);
      expect(company.short_json).toBeDefined();
      expect(company.short_json["name"]).toBeTypeOf("string");
      expect(company.full_json).toBeDefined();
      expect(Array.isArray(company.skill_levels)).toBe(true);
      expect(company.skill_levels.length).toBe(12);

      const summary = normalizeCompanySummary(company.short_json, company.company_id);
      expect(summary.name.length).toBeGreaterThan(0);
      expect(summary.shortName.length).toBeGreaterThan(0);
    }
  });
});
