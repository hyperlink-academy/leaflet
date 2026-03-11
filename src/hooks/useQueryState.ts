import { useCallback, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

/**
 * Syncs React state to URL query parameters so filter selections persist
 * across page refreshes and are shareable via URL.
 *
 * Uses `window.history.replaceState` for synchronous URL updates (no
 * Next.js router transition overhead). Next.js 14+ automatically syncs
 * its hooks (`useSearchParams`, etc.) when the history API is called.
 *
 * Each parameter is defined by a `QueryParam<T>` config that controls how
 * a value of type `T` is serialized to/from one or more query string keys.
 *
 * @example
 *   // Simple string param (?metric=pageviews, default "visitors")
 *   let [metric, setMetric] = useQueryState<"visitors" | "pageviews">({
 *     toParams: (v) => ({ metric: v === "visitors" ? null : v }),
 *     fromParams: (get) => get("metric") === "pageviews" ? "pageviews" : "visitors",
 *   });
 *
 *   // Optional value with multi-key serialization (?post=my-slug)
 *   let [postPath, setPostPath] = useQueryState<string | undefined>({
 *     fromParams: (get) => get("post") ?? undefined,
 *     toParams: (v) => ({ post: v ?? null }),
 *   });
 */

/** Configuration for a single piece of query-synced state. */
export type QueryParam<T> = {
  /**
   * Deserialize from query params → state value.
   * Called once on mount to initialize from the URL.
   * Should return the default value when no relevant params are present.
   * @param get - reads a single query param by key (returns `string | null`)
   */
  fromParams: (get: (key: string) => string | null) => T;

  /**
   * Serialize state value → query param updates.
   * Return a record of key → string (to set) or key → null (to remove).
   * Keys set to `null` are deleted from the URL, keeping it clean for defaults.
   */
  toParams: (value: T) => Record<string, string | null>;
};

/**
 * Like `useState`, but the value is initialized from URL query params on mount
 * and the URL is updated synchronously via `history.replaceState` whenever
 * the setter is called.
 *
 * Returns `[value, setValue]` — a drop-in replacement for `useState`.
 */
export function useQueryState<T>(
  config: QueryParam<T>,
): [T, (value: T) => void] {
  let searchParams = useSearchParams();

  // Use a ref for toParams so the setter callback identity is stable
  // even when config is an inline object literal.
  let toParamsRef = useRef(config.toParams);
  toParamsRef.current = config.toParams;

  let [value, _setValue] = useState<T>(() =>
    config.fromParams((key) => searchParams.get(key)),
  );

  let setValue = useCallback((next: T) => {
    _setValue(next);
    let updates = toParamsRef.current(next);
    // Read directly from window.location so we always merge against
    // the latest URL, even if multiple setters fire in the same frame.
    let params = new URLSearchParams(window.location.search);
    for (let [key, v] of Object.entries(updates)) {
      if (v === null) {
        params.delete(key);
      } else {
        params.set(key, v);
      }
    }
    let qs = params.toString();
    let url = qs
      ? `${window.location.pathname}?${qs}`
      : window.location.pathname;
    window.history.replaceState(history.state, "", url);
  }, []);

  return [value, setValue];
}
