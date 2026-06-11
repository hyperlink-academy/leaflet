"use client";
import { useSearchParams } from "next/navigation";
import { useIsMobile } from "src/hooks/isMobile";
import { InteractionState, useInteractionState } from "./Interactions";

// The open drawer only sits inline next to the page on desktop; on mobile it
// overlays the page as a bottom sheet. Layout that makes room for the drawer
// (spacers, corner rounding, side columns) should key off this rather than
// useDrawerOpen so the page doesn't shift behind the sheet.
export const useInlineDrawer = (uri: string) => {
  let drawer = useDrawerOpen(uri);
  let isMobile = useIsMobile();
  return isMobile ? null : drawer;
};

export const useDrawerOpen = (uri: string) => {
  let params = useSearchParams();
  let interactionDrawerSearchParam = params.get("interactionDrawer");
  let pageParam = params.get("page");
  let { drawerOpen: open, drawer, pageId } = useInteractionState(uri);
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  drawer =
    drawer || (interactionDrawerSearchParam as InteractionState["drawer"]);
  // Use pageId from state, or fall back to page search param
  const resolvedPageId = pageId ?? pageParam ?? undefined;
  return { drawer, pageId: resolvedPageId };
};
