import { useCallback, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { toErrorMessage } from "@/services/apiClient";
import { listProfilesAPI } from "../service/profile.api";
import { appendList, setList, setListError, setListLoading } from "../slice/profile.slice";

/** Paginated, searchable list of saved profiles (keyset cursor from the server). */
export function useProfiles({ q = "", limit = 20 }: { q?: string; limit?: number } = {}) {
  const dispatch = useAppDispatch();
  const list = useAppSelector((s) => s.profile.list);
  const attempted = useRef<string | null>(null);

  const load = useCallback(
    async (query: string) => {
      dispatch(setListError(null));
      dispatch(setListLoading(true));
      try {
        const data = await listProfilesAPI({ q: query, limit });
        dispatch(setList({ items: data.items, nextCursor: data.next_cursor, query }));
      } catch (err) {
        dispatch(setListError(toErrorMessage(err, "Unable to load profiles.")));
      } finally {
        dispatch(setListLoading(false));
      }
    },
    [dispatch, limit],
  );

  useEffect(() => {
    // One attempt per query: a failed request does not loop; reuse the cached list for the same query.
    if (attempted.current === q) return;
    attempted.current = q;
    if (!(list.loaded && list.query === q)) void load(q);
  }, [q, list.loaded, list.query, load]);

  const loadMore = useCallback(async () => {
    if (!list.nextCursor || list.loading) return;
    dispatch(setListLoading(true));
    try {
      const data = await listProfilesAPI({ q: list.query, limit, cursor: list.nextCursor });
      dispatch(appendList({ items: data.items, nextCursor: data.next_cursor }));
    } catch (err) {
      dispatch(setListError(toErrorMessage(err, "Unable to load more profiles.")));
    } finally {
      dispatch(setListLoading(false));
    }
  }, [dispatch, limit, list.loading, list.nextCursor, list.query]);

  return {
    items: list.items,
    loadMore,
    hasMore: list.nextCursor !== null,
    loading: list.loading,
    error: list.error,
    refetch: () => load(q),
  };
}
