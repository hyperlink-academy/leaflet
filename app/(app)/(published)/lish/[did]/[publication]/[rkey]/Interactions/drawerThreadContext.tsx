"use client";
import { createContext, useContext, useMemo } from "react";
import type { OpenPage } from "../postPageState";
import { usePostFrame } from "../postFrame";

// A thread or quotes view that can be shown inside the interaction drawer.
// `standardSitePost` shows a referenced post's own discussion (the post itself
// plus its comments / Bluesky mentions) rather than a Bluesky thread.
// `recommends` shows the list of profiles that recommended a post.
// `tag` shows the posts carrying a tag, and is keyed by the tag name rather
// than a uri.
export type DrawerThread =
  | { type: "thread"; uri: string }
  | { type: "quotes"; uri: string }
  | { type: "standardSitePost"; uri: string }
  | { type: "recommends"; uri: string }
  | { type: "tag"; tag: string };

export function drawerThreadKey(thread: DrawerThread) {
  return thread.type === "tag" ? thread.tag : thread.uri;
}

export function sameDrawerThread(a: DrawerThread, b: DrawerThread) {
  if (a.type !== b.type) return false;
  return drawerThreadKey(a) === drawerThreadKey(b);
}

type DrawerThreadNav = {
  push: (thread: DrawerThread) => void;
};

// Set by the InteractionDrawer (to navigate within the drawer) and by the
// document page (to open the drawer onto a thread). When present, thread/quotes
// links replace the drawer's content instead of opening a new page.
export const DrawerThreadContext = createContext<DrawerThreadNav | null>(null);

// Returns a function that opens a thread or quotes view. When a drawer-aware
// provider is in scope it navigates within / opens the drawer; elsewhere it
// falls back to opening a new page.
export function useOpenThread() {
  const drawerNav = useContext(DrawerThreadContext);
  const frame = usePostFrame();
  return (parent: OpenPage | undefined, thread: DrawerThread) => {
    if (drawerNav) drawerNav.push(thread);
    // standardSitePost, recommends and tag only exist inside the drawer; they
    // have no page form, so they're never reached here without a drawer-aware
    // provider.
    else if (thread.type === "thread" || thread.type === "quotes")
      frame.openPage(parent, thread);
  };
}

// Wraps document-body content so Bluesky posts within it open their thread
// where the frame shows threads (onto a fresh stack) rather than in a new page.
export function DrawerThreadPageProvider(props: {
  pageId?: string;
  children: React.ReactNode;
}) {
  const frame = usePostFrame();
  const value = useMemo(
    () => ({
      push: (thread: DrawerThread) => frame.openThread(thread, props.pageId),
    }),
    [frame, props.pageId],
  );
  return (
    <DrawerThreadContext.Provider value={value}>
      {props.children}
    </DrawerThreadContext.Provider>
  );
}
