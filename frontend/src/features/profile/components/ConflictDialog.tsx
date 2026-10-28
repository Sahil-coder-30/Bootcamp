import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { fromFormValues } from "../lib/formMapping";
import type { ProfileValues, StoredProfile } from "../lib/types";
import type { Conflict } from "../slice/profile.slice";

interface Props {
  conflict: Conflict | null;
  /** What the candidate has in the form right now. */
  local: ProfileValues;
  /** The version the candidate started from. */
  yourVersion: number | null;
  saving: boolean;
  onMine: () => void;
  onTheirs: () => void;
}

const SERVER_KEYS = new Set(["id", "version", "updated_at"]);

/** Top-level fields that differ between the server's copy and the candidate's. */
export function changedFields(server: StoredProfile, local: ProfileValues): string[] {
  const mine = fromFormValues(local) as unknown as Record<string, unknown>;
  const theirs = server as unknown as Record<string, unknown>;
  return [...new Set([...Object.keys(mine), ...Object.keys(theirs)])]
    .filter((k) => !SERVER_KEYS.has(k))
    .filter((k) => JSON.stringify(mine[k] ?? null) !== JSON.stringify(theirs[k] ?? null))
    .sort();
}

/** Shown on a 412: someone saved a newer version while the candidate was editing. */
export function ConflictDialog({ conflict, local, yourVersion, saving, onMine, onTheirs }: Props) {
  const fields = conflict ? changedFields(conflict.server, local) : [];

  return (
    <Dialog open={conflict !== null}>
      <DialogContent className="max-w-lg" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>This profile changed while you were editing</DialogTitle>
          <DialogDescription>
            Someone saved v{conflict?.version} while you edited v{yourVersion}. Choose which version
            to keep.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5 text-sm">
          <p className="font-medium">Fields that differ</p>
          {fields.length === 0 ? (
            <p className="text-muted-foreground">
              Nothing visible differs; the other save only touched details.
            </p>
          ) : (
            <ul className="flex flex-wrap gap-1.5" data-testid="conflict-fields">
              {fields.map((f) => (
                <li
                  key={f}
                  className="rounded-md border border-border bg-card/50 px-2 py-0.5 text-xs"
                >
                  {f.replace(/_/g, " ")}
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onTheirs} disabled={saving}>
            Load theirs
          </Button>
          <Button type="button" onClick={onMine} disabled={saving}>
            Keep mine
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
