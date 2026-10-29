import { describe, expect, it } from "vitest";
import type { CompanySummary } from "../src/lib/companyData.js";
import {
  COMMANDS,
  MAX_MESSAGE,
  clip,
  esc,
  formatCompany,
  formatCompanyList,
  formatProfile,
  formatReadiness,
} from "../src/bot/format.js";

const base: CompanySummary = {
  id: 1,
  name: "Acme",
  shortName: "Acme",
  logoUrl: "",
  category: "Consulting",
  companyType: "Dream",
  incorporationYear: "1999",
  employeeSize: "1000",
  headquarters: "Delhi",
  operatingCountries: "India",
  officeLocations: "Delhi",
  yoyGrowthRate: "10%",
  websiteUrl: "https://acme.test",
};

describe("esc and clip", () => {
  it("escapes the three characters Telegram's HTML mode cares about", () => {
    expect(esc("L&T <b>x</b>")).toBe("L&amp;T &lt;b&gt;x&lt;/b&gt;");
    expect(esc(undefined)).toBe("");
    expect(esc(42)).toBe("42");
  });

  it("leaves short text alone and cuts long text on a line boundary within the limit", () => {
    expect(clip("short")).toBe("short");
    const long = Array.from({ length: 2000 }, (_, i) => `line ${i}`).join("\n");
    const out = clip(long);
    expect(out.length).toBeLessThanOrEqual(MAX_MESSAGE);
    expect(out.endsWith("…")).toBe(true);
    expect(out.split("\n").slice(0, -1).every((l) => /^line \d+$/.test(l))).toBe(true);
  });
});

describe("COMMANDS", () => {
  it("matches Telegram's rules: lowercase names up to 32 characters, descriptions 3-256", () => {
    for (const c of COMMANDS) {
      expect(c.command).toMatch(/^[a-z0-9_]{1,32}$/);
      expect(c.description.length).toBeGreaterThanOrEqual(3);
      expect(c.description.length).toBeLessThanOrEqual(256);
    }
    expect(new Set(COMMANDS.map((c) => c.command)).size).toBe(COMMANDS.length);
  });
});

describe("formatCompany", () => {
  it("shows what we know and skips what we do not", () => {
    const text = formatCompany({ ...base, headquarters: "N/A", employeeSize: "none" });
    expect(text).toContain("<b>Acme</b>");
    expect(text).toContain("<i>Consulting · Dream</i>");
    expect(text).toContain("YoY growth: 10%");
    expect(text).not.toContain("Headquarters");
    expect(text).not.toContain("Size");
    expect(text).toContain('<a href="https://acme.test">Website</a>');
  });

  it("never links a non-http URL", () => {
    expect(formatCompany({ ...base, websiteUrl: "javascript:alert(1)" })).not.toContain("<a ");
    expect(formatCompany({ ...base, websiteUrl: "" })).not.toContain("<a ");
  });
});

describe("formatCompanyList", () => {
  it("counts, and tells the user how to narrow a long list", () => {
    const list = Array.from({ length: 12 }, (_, i) => ({ ...base, id: i, name: `C${i}` }));
    expect(formatCompanyList(list, 118, 8, "")).toContain("<b>118</b> recruiting companies");
    expect(formatCompanyList(list, 118, 8, "c")).toContain("<b>12</b> companies match <b>c</b>");
    expect(formatCompanyList(list, 118, 8, "c")).toContain("Showing 8");
    expect(formatCompanyList([list[0]!], 118, 1, "c0")).toContain("<b>1</b> company matches");
  });

  it("handles no results and escapes the query", () => {
    expect(formatCompanyList([], 0, 0, "<x>")).toContain("No company matches <b>&lt;x&gt;</b>");
    expect(formatCompanyList([], 0, 0, "")).toContain("no companies to show");
  });
});

describe("formatReadiness", () => {
  const result = {
    company: "Google LLC",
    readiness_score: 55,
    verdict: "not_yet",
    skillset_gap: [
      { category_code: "COD", required_level: 8, candidate_level: 7, gap: true, shortfall: 1 },
      { category_code: "SYSD", required_level: 7, candidate_level: 3, gap: true, shortfall: 4, blocking: true },
      { category_code: "DSA", required_level: 7, candidate_level: 5, gap: true, shortfall: 2 },
      { category_code: "OS", required_level: 6, candidate_level: 3, gap: true, shortfall: 3 },
      { category_code: "AI", required_level: 6, candidate_level: 4, gap: true, shortfall: 2 },
      { category_code: "SQL", required_level: 4, candidate_level: 6, gap: false, shortfall: 0 },
    ],
  };

  it("lists the biggest gaps first, four at most, and counts the rest", () => {
    const text = formatReadiness(result);
    expect(text).toContain("Readiness <b>55/100</b> · Not yet");
    const gapLines = text.split("\n").filter((l) => l.startsWith("•"));
    expect(gapLines).toHaveLength(4);
    expect(gapLines[0]).toContain("System Design: you 3, needed 7 (4 short, blocking)");
    expect(gapLines[1]).toContain("Operating Systems");
    expect(text).toContain("…and 1 more.");
    expect(text).not.toContain("SQL");
  });

  it("celebrates when there are no gaps, and omits the range and plan when absent", () => {
    const text = formatReadiness({ company: "X", readiness_score: 100, verdict: "ready", skillset_gap: [] });
    expect(text).toContain("You meet this company's bar in every category.");
    expect(text).not.toContain("Likely range");
    expect(text).not.toContain("hours");
  });

  it("falls back to the raw verdict and unknown category codes", () => {
    const text = formatReadiness({
      company: "X",
      readiness_score: 10,
      verdict: "weird",
      skillset_gap: [{ category_code: "ZZZ", required_level: 3, candidate_level: 1, gap: true, shortfall: 2 }],
    });
    expect(text).toContain("· weird");
    expect(text).toContain("ZZZ: you 1, needed 3");
  });
});

describe("formatProfile", () => {
  it("names the three strongest and three weakest categories", () => {
    const text = formatProfile({
      name: "Ana <Lyst>",
      completeness: 90,
      levels: { COD: 8, DSA: 7, SQL: 6, OS: 2, NETW: 3, AI: 4 },
    });
    expect(text).toContain("<b>Ana &lt;Lyst&gt;</b>");
    const [strong, weak] = text.split("<b>Needs most work</b>");
    expect(strong).toMatch(/Coding: 8\/10[\s\S]*Data Structures &amp; Algorithms: 7\/10[\s\S]*SQL: 6\/10/);
    expect(weak).toMatch(/Operating Systems: 2\/10[\s\S]*Networking: 3\/10[\s\S]*AI: 4\/10/);
  });

  it("copes with a profile that has no levels", () => {
    expect(formatProfile({ name: "N", completeness: 0, levels: {} })).toBe("<b>N</b>\nProfile 0% complete");
  });
});
