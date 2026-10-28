import { useCallback, useEffect, useRef, useState } from "react";
import { useFormState, type UseFormReturn } from "react-hook-form";
import type { ProfileValues } from "../lib/types";

export const DRAFT_PREFIX = "profile-draft:";
const DEBOUNCE_MS = 800;

interface SavedDraft {
  savedAt: string;
  values: ProfileValues;
}

// localStorage can be missing, full or blocked (private window); the form must work without it.
function read(key: string): SavedDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedDraft>;
    return parsed && typeof parsed.savedAt === "string" && parsed.values
      ? (parsed as SavedDraft)
      : null;
  } catch {
    return null;
  }
}

const write = (key: string, draft: SavedDraft) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // ignore: autosave is a convenience
  }
};

const remove = (key: string) => {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
};

/**
 * Autosaves the form to localStorage (debounced) once it has unsaved edits, and offers to
 * restore them after a reload or a crashed tab. Clear it after a successful save.
 */
export function useProfileDraft(form: UseFormReturn<ProfileValues>, key: string) {
  const storageKey = DRAFT_PREFIX + key;
  const [restorable, setRestorable] = useState<{ savedAt: string } | null>(() => {
    const d = read(storageKey);
    return d ? { savedAt: d.savedAt } : null;
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Subscribe here: react-hook-form only tracks `isDirty` for components that read it while rendering.
  const { isDirty } = useFormState({ control: form.control });
  const dirty = useRef(isDirty);
  dirty.current = isDirty;
  const suspended = useRef(restorable !== null);

  useEffect(() => {
    const sub = form.watch((values) => {
      // Do not overwrite an unrestored draft with the pristine form.
      if (suspended.current) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (!dirty.current) return;
        write(storageKey, { savedAt: new Date().toISOString(), values: values as ProfileValues });
      }, DEBOUNCE_MS);
    });
    return () => {
      sub.unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [form, storageKey]);

  const restore = useCallback(() => {
    const d = read(storageKey);
    if (d) form.reset(d.values, { keepDefaultValues: true });
    suspended.current = false;
    setRestorable(null);
  }, [form, storageKey]);

  const clear = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    remove(storageKey);
    suspended.current = false;
    setRestorable(null);
  }, [storageKey]);

  return { restorable, restore, discard: clear, clear };
}
