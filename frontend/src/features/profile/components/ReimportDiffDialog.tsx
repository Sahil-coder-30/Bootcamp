import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { decisionFor, describePath, summarizeDiff, summarizeValue } from "../lib/diff";
import type { DiffDecision, DiffEntry } from "../lib/types";

interface Props {
  /** The backend's merge diff; null keeps the dialog closed. */
  diff: DiffEntry[] | null;
  onApply: (decisions: Record<string, DiffDecision>) => void;
  onCancel: () => void;
}

const KIND_LABEL: Record<DiffEntry["kind"], string> = {
  add: "New",
  update: "Updated",
  conflict: "Conflict",
  info: "For your information",
};

const OPTIONS: Record<DiffEntry["kind"], [DiffDecision, string][]> = {
  add: [
    ["accept", "Add it"],
    ["keep", "Skip it"],
  ],
  update: [
    ["accept", "Use the resume"],
    ["keep", "Keep mine"],
  ],
  conflict: [
    ["keep", "Keep mine"],
    ["accept", "Use the resume"],
  ],
  info: [
    ["keep", "Keep my level"],
    ["accept", "Use the resume's"],
  ],
};

/** Re-importing a CV into a saved profile: review what would change. Merge, never overwrite. */
export function ReimportDiffDialog({ diff, onApply, onCancel }: Props) {
  const [decisions, setDecisions] = useState<Record<string, DiffDecision>>({});
  useEffect(() => setDecisions({}), [diff]);
  const entries = diff ?? [];

  return (
    <Dialog open={diff !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update from your new CV</DialogTitle>
          <DialogDescription data-testid="diff-summary">{summarizeDiff(entries)}</DialogDescription>
        </DialogHeader>

        {entries.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
            This CV matches your profile. Nothing to update.
          </p>
        ) : (
          <ul className="space-y-2" aria-label="Changes">
            {entries.map((e) => {
              const decision = decisionFor(e, decisions);
              return (
                <li
                  key={e.path}
                  className="space-y-2 rounded-lg border border-border bg-card/50 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      <span className="mr-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {KIND_LABEL[e.kind]}
                      </span>
                      {describePath(e.path)}
                    </p>
                    <div
                      role="radiogroup"
                      aria-label={`Decision for ${describePath(e.path)}`}
                      className="flex gap-1"
                    >
                      {OPTIONS[e.kind].map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={decision === value}
                          onClick={() => setDecisions((d) => ({ ...d, [e.path]: value }))}
                          className={cn(
                            "cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            decision === value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border text-muted-foreground hover:bg-accent",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.reason}</p>
                  {e.kind !== "add" && (
                    <p className="text-xs">
                      <span className="text-muted-foreground">Yours:</span>{" "}
                      {summarizeValue(e.current)}
                      <span className="mx-2 text-muted-foreground">Resume:</span>{" "}
                      {summarizeValue(e.incoming)}
                    </p>
                  )}
                  {e.kind === "add" && <p className="text-xs">{summarizeValue(e.incoming)}</p>}
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            {entries.length === 0 ? "Close" : "Cancel"}
          </Button>
          {entries.length > 0 && (
            <Button type="button" onClick={() => onApply(decisions)}>
              Apply to my profile
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
