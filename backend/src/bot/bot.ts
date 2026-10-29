// The Telegram bot: commands, buttons and guards. It talks to the rest of the backend only through
// `BotDeps`, so tests can run it with fakes and no network (see test/bot.test.ts).
import { Bot, InlineKeyboard, type Context, type NextFunction } from "grammy";
import type { UserFromGetMe } from "grammy/types";
import type { CompanySummary, CompanyType } from "../lib/companyData.js";
import {
  esc,
  HELP,
  HOW_TO_LINK,
  NOT_LINKED,
  WELCOME,
  formatCompany,
  formatCompanyList,
  formatProfile,
  formatReadiness,
  type ProfileView,
  type ReadinessResult,
} from "./format.js";
import type { LinkStore } from "./linkStore.js";

export interface BotDeps {
  store: LinkStore;
  listCompanies(): Promise<CompanySummary[]>;
  getProfile(profileId: string): Promise<ProfileView>;
  runTalentCheck(params: { profileId: string; companyId: number }): Promise<ReadinessResult>;
}

export interface BotOptions {
  /** Skips the getMe call at startup (tests). */
  botInfo?: UserFromGetMe;
  /** Updates a chat may send per minute before the bot asks it to slow down. */
  maxPerMinute?: number;
}

const HTML = { parse_mode: "HTML" as const, link_preview_options: { is_disabled: true } };

/** How many company buttons one message shows (Telegram allows many, but they get unreadable). */
export const MAX_BUTTONS = 8;

const TIER_ORDER: Record<CompanyType, number> = { "Super Dream": 1, Dream: 2, Standard: 3, Regular: 4 };
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/** Exact name matches first, then anything that contains the query. */
export function matchCompanies(all: CompanySummary[], query: string): CompanySummary[] {
  const q = norm(query);
  if (!q) return [...all].sort((a, b) => TIER_ORDER[a.companyType] - TIER_ORDER[b.companyType] || a.name.localeCompare(b.name));
  const exact = all.filter((c) => norm(c.name) === q || norm(c.shortName) === q);
  if (exact.length > 0) return exact;
  return all.filter((c) => [c.name, c.shortName, c.category, c.headquarters].some((f) => norm(f).includes(q)));
}

const companyButtons = (list: CompanySummary[], prefix: "co" | "rd") => {
  const kb = new InlineKeyboard();
  for (const c of list.slice(0, MAX_BUTTONS)) kb.text(c.name.slice(0, 40), `${prefix}:${c.id}`).row();
  return kb;
};

/** Friendly text for a failure; never leaks internals to the chat. */
function problem(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  if (/unreachable|ECONNREFUSED|fetch failed/i.test(message)) {
    return "The scoring service is not running right now. Please try again in a moment.";
  }
  if (/not found/i.test(message)) return "I could not find that profile any more. Use /link to connect again.";
  return "Something went wrong on my side. Please try again.";
}

export function createBot(token: string, deps: BotDeps, options: BotOptions = {}): Bot {
  const bot = new Bot(token, options.botInfo ? { botInfo: options.botInfo } : {});

  // 1. Private chats only: a group bot would answer to everyone in it about one person's profile.
  bot.use(async (ctx: Context, next: NextFunction) => {
    if (ctx.chat && ctx.chat.type !== "private") {
      if (ctx.message) await ctx.reply("I only work in private chats. Message me directly.");
      return;
    }
    await next();
  });

  // 2. Per-chat rate limit.
  const hits = new Map<number, number[]>();
  const limit = options.maxPerMinute ?? 20;
  bot.use(async (ctx: Context, next: NextFunction) => {
    const id = ctx.chat?.id;
    if (id === undefined) return next();
    const now = Date.now();
    const recent = (hits.get(id) ?? []).filter((t) => now - t < 60_000);
    recent.push(now);
    hits.set(id, recent);
    if (recent.length > limit) {
      if (recent.length === limit + 1) await ctx.reply("You are going a little fast. Give me a minute.");
      return;
    }
    await next();
  });

  // ---- commands ------------------------------------------------------------------------------

  bot.command("start", async (ctx) => {
    const payload = String(ctx.match ?? "").trim();
    if (!payload) {
      await ctx.reply(WELCOME, HTML);
      return;
    }
    // Deep link from the web app: t.me/<bot>?start=<one-time code>
    try {
      const profileId = await deps.store.redeem(payload, ctx.chat.id);
      if (!profileId) {
        await ctx.reply("That link has expired or was already used. Open your profile in PlaceIntel and try Connect Telegram again.");
        return;
      }
      const profile = await deps.getProfile(profileId);
      await ctx.reply(`Connected to <b>${esc(profile.name)}</b>. Try /readiness &lt;company&gt;.`, HTML);
    } catch (err) {
      console.error("[telegram] link failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  });

  bot.command("help", (ctx) => ctx.reply(HELP, HTML));
  bot.command("link", (ctx) => ctx.reply(HOW_TO_LINK, HTML));

  bot.command("unlink", async (ctx) => {
    const removed = await deps.store.unlink(ctx.chat.id);
    await ctx.reply(removed ? "Disconnected. I no longer know which profile is yours." : "This chat was not connected.");
  });

  bot.command("me", async (ctx) => {
    const profileId = await deps.store.getProfileId(ctx.chat.id);
    if (!profileId) return void (await ctx.reply(NOT_LINKED, HTML));
    try {
      await ctx.reply(formatProfile(await deps.getProfile(profileId)), HTML);
    } catch (err) {
      console.error("[telegram] /me failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  });

  bot.command("companies", async (ctx) => {
    const query = String(ctx.match ?? "").trim();
    try {
      const all = await deps.listCompanies();
      const matches = matchCompanies(all, query);
      const shown = Math.min(matches.length, MAX_BUTTONS);
      await ctx.reply(formatCompanyList(matches, all.length, shown, query), {
        ...HTML,
        ...(matches.length ? { reply_markup: companyButtons(matches, "co") } : {}),
      });
    } catch (err) {
      console.error("[telegram] /companies failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  });

  /** Runs a Talent Check for the linked profile and answers in the chat. */
  async function readiness(ctx: Context, companyId: number) {
    const chatId = ctx.chat?.id;
    if (chatId === undefined) return;
    const profileId = await deps.store.getProfileId(chatId);
    if (!profileId) return void (await ctx.reply(NOT_LINKED, HTML));
    await ctx.replyWithChatAction("typing");
    try {
      await ctx.reply(formatReadiness(await deps.runTalentCheck({ profileId, companyId })), HTML);
    } catch (err) {
      console.error("[telegram] readiness failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  }

  bot.command("readiness", async (ctx) => {
    const query = String(ctx.match ?? "").trim();
    if (!query) {
      await ctx.reply("Which company? For example <code>/readiness google</code>, or use /companies to browse.", HTML);
      return;
    }
    try {
      const matches = matchCompanies(await deps.listCompanies(), query);
      if (matches.length === 0) return void (await ctx.reply(formatCompanyList([], 0, 0, query), HTML));
      const [only] = matches;
      if (matches.length === 1 && only) return await readiness(ctx, only.id);
      await ctx.reply(`Several companies match <b>${esc(query)}</b>. Which one?`, {
        ...HTML,
        reply_markup: companyButtons(matches, "rd"),
      });
    } catch (err) {
      console.error("[telegram] /readiness failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  });

  // ---- buttons -------------------------------------------------------------------------------

  bot.callbackQuery(/^co:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    const id = Number(ctx.match[1]);
    try {
      const company = (await deps.listCompanies()).find((c) => c.id === id);
      if (!company) return void (await ctx.reply("I could not find that company any more."));
      const keyboard = new InlineKeyboard().text("Check my readiness", `rd:${id}`);
      await ctx.reply(formatCompany(company), { ...HTML, reply_markup: keyboard });
    } catch (err) {
      console.error("[telegram] company card failed:", err instanceof Error ? err.message : err);
      await ctx.reply(problem(err));
    }
  });

  bot.callbackQuery(/^rd:(\d+)$/, async (ctx) => {
    await ctx.answerCallbackQuery();
    await readiness(ctx, Number(ctx.match[1]));
  });

  // Anything else
  bot.on("message", (ctx) => ctx.reply("I did not understand that. Try /help.", HTML));

  bot.catch((err) => console.error("[telegram] unhandled error:", err.error instanceof Error ? err.error.message : err.error));
  return bot;
}
