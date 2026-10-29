import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { toErrorMessage } from "@/services/apiClient";
import { createTelegramLinkAPI, getTelegramStatusAPI } from "../service/profile.api";

/**
 * "Connect Telegram": asks the backend for a one-time code and opens the bot with it, which links
 * that Telegram chat to this profile. `enabled` is false when the bot is not running (or the
 * backend is too old to know about it), so the page simply hides the button.
 */
export function useTelegramLink(profileId: string | undefined) {
  const [enabled, setEnabled] = useState(false);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    if (!profileId) return;
    let cancelled = false;
    getTelegramStatusAPI()
      .then((status) => !cancelled && setEnabled(status.enabled))
      .catch(() => !cancelled && setEnabled(false));
    return () => {
      cancelled = true;
    };
  }, [profileId]);

  const connect = useCallback(async () => {
    if (!profileId) return null;
    setConnecting(true);
    try {
      const link = await createTelegramLinkAPI(profileId);
      // noopener: the Telegram page must not get a handle on this one.
      window.open(link.url, "_blank", "noopener,noreferrer");
      toast.success(
        "Opening Telegram. Press Start there to finish connecting (the link works for 10 minutes).",
      );
      return link;
    } catch (err) {
      toast.error(toErrorMessage(err, "Could not create a Telegram link."));
      return null;
    } finally {
      setConnecting(false);
    }
  }, [profileId]);

  return { enabled, connecting, connect };
}
