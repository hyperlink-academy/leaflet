"use client";
import { useMemo } from "react";
import { DrawerThread, DrawerThreadContext } from "./drawerThreadContext";
import { openDrawerThread } from "./Interactions";

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
