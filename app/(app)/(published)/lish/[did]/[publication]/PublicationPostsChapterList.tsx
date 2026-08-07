"use client";

import React, { useMemo } from "react";
import { AtUri } from "@atproto/api";
import { SpeedyLink } from "components/SpeedyLink";
import { LockTiny } from "components/Icons/LockTiny";
import { useWarmRoutes } from "src/hooks/useWarmRoutes";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import type { ChapterListItem } from "src/utils/chapterGrouping";
import type { PublicationPostsListPost } from "src/utils/buildPublicationPosts";

// Pages warmed when a chapter is pointed at. The first is the one the card
// opens; the rest are what the post page's next/prev buttons reach for, so a
// page turn straight after opening a chapter doesn't wait on a fetch.
const CHAPTER_PRELOAD = 3;

type PublicationForURL = { uri: string; record: unknown };

type ChapterCard = {
  key: string;
  label: string;
  href: string;
  /** The routes to warm on hover, first page first. */
  preloadHrefs: string[];
  coverImageSrc?: string;
  pageCount: number;
  membersOnly: boolean;
  isChapter: boolean;
};

/**
 * A publication's posts as covers on a shelf, one cover per chapter.
 *
 * Posts whose titles follow the chapter convention (`Series #2, Pg. 7` — see
 * `src/utils/chapterGrouping`) collapse into a single card; everything else
 * keeps a card of its own. A chapter's cover and the page it opens on both come
 * from its first page in reading order. Grouping happens upstream, where the
 * chapter count is also what decides when to stop paginating.
 */
export function PublicationPostsChapterList({
  publication,
  chapters,
  className,
}: {
  publication: PublicationForURL;
  chapters: ChapterListItem<PublicationPostsListPost>[];
  className?: string;
}) {
  const cards = useMemo<ChapterCard[]>(() => {
    return chapters.map((item) => {
      const hrefs = item.posts.map((post) =>
        getDocumentURL(post.record, post.uri, publication),
      );
      const first = item.posts[0];
      const coverImage = first.record.coverImage;
      return {
        key: item.key,
        label: item.label,
        href: hrefs[0],
        preloadHrefs: hrefs.slice(0, CHAPTER_PRELOAD),
        coverImageSrc: coverImage
          ? blobRefToSrc(coverImage.ref, new AtUri(first.uri).host, undefined, {
              width: COVER_THUMBNAIL_WIDTH.medium,
            })
          : undefined,
        pageCount: item.posts.length,
        membersOnly: item.posts.some((post) => post.membersOnly),
        isChapter: item.isChapter,
      };
    });
  }, [chapters, publication]);

  return (
    <div
      className={`publicationPostChapterList grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-5 w-full ${className ?? ""}`}
    >
      {cards.map((card) => (
        <ChapterItem key={card.key} card={card} />
      ))}
    </div>
  );
}

function ChapterItem({ card }: { card: ChapterCard }) {
  const warmRoutes = useWarmRoutes();
  // Prefetch is deduped by the router, so pointing at a card repeatedly costs
  // one request per page.
  const warm = () => warmRoutes(card.preloadHrefs);

  return (
    <div onPointerEnter={warm} onFocus={warm} className="min-w-0">
      <SpeedyLink
        href={card.href}
        className="chapterItem group flex flex-col gap-2 no-underline! text-primary min-w-0"
      >
        <div className="chapterCover relative w-full aspect-2/3 overflow-hidden block-border hover:outline-border!">
          {card.coverImageSrc ? (
            <img
              src={card.coverImageSrc}
              alt={card.label}
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          ) : (
            // No art to show, so the label carries the cover rather than
            // leaving a blank card. The link's own text already reads it out.
            <div
              aria-hidden
              className="absolute inset-0 flex items-center justify-center text-center p-3 text-secondary"
            >
              {card.label}
            </div>
          )}
          {card.membersOnly && (
            <div
              aria-label="Contains member only content"
              className="absolute top-1.5 right-1.5 bg-accent-1 text-accent-2 rounded-full h-5 w-5 flex items-center justify-center"
            >
              <LockTiny />
            </div>
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="chapterTitle text-primary font-bold leading-snug line-clamp-2">
            {card.label}
          </div>
        </div>
      </SpeedyLink>
    </div>
  );
}
