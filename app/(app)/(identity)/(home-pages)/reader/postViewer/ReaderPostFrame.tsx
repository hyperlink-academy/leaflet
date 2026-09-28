"use client";
import { useMemo } from "react";
import { flushSync } from "react-dom";
import { scrollIntoView } from "src/utils/scrollIntoView";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import {
  PostFrameProvider,
  type PostFrame,
} from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postFrame";
import { getPageKey } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/postPageState";

// Subpages open beside the page as they do on a published post, but
// everything a published page puts in its drawer goes to the viewer's panel
// instead. Wraps the panel as well as the post, so
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
    // Same stack rules as the published page's openPage: a page opens right
    // after its parent, closing whatever was open past it.
    let openPage: PostFrame["openPage"] = (parent, page) => {
      flushSync(() =>
        setPages((pages) => {
          if (pages.some((p) => getPageKey(p) === getPageKey(page)))
            return pages;
          let parentIndex = parent
            ? pages.findIndex((p) => getPageKey(p) === getPageKey(parent))
            : -1;
          return parentIndex === -1
            ? [page]
            : [...pages.slice(0, parentIndex + 1), page];
        }),
      );
      requestAnimationFrame(() =>
        scrollIntoView(`post-page-${getPageKey(page)}`),
      );
    };
    let openDiscussion: PostFrame["openDiscussion"] = (tab, pageId) =>
      setPanel({ type: "discussion", tab, pageId });
    return {
      drawer: false,
      headerInteractions: false,
      openPages: pages,
      openPage,
      closePage: (page) =>
        setPages((pages) => {
          let index = pages.findIndex(
            (p) => getPageKey(p) === getPageKey(page),
          );
          return index === -1 ? pages : pages.slice(0, index);
        }),
      showPage: (pageId) => {
        setPanel(null);
        if (pageId) openPage(undefined, { type: "doc", id: pageId });
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
