"use client";
import { createContext, useContext, useMemo } from "react";
import { OpenPage, openPage } from "../postPageState";
import { openDrawerThread } from "./Interactions";

// A thread or quotes view that can be shown inside the interaction drawer.
export type DrawerThread =
  | { type: "thread"; uri: string }
  | { type: "quotes"; uri: string };

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
    else openPage(parent, thread);
  };
}

// Wraps document-body content so Bluesky posts within it open their thread in
// the interaction drawer (onto a fresh stack) rather than in a new page.
export function DrawerThreadPageProvider(props: {
  document_uri: string;
  pageId?: string;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      push: (thread: DrawerThread) =>
        openDrawerThread(props.document_uri, thread, props.pageId),
    }),
    [props.document_uri, props.pageId],
  );
  return (
    <DrawerThreadContext.Provider value={value}>
      {props.children}
    </DrawerThreadContext.Provider>
  );
}
