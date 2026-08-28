"use client";
import {
  foldStateIsSynced,
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
      // While fold state is synced, the new route's CollapsedBlocksSync owns
      // foldedBlocks as a mirror of the signed-in user's saved fact: it
      // mounts earlier in the tree, so by the time this effect runs it has
      // already seeded the store, and clearing here would desync the mirror
      // (its inbound effect only re-applies when the fact changes). With
      // nothing registered (signed out, read-only, non-doc route) folds are
      // ephemeral and reset like the rest of the UI state.
      ...(foldStateIsSynced() ? {} : { foldedBlocks: [] }),
    });
  }, [pathname]);

  return null;
};
