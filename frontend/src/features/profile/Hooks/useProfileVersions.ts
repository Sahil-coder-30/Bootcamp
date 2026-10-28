import { useCallback, useEffect, useState } from "react";
import { toErrorMessage } from "@/services/apiClient";
import type { ProfileVersion } from "../lib/types";
import { getProfileVersionsAPI } from "../service/profile.api";

/** Version history of one profile; loads when `open` turns true (the drawer). */
export function useProfileVersions(id: string | undefined, open: boolean) {
  const [items, setItems] = useState<ProfileVersion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setItems(await getProfileVersionsAPI(id));
    } catch (err) {
      setError(toErrorMessage(err, "Could not load the history."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  return { items, loading, error, refetch: load };
}
