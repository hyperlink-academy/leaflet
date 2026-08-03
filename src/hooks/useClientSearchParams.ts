"use client";
import { useMemo, useSyncExternalStore } from "react";

/**
 * The query string, read from `window.location` instead of the router.
 *
 * Published pages are prerendered without a request URL, so a render-time
 * read of the query string (`useSearchParams()`) either pulls the whole
 * subtree out of the static HTML — it renders on the client under the nearest
 * Suspense boundary — or 500s when there is no boundary. This returns no
 * params during SSR and hydration, and the real ones in a re-render right
 * after mount.
 *
 * Writers of the params we read this way (the interaction drawer, the
 * members-only paywall) call `history.replaceState` directly, so the store
 * observes the history methods as well as popstate.
 */
export const useClientSearchParams = () => {
  let search = useSyncExternalStore(subscribe, getSearch, getServerSearch);
  return useMemo(() => new URLSearchParams(search), [search]);
};

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

let observing = false;
const observe = () => {
  if (observing) return;
  observing = true;
  window.addEventListener("popstate", emit);
  patch("pushState");
  patch("replaceState");
};

const patch = (method: "pushState" | "replaceState") => {
  let original = window.history[method].bind(window.history);
  window.history[method] = (
    ...args: Parameters<History["replaceState"]>
  ): void => {
    original(...args);
    emit();
  };
};

const subscribe = (listener: () => void) => {
  observe();
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSearch = () => window.location.search;
const getServerSearch = () => "";
