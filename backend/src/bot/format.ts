// Message text for the Telegram bot. Pure functions: data in, HTML string out. Telegram's HTML mode
// is used instead of MarkdownV2 because names like "L&T" or "Procter (India)" would need escaping
// in half a dozen places there; HTML only needs & < > escaped.
import { isNullish, type CompanySummary } from "../lib/companyData.js";

export const MAX_MESSAGE = 4096;

export const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

/** Telegram rejects messages over 4096 characters: cut on a line boundary, never mid-tag. */
export function clip(text: string): string {
  if (text.length <= MAX_MESSAGE) return text;
  const cut = text.slice(0, MAX_MESSAGE - 20);
  return `${cut.slice(0, cut.lastIndexOf("\n") > 0 ? cut.lastIndexOf("\n") : cut.length)}\n…`;
}

export const CATEGORY_NAMES: Record<string, string> = {
  COD: "Coding",
  DSA: "Data Structures & Algorithms",
  APTI: "Aptitude",
  COMM: "Communication",
  OOD: "Object-Oriented Design",
  AI: "AI",
  SQL: "SQL",
  SYSD: "System Design",
  CLOUD: "DevOps & Cloud",
  SWE: "Software Engineering",
  NETW: "Networking",
  OS: "Operating Systems",
};
const nameOf = (code: string) => CATEGORY_NAMES[code] ?? code;

/** The commands shown in Telegram's menu (kept in code so they cannot drift from the handlers). */
export const COMMANDS: { command: string; description: string }[] = [
  { command: "start", description: "Welcome and how to connect your profile" },
  { command: "help", description: "What this bot can do" },
  { command: "companies", description: "Search recruiting companies" },
  { command: "readiness", description: "Your Talent Check for a company" },
  { command: "me", description: "Your linked profile" },
  { command: "link", description: "Connect this chat to your profile" },
  { command: "unlink", description: "Disconnect this chat" },
];

export const WELCOME = [
  "<b>Welcome to PlaceIntel</b>",
  "Explore the companies that recruit on campus and see how ready you are for each one.",
  "",
  "Try <code>/companies google</code> to look up a company, or /link to connect your profile so I can check your readiness.",
].join("\n");

export const HELP = [
  "<b>What I can do</b>",
  "/companies &lt;name&gt; - search recruiting companies",
  "/readiness &lt;company&gt; - your Talent Check for that company",
  "/me - your linked profile",
  "/link - connect this chat to your PlaceIntel profile",
  "/unlink - disconnect this chat",
].join("\n");

export const HOW_TO_LINK = [
  "To connect your profile, open it in PlaceIntel and choose <b>Connect Telegram</b>. That opens this chat with a one-time code, valid for 10 minutes.",
  "",
  "Your profile is only ever linked by that code, never by typing an email.",
].join("\n");

export const NOT_LINKED = ["I do not know which profile is yours yet.", "", HOW_TO_LINK].join("\n");

const TIER_LABEL: Record<string, string> = {
  "Super Dream": "Super Dream",
  Dream: "Dream",
  Standard: "Standard",
  Regular: "Regular",
};

const safeUrl = (u: string) => (/^https?:\/\//i.test(u.trim()) ? u.trim() : "");

export function formatCompany(c: CompanySummary): string {
  const lines = [`<b>${esc(c.name)}</b>`];
  const sub = [c.category, TIER_LABEL[c.companyType]].filter((x) => x && !isNullish(x));
  if (sub.length) lines.push(`<i>${esc(sub.join(" · "))}</i>`);
  lines.push("");
  if (!isNullish(c.headquarters)) lines.push(`Headquarters: ${esc(c.headquarters)}`);
  if (!isNullish(c.employeeSize)) lines.push(`Size: ${esc(c.employeeSize)}`);
  if (!isNullish(c.yoyGrowthRate)) lines.push(`YoY growth: ${esc(c.yoyGrowthRate)}`);
  const url = safeUrl(c.websiteUrl);
  if (url) lines.push(`<a href="${esc(url)}">Website</a>`);
  return clip(lines.join("\n"));
}

export function formatCompanyList(matches: CompanySummary[], total: number, shown: number, query: string): string {
  if (matches.length === 0) {
    return query
      ? `No company matches <b>${esc(query)}</b>. Try a shorter name, or just /companies.`
      : "There are no companies to show yet.";
  }
  const head = query
    ? `<b>${matches.length}</b> ${matches.length === 1 ? "company matches" : "companies match"} <b>${esc(query)}</b>`
    : `<b>${total}</b> recruiting companies`;
  const more = matches.length > shown ? `\nShowing ${shown}. Search with <code>/companies &lt;name&gt;</code> to narrow it down.` : "";
  return `${head}.${more}\nTap one to see its profile.`;
}

export interface ReadinessResult {
  company: string;
  readiness_score: number;
  verdict: "ready" | "almost" | "not_yet" | string;
  readiness_range?: { low: number; high: number } | null;
  skillset_gap?: {
    category_code: string;
    required_level: number;
    candidate_level: number;
    gap: boolean;
    shortfall: number;
    blocking?: boolean;
  }[];
  study_plan?: { total_hours?: number; total_steps?: number } | null;
}

const VERDICT_LABEL: Record<string, string> = {
  ready: "Ready",
  almost: "Almost there",
  not_yet: "Not yet",
};

const MAX_GAPS = 4;

export function formatReadiness(r: ReadinessResult): string {
  const lines = [
    `<b>${esc(r.company)}</b>`,
    `Readiness <b>${esc(r.readiness_score)}/100</b> · ${esc(VERDICT_LABEL[r.verdict] ?? r.verdict)}`,
  ];
  if (r.readiness_range) lines.push(`Likely range ${esc(r.readiness_range.low)}-${esc(r.readiness_range.high)}`);

  const gaps = (r.skillset_gap ?? [])
    .filter((g) => g.gap && g.shortfall > 0)
    .sort((a, b) => b.shortfall - a.shortfall || a.category_code.localeCompare(b.category_code));

  lines.push("");
  if (gaps.length === 0) {
    lines.push("You meet this company's bar in every category.");
  } else {
    lines.push("<b>Biggest gaps</b>");
    for (const g of gaps.slice(0, MAX_GAPS)) {
      lines.push(
        `• ${esc(nameOf(g.category_code))}: you ${esc(g.candidate_level)}, needed ${esc(g.required_level)}` +
          ` (${esc(g.shortfall)} short${g.blocking ? ", blocking" : ""})`,
      );
    }
    if (gaps.length > MAX_GAPS) lines.push(`…and ${gaps.length - MAX_GAPS} more.`);
  }
  const hours = r.study_plan?.total_hours;
  if (hours) lines.push("", `<i>Closing these takes roughly ${esc(hours)} hours of study.</i>`);
  return clip(lines.join("\n"));
}

export interface ProfileView {
  name: string;
  completeness: number;
  /** category code -> level (1-10) */
  levels: Record<string, number>;
}

export function formatProfile(p: ProfileView): string {
  const ranked = Object.entries(p.levels).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const line = ([code, level]: [string, number]) => `• ${esc(nameOf(code))}: ${esc(level)}/10`;
  const lines = [`<b>${esc(p.name)}</b>`, `Profile ${esc(p.completeness)}% complete`];
  if (ranked.length) {
    lines.push("", "<b>Strongest</b>", ...ranked.slice(0, 3).map(line));
    lines.push("", "<b>Needs most work</b>", ...ranked.slice(-3).reverse().map(line));
  }
  return clip(lines.join("\n"));
}
