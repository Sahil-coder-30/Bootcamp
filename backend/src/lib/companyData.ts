// Pure normalizers. Inputs are the raw JSON shapes (short_json / full_json / skill_levels)
// so Phase 2 can pipe database rows in without changes.
import { SEED_COMPANIES } from "../data/seedCompanies.js";

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
const toType = (v: unknown, name = "", category = "", id = 0): CompanyType => {
  const s = asString(v).toLowerCase().replace(/[-_]/g, " ").trim();
  const found = TYPES.find((t) => t.toLowerCase() === s);
  if (found) return found;

  const n = name.toLowerCase();
  if (
    [
      "google",
      "apple",
      "microsoft",
      "amazon",
      "meta",
      "nvidia",
      "netflix",
      "adobe",
      "uber",
      "atlassian",
      "salesforce",
      "goldman",
      "morgan stanley",
      "qualcomm",
      "oracle",
      "cisco",
      "stripe",
      "databricks",
      "snowflake",
      "palantir",
      "de shaw",
    ].some((k) => n.includes(k))
  )
    return "Super Dream";

  if (
    [
      "accenture",
      "fractal",
      "ather",
      "optum",
      "indmoney",
      "intel",
      "samsung",
      "dell",
      "sap",
      "vmware",
      "paypal",
      "walmart",
      "siemens",
      "bosch",
      "sony",
      "ibm",
      "barclays",
      "jpmorgan",
      "mastercard",
      "visa",
      "airbus",
      "boeing",
      "seagate",
      "mitsubishi",
    ].some((k) => n.includes(k))
  )
    return "Dream";

  if (
    [
      "deloitte",
      "pwc",
      "ey",
      "kpmg",
      "capgemini",
      "lti",
      "cognizant",
      "hexaware",
      "tech mahindra",
      "wipro",
      "infosys",
      "tcs",
      "hcl",
      "persistent",
      "mphasis",
      "birlasoft",
      "simplilearn",
      "hexagon",
    ].some((k) => n.includes(k))
  )
    return "Standard";

  if (!id) return "Regular";

  const tiers: CompanyType[] = [
    "Super Dream",
    "Dream",
    "Dream",
    "Standard",
    "Standard",
    "Regular",
    "Regular",
    "Regular",
  ];
  return tiers[Math.abs(id) % tiers.length] || "Regular";
};

export function normalizeCompanySummary(shortJson: unknown, id = 0): CompanySummary {
  const r = asRecord(shortJson);
  const name = asString(r["name"]);
  const category = asString(r["category"]);
  return {
    id,
    name,
    shortName: asString(r["short_name"]) || name,
    logoUrl: asString(r["logo_url"]),
    category,
    companyType: toType(r["company_type"] || r["placement_tier"] || r["tier"], name, category, id),
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
  const out = { name: "", short_name: "", category: "", logo_url: "", website_url: "", linkedin_url: "" } as CompanyProfile;
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

// Data access (Phase 1: seed). Swap these three functions for database calls in Phase 2.
export const getCompanySummaries = (): CompanySummary[] =>
  SEED_COMPANIES.map((c) => normalizeCompanySummary(c.short_json, c.company_id));

export const getCompanyProfile = (id: number): CompanyProfile | null => {
  const c = SEED_COMPANIES.find((x) => x.company_id === id);
  return c ? normalizeCompanyProfile(c.full_json, c.short_json) : null;
};

export const getCompanySkills = (id: number): DashboardSkill[] => {
  const c = SEED_COMPANIES.find((x) => x.company_id === id);
  return c ? normalizeDashboardSkills(c.skill_levels) : [];
};
