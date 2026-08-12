"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useIsMobile } from "src/hooks/isMobile";
import useSWR from "swr";
import { useReaderPostViewer } from "src/useReaderPostViewer";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { getPublicationNewsletterMode } from "actions/publications/getNewsletterMode";
import { checkUrlFrameable } from "actions/checkUrlFrameable";
import { hasLeafletContent } from "lexicons/src/normalize";
import { ButtonPrimary } from "components/Buttons";
import { RecommendButton } from "components/Interactions/RecommendButton";
import { DiscussionButton } from "components/Interactions/DiscussionButton";
import { DiscussionContent } from "components/Interactions/DiscussionModal";
import { mergePreferences } from "src/utils/mergePreferences";
import { InteractionShareButton } from "components/Interactions/InteractionShareButton";
import { SubscribeButton } from "components/Subscribe/SubscribeButton";
import { Separator } from "components/Layout";
import { useSidebarStore } from "components/ActionBar/Sidebar";
import { CloseTiny } from "components/Icons/CloseTiny";
import { MenuSmall } from "components/Icons/MenuSmall";
import { GoBackTiny } from "components/Icons/GoBackTiny";
import { ExternalLinkTiny } from "components/Icons/ExternalLinkTiny";
import { ArrowRightTiny } from "components/Icons/ArrowRightTiny";

// Full-page iframe over the reader feed, so opening a post doesn't lose the
// reader's place in the feed. On mobile it covers the whole screen and its
// floating toolbar replaces the feed's footer (MobileNavigation hides itself,
// and the toolbar's hamburger stands in for the footer's). On desktop the nav
// sidebar stays visible and usable: the overlay only covers the content
// column, so there's no hamburger.
export const PostViewer = () => {
  let {
    queue,
    index,
    nextPost,
    closeViewer,
    preloadUrl,
    // Discussions render inside the viewer's own box (over the iframe) rather
    // than the centered DiscussionModal, so opening them shifts nothing — the
    // box, toolbar, and close button all stay put.
    discussionOpen,
    setDiscussionOpen,
  } = useReaderPostViewer();
  let setSidebarOpen = useSidebarStore((s) => s.setOpen);
  let isMobile = useIsMobile();
  let post = index === null ? null : queue[index];
  let open = !!post;

  // Where the content column starts — the overlay's left edge, so the desktop
  // sidebar stays uncovered. The dashboard is a centered max-width flex row,
  // so this can't be a static inset; measure the content element instead.
  // 0 (mobile, or the element missing) means full-width.
  // Also measured while only preloading, so the hidden frame already has its
  // final geometry and the reveal doesn't resize (and reflow) the loaded page.
  let active = open || !!preloadUrl;
  let [contentLeft, setContentLeft] = useState(0);
  useLayoutEffect(() => {
    if (!active) return;
    let measure = () => {
      let content = document.getElementById("home-content");
      setContentLeft(
        content
          ? Math.max(0, Math.round(content.getBoundingClientRect().left))
          : 0,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active]);

  // The overlay survives client-side navigation (it's a module-level store), so
  // a browser back/forward while it's up would swap the page underneath.
  // Treat any route change as a close.
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
      // An open portaled layer (share menu, subscribe modal…) owns this
      // Escape — Radix closes it but the event still reaches window, and
      // closing the viewer underneath too would be jarring. Focus sits inside
      // the layer while it's open, so the target gives it away.
      let target = e.target as HTMLElement | null;
      if (target?.closest?.("[role='dialog'], [role='menu']")) return;
      // Peel the discussion panel first, the viewer second.
      if (discussionOpen) setDiscussionOpen(false);
      else closeViewer();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, discussionOpen, closeViewer]);

  let pubUri = post?.publication?.uri;
  let { data: newsletterMode } = useSWR(
    pubUri ? `newsletter-mode-${pubUri}` : null,
    () => getPublicationNewsletterMode(pubUri!),
    { revalidateOnFocus: false },
  );

  let postRecord = post?.documents.data ?? null;
  let pubRecord = post?.publication?.pubRecord ?? undefined;
  let postUrl =
    post && postRecord
      ? getDocumentURL(postRecord, post.documents.uri, pubRecord)
      : null;

  // External (non-Leaflet-hosted) posts get the iframe optimistically — most
  // blogs allow it — while the server checks their framing headers in
  // parallel, since a refused iframe fails silently and the headers aren't
  // readable cross-origin. A "blocked" verdict swaps in the fallback panel
  // with an open-in-new-tab button.
  let externalUrl =
    postUrl && postRecord && !hasLeafletContent(postRecord) ? postUrl : null;
  let { data: frameable } = useSWR(
    externalUrl ? `frameable-${externalUrl}` : null,
    () => checkUrlFrameable(externalUrl!),
    { revalidateOnFocus: false, revalidateIfStale: false },
  );
  let blocked = !!externalUrl && frameable === false;

  // While a listing is hovered/touched the frame loads its url invisibly;
  // opening the same url keeps framedUrl (and the iframe's key) identical, so
  // React keeps the DOM node and the reveal shows the already-loading page.
  // An iframe can't be re-parented without reloading, which is why the whole
  // viewer stays mounted (hidden) rather than rendering a separate warmer.
  let framedUrl = open ? postUrl : preloadUrl;
  if (!framedUrl) return null;

  let chrome: React.ReactNode = null;
  let discussionLayer: React.ReactNode = null;
  if (post && postRecord && postUrl) {
    let recommendsCount =
      post.documents.recommends_on_documents?.[0]?.count || 0;
    // Same availability logic as the feed card (PostListing).
    let mergedPrefs = mergePreferences(
      postRecord.preferences,
      pubRecord?.preferences,
    );
    let quotesCount =
      post.documents.mentionsCount ??
      post.documents.document_mentions_in_bsky?.[0]?.count ??
      0;
    let commentsCount =
      mergedPrefs.showComments === false
        ? 0
        : post.documents.comments_on_documents?.[0]?.count || 0;
    let hasNext = index !== null && index < queue.length - 1;

    if (discussionOpen) {
      discussionLayer = (
        <>
          {/* bg split matches DiscussionContent's sticky header (plain
              bg-page on mobile, the bg-light tint on desktop like the modal). */}
          <div className="absolute inset-0 overflow-y-auto overscroll-contain px-3 bg-bg-page sm:bg-[var(--color-bg-light)]">
            <div className="max-w-lg mx-auto pb-24">
              <DiscussionContent
                open
                document_uri={post.documents.uri}
                postUrl={postUrl}
                title={postRecord.title}
                commentsCount={commentsCount}
                quotesCount={quotesCount}
                showComments={mergedPrefs.showComments !== false}
                showMentions={mergedPrefs.showMentions !== false}
              />
            </div>
          </div>
          <button
            aria-label="Back to post"
            className="absolute left-3 rounded-full border border-border-light bg-bg-page p-1.5 text-secondary shadow-md hover:text-accent-contrast"
            style={{ top: "max(env(safe-area-inset-top), 12px)" }}
            onClick={() => setDiscussionOpen(false)}
          >
            <GoBackTiny />
          </button>
        </>
      );
    }

    chrome = (
      <>
        <button
          aria-label="Close post"
          className="absolute right-3 rounded-full border border-border-light bg-bg-page p-1.5 text-secondary shadow-md hover:text-accent-contrast"
          style={{ top: "max(env(safe-area-inset-top), 12px)" }}
          onClick={closeViewer}
        >
          <CloseTiny />
        </button>
        <div
          className="pwa-padding-x absolute left-0 right-0 flex justify-center pointer-events-none"
          style={{ bottom: "max(var(--safe-padding-bottom), 16px)" }}
        >
          <div className="pointer-events-auto flex items-center gap-3 max-w-full rounded-lg border border-border-light bg-bg-page px-3 py-1 text-secondary shadow-md">
            {isMobile && (
              <>
                <button
                  aria-label="Open sidebar"
                  className="hover:text-accent-contrast"
                  onClick={() => setSidebarOpen(true)}
                >
                  <MenuSmall />
                </button>
                <Separator classname="h-5!" />
              </>
            )}
            <a
              href={postUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open post in new tab"
              className="text-secondary hover:text-accent-contrast"
            >
              <ExternalLinkTiny />
            </a>
            <InteractionShareButton
              postRecord={postRecord}
              postUrl={postUrl}
              documentUri={post.documents.uri}
              publication={pubRecord}
              pubUri={post.publication?.uri}
            />
            <RecommendButton
              documentUri={post.documents.uri}
              recommendsCount={recommendsCount}
            />
            <DiscussionButton
              documentUri={post.documents.uri}
              commentsCount={commentsCount}
              quotesCount={quotesCount}
              showComments={mergedPrefs.showComments !== false}
              showMentions={mergedPrefs.showMentions !== false}
              postUrl={postUrl}
              title={postRecord.title}
              onClick={() => setDiscussionOpen(!discussionOpen)}
            />
            {post.publication && pubRecord && (
              <>
                <Separator classname="h-5!" />
                <SubscribeButton
                  publicationUri={post.publication.uri}
                  publicationUrl={pubRecord.url}
                  publicationName={pubRecord.name || ""}
                  publicationDescription={pubRecord.description}
                  newsletterMode={newsletterMode ?? false}
                />
              </>
            )}
            <Separator classname="h-5!" />
            <button
              aria-label="Next post"
              disabled={!hasNext}
              onClick={nextPost}
              className="flex items-center gap-0.5 font-bold hover:text-accent-contrast disabled:text-border disabled:hover:text-border"
            >
              Next <ArrowRightTiny />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    // Desktop padding mirrors the dashboard's spacing: pl-8 like the content
    // column's gap from the sidebar, py/pr-6 like the sidebar's own margins.
    // While only preloading, the whole overlay is present but invisible —
    // visibility keeps the iframe loading without paint or hit-testing.
    <div
      className={`readerPostViewer fixed inset-y-0 right-0 z-20 sm:py-6 sm:pl-8 sm:pr-6 ${open ? "" : "invisible pointer-events-none"}`}
      style={{ left: contentLeft }}
      aria-hidden={!open}
    >
      <div className="relative w-full h-full overflow-hidden bg-bg-page sm:rounded-lg sm:border sm:border-border-light sm:shadow-md">
        {blocked ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 px-4 text-center">
            <h3 className="text-secondary">
              This site doesn&apos;t allow embedding
            </h3>
            <p className="text-tertiary">Read it in a new tab instead:</p>
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
        {discussionLayer}
        {chrome}
      </div>
    </div>
  );
};
