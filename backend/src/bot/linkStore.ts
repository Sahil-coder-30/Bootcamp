// Which Telegram chat belongs to which profile. A chat is linked with a one-time code that the web
// app (or POST /api/telegram/link-code) creates for a profile, so nobody can claim a profile they
// do not control by typing its email. Supabase when configured, otherwise in memory.
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { supabase } from "../services/supabase.service.js";

export const CODE_TTL_MS = 10 * 60 * 1000;

export interface LinkCode {
  code: string;
  expiresAt: Date;
}

export interface LinkStore {
  /** A fresh single-use code for this profile; valid for 10 minutes. */
  createCode(profileId: string): Promise<LinkCode>;
  /** Consumes the code and links the chat. Returns the profile id, or null if the code is unknown, used or expired. */
  redeem(code: string, chatId: number): Promise<string | null>;
  getProfileId(chatId: number): Promise<string | null>;
  /** True when a link existed and was removed. */
  unlink(chatId: number): Promise<boolean>;
}

/** 12 URL-safe characters: fits Telegram's /start payload (A-Z a-z 0-9 _ -, up to 64). */
export const newCode = (): string => randomBytes(9).toString("base64url");

export function createMemoryLinkStore(now: () => number = Date.now): LinkStore {
  const codes = new Map<string, { profileId: string; expiresAt: number }>();
  const links = new Map<number, string>();

  return {
    async createCode(profileId) {
      const code = newCode();
      const expiresAt = now() + CODE_TTL_MS;
      codes.set(code, { profileId, expiresAt });
      return { code, expiresAt: new Date(expiresAt) };
    },
    async redeem(code, chatId) {
      const entry = codes.get(code);
      if (!entry) return null;
      codes.delete(code); // single use, even when expired
      if (entry.expiresAt <= now()) return null;
      links.set(chatId, entry.profileId);
      return entry.profileId;
    },
    async getProfileId(chatId) {
      return links.get(chatId) ?? null;
    },
    async unlink(chatId) {
      return links.delete(chatId);
    },
  };
}

export function createSupabaseLinkStore(): LinkStore {
  const db = () => {
    if (!supabase) throw new Error("Supabase is not configured");
    return supabase;
  };

  return {
    async createCode(profileId) {
      const code = newCode();
      const expiresAt = new Date(Date.now() + CODE_TTL_MS);
      const { error } = await db()
        .from("telegram_link_codes")
        .insert({ code, profile_id: profileId, expires_at: expiresAt.toISOString() });
      if (error) throw error;
      return { code, expiresAt };
    },

    async redeem(code, chatId) {
      // Delete-and-return is atomic: two chats cannot redeem the same code.
      const { data, error } = await db()
        .from("telegram_link_codes")
        .delete()
        .eq("code", code)
        .gt("expires_at", new Date().toISOString())
        .select("profile_id")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const profileId = String(data["profile_id"]);
      const { error: linkError } = await db()
        .from("telegram_links")
        .upsert({ chat_id: chatId, profile_id: profileId }, { onConflict: "chat_id" });
      if (linkError) throw linkError;
      return profileId;
    },

    async getProfileId(chatId) {
      const { data, error } = await db()
        .from("telegram_links")
        .select("profile_id")
        .eq("chat_id", chatId)
        .maybeSingle();
      if (error) throw error;
      return data ? String(data["profile_id"]) : null;
    },

    async unlink(chatId) {
      const { data, error } = await db().from("telegram_links").delete().eq("chat_id", chatId).select("chat_id");
      if (error) throw error;
      return (data ?? []).length > 0;
    },
  };
}

export const getLinkStore = (): LinkStore =>
  supabase && env.telegramStore !== "memory" ? createSupabaseLinkStore() : createMemoryLinkStore();
