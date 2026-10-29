import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { CATEGORY_COLORS, CATEGORY_NAMES, CODES } from "@/lib/categories";
import { useProfiles } from "../Hooks/useProfiles";
import type { ProfileSummary } from "../lib/types";

/** 12 small bars, one per category, taller = higher level. */
function LevelBars({ levels }: { levels: ProfileSummary["levels"] }) {
  return (
    <div className="flex h-8 items-end gap-0.5" role="img" aria-label="Skill levels">
      {CODES.map((c) => (
        <span
          key={c}
          title={`${CATEGORY_NAMES[c]}: ${levels[c]}`}
          className="w-1.5 rounded-sm"
          style={{ height: `${(levels[c] / 10) * 100}%`, backgroundColor: CATEGORY_COLORS[c] }}
        />
      ))}
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Saved profiles: search, open, create, and delete ("delete my data"). */
export default function ProfilesListPage() {
  const [search, setSearch] = useState("");
  const q = useDebounced(search.trim(), 300);
  const { items, loading, error, hasMore, loadMore, refetch, deleteProfile } = useProfiles({ q });
  const [toDelete, setToDelete] = useState<ProfileSummary | null>(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteProfile(toDelete.id);
      toast.success("Profile deleted");
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete the profile.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 overflow-x-hidden space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-heading text-xl font-semibold">Candidate profiles</h2>
          <p className="text-sm text-muted-foreground">
            Build a profile once, then use it for Talent Check and Skill Matching.
          </p>
        </div>
        <Button asChild>
          <Link to="/profile/new">
            <Plus aria-hidden /> New profile
          </Link>
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search by name"
          aria-label="Search profiles"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-destructive/40 p-4 text-sm"
        >
          <p>{error}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      )}

      {loading && items.length === 0 && (
        <div className="grid gap-3 sm:grid-cols-2" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {q ? `No profiles match "${q}".` : "No profiles yet. Create the first one."}
        </p>
      )}

      <ul className="grid gap-3 sm:grid-cols-2" aria-label="Profiles">
        {items.map((p) => (
          <li
            key={p.id}
            className="space-y-3 rounded-xl border border-border bg-card/50 p-4"
            data-testid={`profile-${p.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to="/profile/$profileId"
                  params={{ profileId: p.id }}
                  className="block truncate font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {p.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">{p.email}</p>
                {p.preferred_roles.length > 0 && (
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {p.preferred_roles.join(", ")}
                  </p>
                )}
              </div>
              <LevelBars levels={p.levels} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2">
                <div
                  role="progressbar"
                  aria-label={`Completeness of ${p.name}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={p.completeness}
                  className="h-1.5 flex-1 overflow-hidden rounded-full bg-secondary"
                >
                  <div className="h-full bg-primary" style={{ width: `${p.completeness}%` }} />
                </div>
                <span className="font-mono text-xs text-muted-foreground">{p.completeness}%</span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hover:text-destructive"
                aria-label={`Delete ${p.name}`}
                onClick={() => setToDelete(p)}
              >
                <Trash2 aria-hidden />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={() => void loadMore()}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}

      <Dialog open={toDelete !== null} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete {toDelete?.name}?</DialogTitle>
            <DialogDescription>
              This removes the profile, its version history and the stored CV. It cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setToDelete(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void confirmDelete()}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete profile"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
