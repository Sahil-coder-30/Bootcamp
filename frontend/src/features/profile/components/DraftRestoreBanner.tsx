import { Button } from "@/components/ui/button";

interface Props {
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

const timeOf = (iso: string) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "earlier"
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

/** Shown after a reload when an unsaved draft was autosaved to this browser. */
export function DraftRestoreBanner({ savedAt, onRestore, onDiscard }: Props) {
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/40 bg-sky-500/10 p-3 text-sm"
    >
      <p>Restore unsaved changes from {timeOf(savedAt)}?</p>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={onRestore}>
          Restore
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  );
}
