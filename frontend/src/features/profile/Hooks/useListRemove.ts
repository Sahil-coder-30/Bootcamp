import { useCallback } from "react";
import { useAppDispatch } from "@/store";
import { removeProvenanceItem } from "../slice/profile.slice";

/**
 * Wraps a `useFieldArray().remove` so the "from resume" chips of the later items keep pointing
 * at the right rows after one is removed.
 */
export function useListRemove(list: string, remove: (index: number) => void) {
  const dispatch = useAppDispatch();
  return useCallback(
    (index: number) => {
      remove(index);
      dispatch(removeProvenanceItem({ list, index }));
    },
    [dispatch, list, remove],
  );
}
