"use client";
import { createContext, useContext } from "react";
import { OpenPage, openPage } from "../postPageState";

// A thread or quotes view that can be shown inside the interaction drawer.
// `standardSitePost` shows a referenced post's own discussion (the post itself
// plus its comments / Bluesky mentions) rather than a Bluesky thread.
// `recommends` shows the list of profiles that recommended a post.
export type DrawerThread =
  | { type: "thread"; uri: string }
  | { type: "quotes"; uri: string }
  | { type: "standardSitePost"; uri: string }
  | { type: "recommends"; uri: string };

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
  return (parent: OpenPage | undefined, thread: DrawerThread) => {
    if (drawerNav) drawerNav.push(thread);
    // standardSitePost and recommends only exist inside the drawer; they have no
    // page form, so they're never reached here without a drawer-aware provider.
    else if (thread.type !== "standardSitePost" && thread.type !== "recommends")
      openPage(parent, thread);
  };
}
