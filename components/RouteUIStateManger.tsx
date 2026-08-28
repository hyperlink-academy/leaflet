"use client";
import {
  hasFoldPersister,
  useUIState,
  type EditorOpenPage,
} from "src/useUIState";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const routeOpenPages = new Map<string, EditorOpenPage[]>();
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
      openPages: savedOpenPages,
      lastUsedHighlight: "1",
      // While a fold persister is registered, the new route's
      // CollapsedBlocksSync owns foldedBlocks: it mounts earlier in the tree,
      // so by the time this effect runs it has already seeded the store from
      // the signed-in user's saved fact, and clearing here would wipe that.
      // With nothing registered (signed out, read-only, non-doc route) folds
      // are ephemeral and reset like the rest of the UI state.
      ...(hasFoldPersister() ? {} : { foldedBlocks: [] }),
    });
  }, [pathname]);

  return null;
};
