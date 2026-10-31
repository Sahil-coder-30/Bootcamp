import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTelegramLink } from "../Hooks/useTelegramLink";

/** Header button on a saved profile. Renders nothing unless the Telegram bot is running. */
export function ConnectTelegramButton({ profileId }: { profileId: string | undefined }) {
  const { enabled, connecting, connect } = useTelegramLink(profileId);
  if (!profileId || !enabled) return null;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={connecting}
      onClick={() => void connect()}
    >
      <Send aria-hidden /> {connecting ? "Opening..." : "Connect Telegram"}
    </Button>
  );
}
