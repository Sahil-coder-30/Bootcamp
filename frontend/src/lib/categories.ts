// The 12 RADIX skill categories (docs/00-shared-contract.md section 2): one place for the
// names, Bloom labels and chart colours, shared by every Talent Match feature.

export const CODES = [
  "COD",
  "DSA",
  "APTI",
  "COMM",
  "OOD",
  "AI",
  "SQL",
  "SYSD",
  "CLOUD",
  "SWE",
  "NETW",
  "OS",
] as const;

export type Code = (typeof CODES)[number];

export const CATEGORY_CODES = [...CODES, "OTHER"] as const;
export type CategoryCode = (typeof CATEGORY_CODES)[number];

export const CATEGORY_NAMES: Record<CategoryCode, string> = {
  COD: "Coding",
  DSA: "Data Structures & Algorithms",
  APTI: "Aptitude & Problem Solving",
  COMM: "Communication",
  OOD: "Object-Oriented Design",
  AI: "AI",
  SQL: "SQL",
  SYSD: "System Design",
  CLOUD: "DevOps & Cloud",
  SWE: "Software Engineering",
  NETW: "Computer Networking",
  OS: "Operating Systems",
  OTHER: "Other (domain, tools)",
};

/** `skill_set_id` in `skill_set_master` (the live database). */
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

export type Bloom = "CU" | "AP" | "AS" | "EV" | "CR";

export const BLOOM_NAMES: Record<Bloom, string> = {
  CU: "Conceptual Understanding",
  AP: "Application",
  AS: "Analysis and Synthesis",
  EV: "Evaluation",
  CR: "Creation",
};

/** Bloom band for a 1-10 level: 1-2 CU, 3-4 AP, 5-6 AS, 7-8 EV, 9-10 CR. */
export function bloomOf(level: number): Bloom {
  const bands: Bloom[] = ["CU", "AP", "AS", "EV", "CR"];
  const i = Math.min(4, Math.max(0, Math.ceil(Math.min(10, Math.max(1, level)) / 2) - 1));
  return bands[i] as Bloom;
}

export const bloomFor = bloomOf;

/** Colour-blind-safe categorical palette, one hue per category. */
export const CATEGORY_COLORS: Record<CategoryCode, string> = {
  COD: "#2563eb",
  DSA: "#7c3aed",
  APTI: "#0d9488",
  COMM: "#d97706",
  OOD: "#db2777",
  AI: "#4f46e5",
  SQL: "#059669",
  SYSD: "#dc2626",
  CLOUD: "#0284c7",
  SWE: "#65a30d",
  NETW: "#9333ea",
  OS: "#ea580c",
  OTHER: "#94a3b8",
};

export const isCode = (v: string): v is Code => (CODES as readonly string[]).includes(v);
export const categoryName = (code: string): string => CATEGORY_NAMES[code as CategoryCode] ?? code;
export const categoryColor = (code: string): string =>
  CATEGORY_COLORS[code as CategoryCode] ?? CATEGORY_COLORS.OTHER;
