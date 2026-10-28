import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useProfileVersions } from "../Hooks/useProfileVersions";
import { levelChanges } from "../lib/diff";

interface Props {
  profileId: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SOURCE_LABEL: Record<string, string> = {
  form: "edited in the form",
  resume_import: "updated from a CV",
  json_import: "loaded from JSON",
  seed: "sample data",
  calibration: "calibrated",
};

/** Every saved version, with what changed in the 12 skill levels since the one before it. */
export function VersionHistoryDrawer({ profileId, open, onOpenChange }: Props) {
  const { items, loading, error } = useProfileVersions(profileId, open);

  const rows = useMemo(
    () =>
      items.map((v, i) => {
        const older = items[i + 1];
        return { v, changes: older ? levelChanges(older.profile, v.profile) : [] };
      }),
    [items],
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Version history</SheetTitle>
          <SheetDescription>
            Each Talent Check remembers the version it used, so an old score can always be
            explained.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {!loading && !error && rows.length === 0 && (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          )}
          <ol className="space-y-3" aria-label="Versions">
            {rows.map(({ v, changes }, i) => (
              <li
                key={v.version}
                className="space-y-1.5 rounded-lg border border-border bg-card/50 p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    v{v.version}
                    {i === 0 && (
                      <Badge variant="success" className="ml-2">
                        current
                      </Badge>
                    )}
                  </p>
                  <time className="text-xs text-muted-foreground" dateTime={v.created_at}>
                    {new Date(v.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </time>
                </div>
                <p className="text-xs text-muted-foreground">
                  {SOURCE_LABEL[v.change_source] ?? v.change_source}
                </p>
                {changes.length > 0 && (
                  <ul className="flex flex-wrap gap-1.5">
                    {changes.map((c) => (
                      <li
                        key={c.code}
                        className="rounded-md border border-border px-2 py-0.5 text-xs"
                      >
                        {c.code} {c.from} to {c.to}
                        {c.fromSource !== c.toSource && ` (${c.toSource.replace("_", " ")})`}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </div>
      </SheetContent>
    </Sheet>
  );
}
