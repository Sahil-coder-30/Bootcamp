// Shared types and display helpers. The backend owns data access and normalization
// (backend/src/lib/companyData.ts); keep the types here in sync with it.

export type CompanyType = "Super Dream" | "Dream" | "Standard" | "Regular";

export interface CompanySummary {
  id: number;
  name: string;
  shortName: string;
  logoUrl: string;
  category: string;
  companyType: CompanyType;
  incorporationYear: string;
  employeeSize: string;
  headquarters: string;
  operatingCountries: string;
  officeLocations: string;
  yoyGrowthRate: string;
  websiteUrl: string;
}

export interface CompanyProfile extends Record<string, string> {
  name: string;
  short_name: string;
  category: string;
  logo_url: string;
  website_url: string;
  linkedin_url: string;
}

export interface DashboardSkill {
  id: number;
  name: string;
  level: number;
  proficiency: string;
  difficulty: "EXPERT" | "ADVANCED" | "PRO" | "BEGINNER";
}

export const asString = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (Array.isArray(v)) return v.map(asString).join("; ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v).trim();
};

export const asRecord = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

export const splitItems = (v: string): string[] =>
  v
    .split(/\n|;|•|(?<=\.)\s+(?=[A-Z])/)
    .map((s) => s.replace(/^[-*\s]+/, "").trim())
    .filter(Boolean);

export const titleCaseFromCode = (code: string): string =>
  code
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");

export const scoreToDifficulty = (n: number): DashboardSkill["difficulty"] =>
  n >= 8 ? "EXPERT" : n >= 6 ? "ADVANCED" : n >= 4 ? "PRO" : "BEGINNER";

const NULLISH = new Set(["na", "n/a", "none", "-", "null", "undefined", ""]);
export const isNullish = (v: unknown): boolean => NULLISH.has(asString(v).toLowerCase());

const TYPES: CompanyType[] = ["Super Dream", "Dream", "Standard", "Regular"];
const toType = (v: unknown): CompanyType => {
  const s = asString(v).toLowerCase();
  return TYPES.find((t) => t.toLowerCase() === s) ?? "Regular";
};

export function normalizeCompanySummary(shortJson: unknown, id = 0): CompanySummary {
  const r = asRecord(shortJson);
  return {
    id,
    name: asString(r["name"]),
    shortName: asString(r["short_name"]) || asString(r["name"]),
    logoUrl: asString(r["logo_url"]),
    category: asString(r["category"]),
    companyType: toType(r["company_type"]),
    incorporationYear: asString(r["incorporation_year"]),
    employeeSize: asString(r["employee_size"]),
    headquarters: asString(r["headquarters_address"]),
    operatingCountries: asString(r["operating_countries"]),
    officeLocations: asString(r["office_locations"]),
    yoyGrowthRate: asString(r["yoy_growth_rate"]),
    websiteUrl: asString(r["website_url"]),
  };
}

export function normalizeCompanyProfile(fullJson: unknown, shortJson: unknown): CompanyProfile {
  const out = {
    name: "",
    short_name: "",
    category: "",
    logo_url: "",
    website_url: "",
    linkedin_url: "",
  } as CompanyProfile;
  for (const [k, v] of Object.entries({ ...asRecord(shortJson), ...asRecord(fullJson) })) {
    out[k] = asString(v);
  }
  return out;
}

export function normalizeDashboardSkills(skillLevels: unknown): DashboardSkill[] {
  if (!Array.isArray(skillLevels)) return [];
  return skillLevels
    .map((s) => {
      const r = asRecord(s);
      const level = Number(r["required_level"]) || 0;
      return {
        id: Number(r["skill_set_id"]) || 0,
        name: asString(r["skill_set_name"]),
        level,
        proficiency: asString(r["required_proficiency"]),
        difficulty: scoreToDifficulty(level),
      };
    })
    .sort((a, b) => b.level - a.level);
}

export type Bloom = "CU" | "AP" | "AS" | "EV" | "CR";
export const proficiencyToBloom = (n: number): Bloom =>
  n <= 2 ? "CU" : n <= 4 ? "AP" : n <= 6 ? "AS" : n <= 8 ? "EV" : "CR";
export type Criticality = "Critical" | "Important" | "Baseline";
export const scoreToCriticality = (n: number): Criticality =>
  n >= 7 ? "Critical" : n >= 5 ? "Important" : "Baseline";
