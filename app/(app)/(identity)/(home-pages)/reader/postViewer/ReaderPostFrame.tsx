"use client";
import { useMemo } from "react";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import {
  PostFrameProvider,
  type PostFrame,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postFrame";
import { getPageKey } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postPageState";

// The viewer's box is the only surface there is: a subpage replaces the page
// it was opened from, and everything a published page puts in its drawer goes
// to the viewer's panel instead. Wraps the panel as well as the post, so
// content inside the panel (a quote that jumps to its passage) lands here too.
export function ReaderPostFrame(props: {
  document_uri: string;
  children: React.ReactNode;
}) {
  let pages = useReaderPostViewer((s) => s.pages);
  let setPages = useReaderPostViewer((s) => s.setPages);
  let setPanel = useReaderPostViewer((s) => s.setPanel);
  let document_uri = props.document_uri;

  let frame = useMemo<PostFrame>(() => {
    let openDiscussion: PostFrame["openDiscussion"] = (tab, pageId) =>
      setPanel({ type: "discussion", tab, pageId });
    return {
      layout: "single",
      headerInteractions: false,
      openPages: pages,
      openPage: (parent, page) =>
        setPages((pages) => {
          let existing = pages.findIndex(
            (p) => getPageKey(p) === getPageKey(page),
          );
          if (existing !== -1) return pages.slice(0, existing + 1);
          let parentIndex = parent
            ? pages.findIndex((p) => getPageKey(p) === getPageKey(parent))
            : -1;
          return [...pages.slice(0, parentIndex + 1), page];
        }),
      closePage: (page) =>
        setPages((pages) => {
          let index = pages.findIndex(
            (p) => getPageKey(p) === getPageKey(page),
          );
          return index === -1 ? pages : pages.slice(0, index);
        }),
      showPage: (pageId) => {
        setPanel(null);
        setPages(() => (pageId ? [{ type: "doc", id: pageId }] : []));
      },
      openDiscussion,
      // The panel covers whatever opened it, so there's no open state to
      // toggle from.
      toggleDiscussion: openDiscussion,
      openThread: (thread, pageId) => {
        if (thread.type === "tag") setPanel({ type: "tag", tag: thread.tag });
        else if (thread.type === "recommends" && thread.uri === document_uri)
          setPanel({ type: "recommends" });
        else setPanel({ type: "discussion", pageId, thread });
      },
    };
  }, [pages, setPages, setPanel, document_uri]);

  return <PostFrameProvider value={frame}>{props.children}</PostFrameProvider>;
}
