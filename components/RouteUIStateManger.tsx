"use client";
import { useUIState } from "src/useUIState";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const routeOpenPages = new Map<string, string[]>();
let previousPathname = null as null | string;
export const RouteUIStateManager = () => {
  const pathname = usePathname();
  useEffect(() => {
    routeOpenPages.set(
      previousPathname || pathname,
      useUIState.getState().openPages,
    );
    previousPathname = pathname;

    // Restore open pages for new route if we have them
    const savedOpenPages = routeOpenPages.get(pathname) || [];

    useUIState.setState({
      focusedEntity: null,
      selectedBlocks: [],
      foldedBlocks: [],
      openPages: savedOpenPages,
      lastUsedHighlight: "1",
    });
  }, [pathname]);

  return null;
};
