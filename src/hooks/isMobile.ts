"use client";
import { useState, useEffect, useSyncExternalStore } from "react";

// Every block and home card calls this while hydrating, and reading
// innerWidth there forces a layout on mobile viewports, so all callers share
// one MediaQueryList. The server snapshot is "mobile"; hydration takes the
// client's value directly so blocks don't render twice.
let mobileQuery: MediaQueryList | null = null;
const getMobileQuery = () => (mobileQuery ??= matchMedia("(max-width: 639px)"));
const subscribe = (onChange: () => void) => {
  getMobileQuery().addEventListener("change", onChange);
  return () => getMobileQuery().removeEventListener("change", onChange);
};
const getIsMobile = () =>
  typeof window === "undefined" || getMobileQuery().matches;

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getIsMobile, getIsMobile);
}

export function useIsInitialRender() {
  let [state, setState] = useState(true);
  useEffect(() => setState(false), []);
  return state;
}
