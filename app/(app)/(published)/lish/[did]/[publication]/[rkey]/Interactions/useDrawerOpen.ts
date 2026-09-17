"use client";
import { useClientSearchParams } from "src/hooks/useClientSearchParams";
import { useIsMobile } from "src/hooks/isMobile";
import { useInteractionState } from "./Interactions";
import { parseDrawerParam } from "./drawerParam";
import { usePostFrame } from "../postFrame";

export const useInlineDrawer = (uri: string) => {
  let drawer = useDrawerOpen(uri);
  let isMobile = useIsMobile();
  return isMobile ? null : drawer;
};

export const useDrawerOpen = (uri: string) => {
  let params = useClientSearchParams();
  let interactionDrawerSearchParam = params.get("interactionDrawer");
  let pageParam = params.get("page");
  let {
    drawerOpen: open,
    drawer,
    pageId,
    threadStack,
  } = useInteractionState(uri);
  // Interaction state outlives the surface that set it; a frame with no drawer
  // must not make room for one a published page left open.
  if (usePostFrame().layout === "single") return null;
  if (open === false || (open === undefined && !interactionDrawerSearchParam))
    return null;
  let param = parseDrawerParam(interactionDrawerSearchParam, uri);
  drawer = drawer || param.tab;
  const thread = threadStack[threadStack.length - 1] ?? param.thread;
  // Use pageId from state, or fall back to page search param
  const resolvedPageId = pageId ?? pageParam ?? undefined;
  return { drawer, thread, pageId: resolvedPageId };
};
