// The 12 RADIX skill categories (contract section 2) plus OTHER, in skill_set_id order.
// One place for names, Bloom bands and chart colours across features.

export const CATEGORY_CODES = [
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

export type CategoryCode = (typeof CATEGORY_CODES)[number] | "OTHER";

export const CATEGORY_NAMES: Record<CategoryCode, string> = {
  COD: "Coding",
  DSA: "Data Structures and Algorithms",
  APTI: "Aptitude and Problem Solving",
  COMM: "Communication Skills",
  OOD: "Object-Oriented Programming and Design",
  AI: "AI Native Engineering",
  SQL: "SQL and Design",
  SYSD: "System Design and Architecture",
  CLOUD: "DevOps and Cloud",
  SWE: "Software Engineering",
  NETW: "Computer Networking",
  OS: "Operating System",
  OTHER: "Other (domain, tools)",
};

export const CATEGORY_COLORS: Record<CategoryCode, string> = {
  COD: "#3b82f6",
  DSA: "#8b5cf6",
  APTI: "#f59e0b",
  COMM: "#ec4899",
  OOD: "#14b8a6",
  AI: "#a855f7",
  SQL: "#0ea5e9",
  SYSD: "#6366f1",
  CLOUD: "#22c55e",
  SWE: "#64748b",
  NETW: "#f97316",
  OS: "#84cc16",
  OTHER: "#94a3b8",
};

/** Bloom band for a 1-10 level: 1-2 CU, 3-4 AP, 5-6 AS, 7-8 EV, 9-10 CR. */
export function bloomFor(level: number): "CU" | "AP" | "AS" | "EV" | "CR" {
  if (level <= 2) return "CU";
  if (level <= 4) return "AP";
  if (level <= 6) return "AS";
  if (level <= 8) return "EV";
  return "CR";
}

export const categoryName = (code: string): string => CATEGORY_NAMES[code as CategoryCode] ?? code;
export const categoryColor = (code: string): string => CATEGORY_COLORS[code as CategoryCode] ?? CATEGORY_COLORS.OTHER;
