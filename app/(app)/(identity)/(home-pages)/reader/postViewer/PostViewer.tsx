"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { checkUrlFrameable } from "actions/checkUrlFrameable";
import { hasLeafletContent } from "lexicons/src/normalize";
import { ButtonPrimary } from "components/Buttons";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { ReaderFooter } from "./ReaderFooter";
import { PostViewerPanel } from "./PostViewerPanel";
import { ReaderLeafletPost } from "./ReaderLeafletPost";
import { ReaderPostFrame } from "./ReaderPostFrame";

export const PostViewer = () => {
  let {
    queue,
    index,
    closeViewer,
    preloadUrl,
    panel,
    setPanel,
    pages,
    setPages,
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
      if (panel) setPanel(null);
      else if (pages.length > 0) setPages((pages) => pages.slice(0, -1));
      else closeViewer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, panel, setPanel, pages.length, setPages, closeViewer]);

  let postRecord = post?.documents.data ?? null;
  let pubRecord = post?.publication?.pubRecord ?? undefined;
  let postUrl =
    post && postRecord
      ? getDocumentURL(postRecord, post.documents.uri, pubRecord)
      : null;

  let isLeafletPost = !!postRecord && hasLeafletContent(postRecord);
  let externalUrl = postUrl && !isLeafletPost ? postUrl : null;
  let { data: frameable } = useSWR(
    externalUrl ? `frameable-${externalUrl}` : null,
    () => checkUrlFrameable(externalUrl!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  let framedUrl = open ? externalUrl : preloadUrl;
  let { looping, onFrameLoad } = useFrameReloadLoop(framedUrl);
  let blocked = !!externalUrl && frameable === false;
  if (!open && !framedUrl) return null;

  return (
    <div className="flex items-stretch h-full">
      <div
        className={`readerPostViewer flex sm:flex-col-reverse flex-col w-full h-full sm:py-6 sm:pl-6 sm:gap-2 ${open ? "" : "absolute inset-0 invisible pointer-events-none"}`}
        aria-hidden={!open}
      >
        <div className="readerContent relative w-full grow min-h-0 overflow-hidden bg-bg-page sm:rounded-lg sm:border sm:border-border-light">
          <ReaderPostFrame document_uri={post?.documents.uri ?? ""}>
            {post && isLeafletPost && postUrl ? (
              <ReaderLeafletPost
                key={post.documents.uri}
                document_uri={post.documents.uri}
                postUrl={postUrl}
              />
            ) : !framedUrl ? null : blocked ? (
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
                key={`${framedUrl}-${looping}`}
                sandbox={looping ? SCRIPTLESS_SANDBOX : undefined}
                src={framedUrl}
                title={postRecord?.title || "Post"}
                onLoad={onFrameLoad}
                className="w-full h-full border-none bg-bg-page"
              />
            )}
            {panel && post && postRecord && postUrl && (
              <PostViewerPanel
                post={post}
                postRecord={postRecord}
                postUrl={postUrl}
              />
            )}
          </ReaderPostFrame>
        </div>
        <div className="readerFooterWrapper relative sm:h-[37px] h-[69px] shrink-0 flex items-center">
          <ReaderFooter post={post} postRecord={postRecord} postUrl={postUrl} />
        </div>
      </div>
    </div>
  );
};

// Some sites navigate themselves on load in a way that never settles inside a
// third-party frame — pckt custom domains bounce through an SSO check whose
// SameSite=Lax session cookie is dropped here, so every load starts the bounce
// again. The frame's load events are all a cross-origin parent can see: a burst
// of them faster than anyone could click through links means the page is
// stuck. The navigation is script-driven and these sites server-render their
// posts, so the frame is remounted without scripts, along with every later
// post from the same host.
const LOOP_LOADS = 4;
const LOOP_WINDOW_MS = 5000;
const SCRIPTLESS_SANDBOX =
  "allow-same-origin allow-popups allow-popups-to-escape-sandbox";
function useFrameReloadLoop(url: string | null) {
  let [loopingHosts, setLoopingHosts] = useState<ReadonlySet<string>>(
    new Set(),
  );
  let loads = useRef<{ url: string | null; times: number[] }>({
    url: null,
    times: [],
  });
  let host = url && URL.canParse(url) ? new URL(url).host : null;
  let looping = !!host && loopingHosts.has(host);
  let onFrameLoad = () => {
    if (!host || looping) return;
    let now = performance.now();
    if (loads.current.url !== url) loads.current = { url, times: [] };
    let times = loads.current.times.filter((t) => now - t < LOOP_WINDOW_MS);
    times.push(now);
    loads.current.times = times;
    if (times.length >= LOOP_LOADS)
      setLoopingHosts((hosts) => new Set(hosts).add(host));
  };
  return { looping, onFrameLoad };
}
