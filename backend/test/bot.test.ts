// The Telegram bot with a fake Telegram API and fake services: no network, no token.
import { describe, expect, it, vi } from "vitest";
import type { CompanySummary } from "../src/lib/companyData.js";
import { createBot, MAX_BUTTONS, matchCompanies, type BotDeps } from "../src/bot/bot.js";
import { HELP, HOW_TO_LINK, NOT_LINKED, WELCOME, type ReadinessResult } from "../src/bot/format.js";
import { createMemoryLinkStore } from "../src/bot/linkStore.js";

const company = (id: number, name: string, over: Partial<CompanySummary> = {}): CompanySummary => ({
  id,
  name,
  shortName: name.split(" ")[0] ?? name,
  logoUrl: "",
  category: "Enterprise",
  companyType: "Regular",
  incorporationYear: "2000",
  employeeSize: "1000",
  headquarters: "Delhi",
  operatingCountries: "India",
  officeLocations: "Delhi",
  yoyGrowthRate: "5%",
  websiteUrl: "https://example.test",
  ...over,
});

const COMPANIES = [
  company(4, "Google LLC", { companyType: "Super Dream", shortName: "Google" }),
  company(78, "Microsoft Corporation", { companyType: "Dream", shortName: "Microsoft" }),
  company(24, "Oracle Financial Services", { shortName: "Oracle FSS" }),
  company(3, "Oracle India", { shortName: "Oracle India" }),
  company(9, "L&T <Infotech>", { shortName: "LTI" }),
];

const RESULT: ReadinessResult = {
  company: "Google LLC",
  readiness_score: 72,
  verdict: "almost",
  readiness_range: { low: 64, high: 80 },
  skillset_gap: [
    { category_code: "SYSD", required_level: 7, candidate_level: 4, gap: true, shortfall: 3, blocking: true },
    { category_code: "COD", required_level: 8, candidate_level: 7, gap: true, shortfall: 1 },
    { category_code: "SQL", required_level: 5, candidate_level: 6, gap: false, shortfall: 0 },
  ],
  study_plan: { total_hours: 12, total_steps: 4 },
};

const BOT_INFO = {
  id: 1,
  is_bot: true as const,
  first_name: "PlaceIntel",
  username: "placeintel_test_bot",
  can_join_groups: true,
  can_read_all_group_messages: false,
  supports_inline_queries: false,
  can_connect_to_business: false,
  has_main_web_app: false,
  has_topics_enabled: false,
  allows_users_to_create_topics: false,
  can_manage_bots: false,
  supports_join_request_queries: false,
};

interface Sent {
  method: string;
  payload: Record<string, any>;
}

function harness(over: Partial<BotDeps> = {}, maxPerMinute?: number) {
  const sent: Sent[] = [];
  const store = createMemoryLinkStore();
  const runTalentCheck = vi.fn(async () => RESULT);
  const deps: BotDeps = {
    store,
    listCompanies: async () => COMPANIES,
    getProfile: async () => ({ name: "Ana Lyst", completeness: 80, levels: { COD: 7, DSA: 6, SQL: 3, OS: 2, SYSD: 4 } }),
    runTalentCheck,
    ...over,
  };
  const bot = createBot("123:TEST", deps, { botInfo: BOT_INFO, ...(maxPerMinute ? { maxPerMinute } : {}) });
  bot.api.config.use(async (_prev, method, payload) => {
    sent.push({ method, payload: payload as Record<string, any> });
    const result =
      method === "sendMessage" || method === "editMessageText"
        ? { message_id: 1, date: 0, chat: { id: 1, type: "private" }, text: "" }
        : true;
    return { ok: true, result } as never;
  });

  let n = 0;
  const CHAT = 1001;
  const user = { id: CHAT, is_bot: false, first_name: "Ana" };
  const send = (text: string, chat: Record<string, unknown> = { id: CHAT, type: "private", first_name: "Ana" }) =>
    bot.handleUpdate({
      update_id: ++n,
      message: {
        message_id: n,
        date: 0,
        chat,
        from: user,
        text,
        ...(text.startsWith("/") ? { entities: [{ type: "bot_command", offset: 0, length: text.split(" ")[0]!.length }] } : {}),
      },
    } as never);
  const tap = (data: string) =>
    bot.handleUpdate({
      update_id: ++n,
      callback_query: {
        id: String(n),
        from: user,
        chat_instance: "x",
        data,
        message: { message_id: 1, date: 0, chat: { id: CHAT, type: "private" }, text: "" },
      },
    } as never);

  /** Text of every message the bot sent. */
  const texts = () => sent.filter((s) => s.method === "sendMessage" || s.method === "editMessageText").map((s) => String(s.payload["text"]));
  const last = () => sent.filter((s) => s.method === "sendMessage").at(-1)!;
  const buttons = (s: Sent) => (s.payload["reply_markup"]?.inline_keyboard ?? []).flat() as { text: string; callback_data: string }[];
  const link = async (profileId = "p1") => {
    const { code } = await store.createCode(profileId);
    await send(`/start ${code}`);
    sent.length = 0;
  };
  return { sent, store, deps, runTalentCheck, send, tap, texts, last, buttons, link, CHAT };
}

describe("matchCompanies", () => {
  it("prefers an exact name, then falls back to contains", () => {
    expect(matchCompanies(COMPANIES, "google").map((c) => c.id)).toEqual([4]);
    expect(matchCompanies(COMPANIES, "oracle").map((c) => c.id)).toEqual([24, 3]);
    expect(matchCompanies(COMPANIES, "Oracle India").map((c) => c.id)).toEqual([3]);
    expect(matchCompanies(COMPANIES, "l&t")).toHaveLength(1);
    expect(matchCompanies(COMPANIES, "zzz")).toEqual([]);
  });

  it("with no query lists the premium tiers first", () => {
    expect(matchCompanies(COMPANIES, "").slice(0, 2).map((c) => c.name)).toEqual(["Google LLC", "Microsoft Corporation"]);
  });
});

describe("/start and linking", () => {
  it("welcomes someone who just opened the bot", async () => {
    const h = harness();
    await h.send("/start");
    expect(h.last().payload["text"]).toBe(WELCOME);
    expect(h.last().payload["parse_mode"]).toBe("HTML");
  });

  it("links the chat with a valid one-time code and greets by name", async () => {
    const h = harness();
    const { code } = await h.store.createCode("profile-1");
    await h.send(`/start ${code}`);
    expect(h.last().payload["text"]).toContain("Connected to <b>Ana Lyst</b>");
    expect(await h.store.getProfileId(h.CHAT)).toBe("profile-1");
  });

  it("a code works once", async () => {
    const h = harness();
    const { code } = await h.store.createCode("profile-1");
    await h.send(`/start ${code}`);
    await h.send(`/start ${code}`);
    expect(h.last().payload["text"]).toMatch(/expired or was already used/);
  });

  it("rejects an unknown code without linking", async () => {
    const h = harness();
    await h.send("/start not-a-real-code");
    expect(h.last().payload["text"]).toMatch(/expired or was already used/);
    expect(await h.store.getProfileId(h.CHAT)).toBeNull();
  });

  it("says something useful when linking fails on our side", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const h = harness({ getProfile: async () => Promise.reject(new Error("db exploded")) });
    const { code } = await h.store.createCode("profile-1");
    await h.send(`/start ${code}`);
    expect(h.last().payload["text"]).toBe("Something went wrong on my side. Please try again.");
    expect(h.last().payload["text"]).not.toContain("db exploded");
    err.mockRestore();
  });

  it("/link explains how, /help lists the commands", async () => {
    const h = harness();
    await h.send("/link");
    expect(h.last().payload["text"]).toBe(HOW_TO_LINK);
    await h.send("/help");
    expect(h.last().payload["text"]).toBe(HELP);
  });

  it("/unlink disconnects, and says so when there was nothing to disconnect", async () => {
    const h = harness();
    await h.link();
    await h.send("/unlink");
    expect(h.last().payload["text"]).toMatch(/Disconnected/);
    expect(await h.store.getProfileId(h.CHAT)).toBeNull();
    await h.send("/unlink");
    expect(h.last().payload["text"]).toBe("This chat was not connected.");
  });
});

describe("/me", () => {
  it("asks to link first", async () => {
    const h = harness();
    await h.send("/me");
    expect(h.last().payload["text"]).toBe(NOT_LINKED);
  });

  it("shows the profile summary when linked", async () => {
    const h = harness();
    await h.link();
    await h.send("/me");
    const text = String(h.last().payload["text"]);
    expect(text).toContain("<b>Ana Lyst</b>");
    expect(text).toContain("80% complete");
    expect(text).toMatch(/Strongest[\s\S]*Coding: 7\/10/);
  });
});

describe("/companies", () => {
  it("lists at most 8 companies as buttons", async () => {
    const many = Array.from({ length: 20 }, (_, i) => company(100 + i, `Company ${i}`));
    const h = harness({ listCompanies: async () => many });
    await h.send("/companies");
    expect(h.buttons(h.last())).toHaveLength(MAX_BUTTONS);
    expect(String(h.last().payload["text"])).toContain("<b>20</b> recruiting companies");
    expect(String(h.last().payload["text"])).toContain(`Showing ${MAX_BUTTONS}`);
  });

  it("filters by the text after the command", async () => {
    const h = harness();
    await h.send("/companies google");
    expect(h.buttons(h.last()).map((b) => b.callback_data)).toEqual(["co:4"]);
    expect(String(h.last().payload["text"])).toContain("<b>1</b> company matches <b>google</b>");
  });

  it("says when nothing matches, with no buttons", async () => {
    const h = harness();
    await h.send("/companies nothingmatches");
    expect(String(h.last().payload["text"])).toContain("No company matches <b>nothingmatches</b>");
    expect(h.last().payload["reply_markup"]).toBeUndefined();
  });

  it("escapes HTML in company names", async () => {
    const h = harness();
    await h.send("/companies l&t");
    await h.tap("co:9");
    expect(String(h.last().payload["text"])).toContain("<b>L&amp;T &lt;Infotech&gt;</b>");
  });

  it("tapping a company shows its card with a readiness button", async () => {
    const h = harness();
    await h.tap("co:4");
    const text = String(h.last().payload["text"]);
    expect(text).toContain("<b>Google LLC</b>");
    expect(text).toContain("Headquarters: Delhi");
    expect(h.buttons(h.last()).map((b) => b.callback_data)).toEqual(["rd:4"]);
    expect(h.sent.some((s) => s.method === "answerCallbackQuery")).toBe(true);
  });

  it("an unknown company id on a stale button is handled", async () => {
    const h = harness();
    await h.tap("co:99999");
    expect(String(h.last().payload["text"])).toMatch(/could not find that company/);
  });

  it("reports a failing company list without leaking details", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const h = harness({ listCompanies: async () => Promise.reject(new Error("secret db password")) });
    await h.send("/companies");
    expect(String(h.last().payload["text"])).not.toContain("secret");
    err.mockRestore();
  });
});

describe("/readiness", () => {
  it("asks for a company when none is given", async () => {
    const h = harness();
    await h.send("/readiness");
    expect(String(h.last().payload["text"])).toContain("Which company?");
  });

  it("asks to link first when the chat is not connected", async () => {
    const h = harness();
    await h.send("/readiness google");
    expect(h.last().payload["text"]).toBe(NOT_LINKED);
    expect(h.runTalentCheck).not.toHaveBeenCalled();
  });

  it("runs the Talent Check for the linked profile and the single matching company", async () => {
    const h = harness();
    await h.link("profile-7");
    await h.send("/readiness google");
    expect(h.runTalentCheck).toHaveBeenCalledWith({ profileId: "profile-7", companyId: 4 });
    expect(h.sent.some((s) => s.method === "sendChatAction")).toBe(true);
    const text = String(h.last().payload["text"]);
    expect(text).toContain("Readiness <b>72/100</b> · Almost there");
    expect(text).toContain("Likely range 64-80");
    expect(text).toMatch(/System Design: you 4, needed 7 \(3 short, blocking\)/);
    expect(text).toContain("roughly 12 hours");
  });

  it("offers buttons when several companies match", async () => {
    const h = harness();
    await h.link();
    await h.send("/readiness oracle");
    expect(h.runTalentCheck).not.toHaveBeenCalled();
    expect(h.buttons(h.last()).map((b) => b.callback_data)).toEqual(["rd:24", "rd:3"]);
  });

  it("tapping a readiness button runs the check", async () => {
    const h = harness();
    await h.link("profile-7");
    await h.tap("rd:24");
    expect(h.runTalentCheck).toHaveBeenCalledWith({ profileId: "profile-7", companyId: 24 });
  });

  it("says so for an unknown company", async () => {
    const h = harness();
    await h.link();
    await h.send("/readiness zzz");
    expect(String(h.last().payload["text"])).toContain("No company matches");
    expect(h.runTalentCheck).not.toHaveBeenCalled();
  });

  it("turns a scoring-service outage into a friendly message", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const h = harness({ runTalentCheck: async () => Promise.reject(new Error("Agent service unreachable at http://localhost:8000: fetch failed")) });
    await h.link();
    await h.send("/readiness google");
    expect(h.last().payload["text"]).toBe("The scoring service is not running right now. Please try again in a moment.");
    expect(String(h.last().payload["text"])).not.toContain("localhost");
    err.mockRestore();
  });

  it("explains when the linked profile no longer exists", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const h = harness({ runTalentCheck: async () => Promise.reject(new Error("Profile not found")) });
    await h.link();
    await h.send("/readiness google");
    expect(String(h.last().payload["text"])).toMatch(/Use \/link to connect again/);
    err.mockRestore();
  });
});

describe("guards", () => {
  it("only works in private chats", async () => {
    const h = harness();
    await h.send("/companies", { id: -500, type: "group", title: "Class group" });
    expect(h.last().payload["text"]).toBe("I only work in private chats. Message me directly.");
    expect(h.sent.filter((s) => s.method === "sendMessage")).toHaveLength(1);
  });

  it("slows down a chat that floods it, and warns only once", async () => {
    const h = harness({}, 3);
    for (let i = 0; i < 6; i++) await h.send("/help");
    const replies = h.texts();
    expect(replies.filter((t) => t === HELP)).toHaveLength(3);
    expect(replies.filter((t) => t.includes("going a little fast"))).toHaveLength(1);
  });

  it("answers plain text with a hint", async () => {
    const h = harness();
    await h.send("hello there");
    expect(String(h.last().payload["text"])).toBe("I did not understand that. Try /help.");
  });
});
