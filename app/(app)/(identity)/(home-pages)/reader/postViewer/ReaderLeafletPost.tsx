"use client";
import { useLayoutEffect, useRef } from "react";
import { useReaderPost } from "src/readerPost";
import { PostPageShell } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostPageShell";
import { DotLoader } from "components/utils/DotLoader";
import { ButtonPrimary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";

// Leaflet posts render through the published post pipeline right in the
// viewer's box; only the data crosses the wire.
export function ReaderLeafletPost(props: {
  document_uri: string;
  postUrl: string;
}) {
  let { data: post, isLoading } = useReaderPost(props.document_uri);

  // The pipeline centers and sizes pages against the viewport by default.
  let ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    let el = ref.current;
    if (!el) return;
    let setWidth = () =>
      el.style.setProperty("--leaflet-layout-width", `${el.clientWidth}px`);
    setWidth();
    let observer = new ResizeObserver(setWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    // Out of flow so the pipeline's intrinsic width (side-by-side pages, the
    // inline drawer) scrolls inside the box instead of widening the reader.
    <div ref={ref} className="readerLeafletPost absolute inset-0">
      {post ? (
        <PostPageShell embedded post={post} commentsSlot={null} />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-4 text-center text-tertiary">
          {isLoading ? (
            <DotLoader />
          ) : (
            <>
              <p>We couldn't load this post here! Read it in a new tab.</p>
              <a
                href={props.postUrl}
                target="_blank"
                rel="noreferrer"
                className="no-underline! pt-3"
              >
                <ButtonPrimary>
                  Open post <ExternalLinkTiny />
                </ButtonPrimary>
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}
