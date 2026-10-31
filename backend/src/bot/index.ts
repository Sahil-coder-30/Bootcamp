// Starts and stops the Telegram bot inside the backend process.
//
//  - Default: long polling. The backend asks Telegram for new messages, so it needs no public URL
//    and works on a laptop. This is what you want while developing and for a demo.
//  - Webhook: set TELEGRAM_WEBHOOK_URL (public HTTPS) and TELEGRAM_WEBHOOK_SECRET. Telegram then
//    calls POST /telegram/webhook (mounted in app.ts), so the bot costs nothing while idle.
//
// With no TELEGRAM_BOT_TOKEN the bot is simply off and the rest of the backend is unaffected.
import { GrammyError, webhookCallback, type Bot } from "grammy";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";
import { computeCompleteness } from "../lib/profileCompleteness.js";
import { listCompanies } from "../services/companies.service.js";
import { profilesService } from "../services/profiles.service.js";
import { runTalentCheck } from "../services/talentCheck.service.js";
import { createBot, type BotDeps } from "./bot.js";
import { COMMANDS } from "./format.js";
import { getLinkStore, type LinkStore } from "./linkStore.js";

let running: Bot | null = null;
let username: string | undefined;
let webhookHandler: RequestHandler | null = null;
let store: LinkStore | null = null;

/** One shared store, so the link-code route and the bot see the same codes. */
export const getTelegramLinkStore = (): LinkStore => (store ??= getLinkStore());

/** The bot's @username (for the deep link), once it is running or configured. */
export const botUsername = (): string | undefined => env.telegramBotUsername ?? username;

/** Express handler for Telegram's webhook calls; passes through when webhook mode is off. */
export const telegramWebhook: RequestHandler = (req, res, next) =>
  webhookHandler ? webhookHandler(req, res, next) : next();

/** Never print the token, even if a library error message happens to contain it. */
const redact = (err: unknown, token: string): string =>
  (err instanceof Error ? err.message : String(err)).split(token).join("<token>");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function realDeps(linkStore: LinkStore): BotDeps {
  return {
    store: linkStore,
    listCompanies,
    async getProfile(id) {
      const p = await profilesService.get(id);
      return {
        name: p.name,
        completeness: computeCompleteness(p).score,
        levels: Object.fromEntries(Object.entries(p.skill_levels).map(([code, l]) => [code, l.level])),
      };
    },
    runTalentCheck: (params) => runTalentCheck(params),
  };
}

async function poll(bot: Bot, token: string) {
  for (let attempt = 0; running === bot; attempt++) {
    try {
      await bot.start({ onStart: (me) => console.log(`[telegram] @${me.username} is listening (long polling)`) });
      return; // stopped on purpose
    } catch (err) {
      if (err instanceof GrammyError && err.error_code === 401) {
        console.error("[telegram] Telegram rejected the bot token. Check TELEGRAM_BOT_TOKEN.");
        return;
      }
      const conflict = err instanceof GrammyError && err.error_code === 409;
      console.error(
        conflict
          ? "[telegram] another process is polling with this bot token (409). Retrying..."
          : `[telegram] polling stopped: ${redact(err, token)}. Retrying...`,
      );
      await sleep(Math.min(30_000, 3_000 * (attempt + 1)));
    }
  }
}

export async function startTelegramBot(): Promise<void> {
  const token = env.telegramBotToken;
  if (env.telegramBot === "off" || !token) {
    console.log("[telegram] bot is off (set TELEGRAM_BOT_TOKEN in backend/.env to turn it on)");
    return;
  }

  const bot = createBot(token, realDeps(getTelegramLinkStore()));
  try {
    await bot.init(); // validates the token and fetches the bot's @username
  } catch (err) {
    console.error(`[telegram] could not reach Telegram: ${redact(err, token)}. Check the token and your internet.`);
    return;
  }
  running = bot;
  username = bot.botInfo.username;
  await bot.api.setMyCommands(COMMANDS).catch((err) => console.warn("[telegram] could not set commands:", redact(err, token)));

  if (env.telegramWebhookUrl) {
    const secret = env.telegramWebhookSecret;
    if (!secret) {
      console.error("[telegram] TELEGRAM_WEBHOOK_URL needs TELEGRAM_WEBHOOK_SECRET too. Bot not started.");
      running = null;
      return;
    }
    webhookHandler = webhookCallback(bot, "express", { secretToken: secret });
    try {
      await bot.api.setWebhook(`${env.telegramWebhookUrl}/telegram/webhook`, { secret_token: secret });
      console.log(`[telegram] @${username} is listening (webhook ${env.telegramWebhookUrl}/telegram/webhook)`);
    } catch (err) {
      console.error(`[telegram] could not set the webhook: ${redact(err, token)}`);
      webhookHandler = null;
      running = null;
    }
    return;
  }

  // Polling and a webhook cannot both be active: clear any webhook left from an earlier run.
  await bot.api.deleteWebhook().catch(() => undefined);
  void poll(bot, token);
}

export async function stopTelegramBot(): Promise<void> {
  const bot = running;
  running = null;
  webhookHandler = null;
  if (bot) await bot.stop().catch(() => undefined);
}
