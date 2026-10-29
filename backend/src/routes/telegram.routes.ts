import { Router } from "express";
import { z } from "zod";
import { botUsername, getTelegramLinkStore } from "../bot/index.js";
import { HttpError } from "../middlewares/errorHandler.js";
import { parseOrThrow } from "../middlewares/validate.js";
import { profilesService } from "../services/profiles.service.js";

const router = Router();

const linkCodeBody = z.object({ profile_id: z.string().min(1, "profile_id is required") });

// Is the bot on? The web app uses this to show or hide its "Connect Telegram" button.
router.get("/status", (_req, res) => {
  const username = botUsername();
  res.json({ enabled: Boolean(username), username: username ?? null });
});

// A one-time code (and ready-made t.me link) that connects a Telegram chat to this profile.
router.post("/link-code", async (req, res) => {
  const { profile_id } = parseOrThrow(linkCodeBody, req.body);
  await profilesService.get(profile_id); // 404 when the profile does not exist
  const username = botUsername();
  if (!username) {
    throw new HttpError(503, "The Telegram bot is not running. Set TELEGRAM_BOT_TOKEN in backend/.env and restart the backend.");
  }
  const { code, expiresAt } = await getTelegramLinkStore().createCode(profile_id);
  res.status(201).json({
    code,
    url: `https://t.me/${username}?start=${code}`,
    expires_at: expiresAt.toISOString(),
  });
});

export default router;
