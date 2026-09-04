"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { checkUrlFrameable } from "actions/checkUrlFrameable";
import { hasLeafletContent } from "lexicons/src/normalize";
import { ButtonPrimary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { ReaderFooter } from "./ReaderFooter";
import { PostViewerDiscussion } from "./PostViewerDiscussion";

export const PostViewer = () => {
  let {
    queue,
    index,
    closeViewer,
    preloadUrl,
    discussionOpen,
    setDiscussionOpen,
  } = useReaderPostViewer();
  let post = index === null ? null : queue[index];
  let open = !!post;
  let pathname = usePathname();
  let mountPathname = useRef(pathname);
  useEffect(() => {
    if (pathname !== mountPathname.current) {
      mountPathname.current = pathname;
      closeViewer();
    }
  }, [pathname, closeViewer]);

  useEffect(() => {
    if (!open) return;
    let onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      let target = e.target as HTMLElement | null;
      if (target?.closest?.("[role='dialog'], [role='menu']")) return;
      if (discussionOpen) setDiscussionOpen(false);
      else closeViewer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, discussionOpen, closeViewer]);

  let postRecord = post?.documents.data ?? null;
  let pubRecord = post?.publication?.pubRecord ?? undefined;
  let postUrl =
    post && postRecord
      ? getDocumentURL(postRecord, post.documents.uri, pubRecord)
      : null;

  let externalUrl =
    postUrl && postRecord && !hasLeafletContent(postRecord) ? postUrl : null;
  let { data: frameable } = useSWR(
    externalUrl ? `frameable-${externalUrl}` : null,
    () => checkUrlFrameable(externalUrl!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  let blocked = !!externalUrl && frameable === false;
  let framedUrl = open ? postUrl : preloadUrl;
  if (!framedUrl) return null;

  return (
    <div className="flex items-stretch h-full">
      <div
        className={`readerPostViewer flex sm:flex-col-reverse flex-col w-full h-full sm:py-6 sm:pl-6 sm:gap-3 ${open ? "" : "absolute inset-0 invisible pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div className="readerContent relative w-full grow min-h-0 overflow-hidden bg-bg-page sm:rounded-lg sm:border sm:border-border-light">
          {blocked ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-4 text-center">
              <p className="text-tertiary">
                We can't show this post here! Read it in a new tab instead.
              </p>
              <a
                href={framedUrl}
                target="_blank"
                rel="noreferrer"
                className="no-underline! pt-3"
              >
                <ButtonPrimary>
                  Open post <ExternalLinkTiny />
                </ButtonPrimary>
              </a>
            </div>
          ) : (
            <iframe
              key={framedUrl}
              src={framedUrl}
              title={postRecord?.title || "Post"}
              className="w-full h-full border-none bg-bg-page"
            />
          )}
          {discussionOpen && post && postRecord && postUrl && (
            <PostViewerDiscussion
              post={post}
              postRecord={postRecord}
              postUrl={postUrl}
            />
          )}
        </div>
        <div className="readerFooterWrapper relative sm:h-[24px] h-[69px] shrink-0 flex items-center">
          <ReaderFooter post={post} postRecord={postRecord} postUrl={postUrl} />
        </div>
      </div>
    </div>
  );
};
