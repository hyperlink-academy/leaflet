"use client";
import { createContext, useContext, useMemo } from "react";
import { useDocumentOptional } from "contexts/DocumentContext";
import {
  type OpenPage,
  closePage,
  openPage,
  useInitializeOpenPages,
  useOpenPages,
} from "./postPageState";
import {
  openDrawerThread,
  openInteractionDrawer,
  toggleInteractionDrawer,
} from "./Interactions/Interactions";
import type { DrawerThread } from "./Interactions/drawerThreadContext";

// Whatever is presenting the post owns where its secondary surfaces go: the
// subpages, embeds opened as pages, the discussion and the threads, recommends
// and tag lists. Post content only ever asks the frame for them.
export type PostFrame = {
  // "carousel": subpages and the interaction drawer open beside the page they
  // came from. "single": one page on screen at a time, no drawer — the host
  // shows discussion surfaces itself.
  layout: "carousel" | "single";
  // False when the host's own chrome carries the post-level interactions.
  headerInteractions: boolean;
  openPages: OpenPage[];
  openPage: (parent: OpenPage | undefined, page: OpenPage) => void;
  closePage: (page: OpenPage) => void;
  // Bring a page of the post itself on screen (the first page when no id is
  // given), from a surface that may be covering or beside it.
  showPage: (pageId?: string) => void;
  openDiscussion: (tab: "comments" | "quotes", pageId?: string) => void;
  toggleDiscussion: (tab: "comments" | "quotes", pageId?: string) => void;
  openThread: (thread: DrawerThread, pageId?: string) => void;
};

const PostFrameContext = createContext<PostFrame | null>(null);

// Falls back to the published frame for post content rendered outside any
// provider (publication pages, discussion modals).
export function usePostFrame(): PostFrame {
  let host = useContext(PostFrameContext);
  let published = usePublishedPostFrame();
  return host ?? published;
}

export function PostFrameProvider(props: {
  value: PostFrame;
  children: React.ReactNode;
}) {
  return (
    <PostFrameContext.Provider value={props.value}>
      {props.children}
    </PostFrameContext.Provider>
  );
}

function usePublishedPostFrame(): PostFrame {
  let document_uri = useDocumentOptional()?.uri;
  let openPages = useOpenPages();
  return useMemo(
    () => ({
      layout: "carousel",
      headerInteractions: true,
      openPages,
      openPage,
      closePage,
      showPage: (pageId) => {
        if (pageId) openPage(undefined, { type: "doc", id: pageId });
      },
      openDiscussion: (tab, pageId) => {
        if (document_uri) openInteractionDrawer(tab, document_uri, pageId);
      },
      toggleDiscussion: (tab, pageId) => {
        if (document_uri) toggleInteractionDrawer(tab, document_uri, pageId);
      },
      openThread: (thread, pageId) => {
        if (document_uri) openDrawerThread(document_uri, thread, pageId);
      },
    }),
    [document_uri, openPages],
  );
}

export function PublishedPostFrame(props: { children: React.ReactNode }) {
  useInitializeOpenPages();
  return (
    <PostFrameProvider value={usePublishedPostFrame()}>
      {props.children}
    </PostFrameProvider>
  );
}
