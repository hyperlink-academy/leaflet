"use client";
import { useCallback, useEffect, useRef, useState } from "react";

// React state mirrored to localStorage so it survives a page reload, scoped by
// `key`. The persisted value is read after mount (localStorage is client-only,
// so the first render uses `defaultValue` to avoid an SSR hydration mismatch).
// A null key keeps the state purely in memory. `clear` removes the entry and
// resets to the default.
export function useLocalStorageState<T>(
  key: string | null,
  defaultValue: T,
): readonly [T, (next: T | ((prev: T) => T)) => void, () => void] {
  let defaultRef = useRef(defaultValue);
  let [value, setValue] = useState<T>(defaultValue);
  let keyRef = useRef(key);
  keyRef.current = key;

  useEffect(() => {
    if (!key) {
      setValue(defaultRef.current);
      return;
    }
    try {
      let raw = window.localStorage.getItem(key);
      setValue(raw !== null ? (JSON.parse(raw) as T) : defaultRef.current);
    } catch {
      setValue(defaultRef.current);
    }
  }, [key]);

  let set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      let resolved =
        typeof next === "function" ? (next as (p: T) => T)(prev) : next;
      let k = keyRef.current;
      if (k) {
        try {
          window.localStorage.setItem(k, JSON.stringify(resolved));
        } catch {}
      }
      return resolved;
    });
  }, []);

  let clear = useCallback(() => {
    let k = keyRef.current;
    if (k) {
      try {
        window.localStorage.removeItem(k);
      } catch {}
    }
    setValue(defaultRef.current);
  }, []);

  return [value, set, clear] as const;
}
