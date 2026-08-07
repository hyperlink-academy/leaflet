"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { AtUri } from "@atproto/api";
import { SpeedyLink } from "components/SpeedyLink";
import { LockTiny } from "components/Icons/LockTiny";
import { useWarmRoutes } from "src/hooks/useWarmRoutes";
import { getDocumentURL } from "src/utils/getPublicationURL";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "src/utils/blobRefToSrc";
import type { ChapterListItem } from "src/utils/chapterGrouping";
import type { PublicationPostsListPost } from "src/utils/buildPublicationPosts";
import { NormalizedPublication } from "lexicons/src/normalize";

// Pages warmed when a chapter is pointed at. The first is the one the card
// opens; the rest are what the post page's next/prev buttons reach for, so a
// page turn straight after opening a chapter doesn't wait on a fetch.
const CHAPTER_PRELOAD = 3;
const MAX_CARD_WIDTH = 240;
const GRID_GAP = 24;

type PublicationForURL = { uri: string; record: unknown };

type ChapterCard = {
  key: string;
  label: string;
  href: string;
  /** The routes to warm on hover, first page first. */
  preloadHrefs: string[];
  coverImageSrc?: string;
  membersOnly: boolean;
};

/**
 * A publication's posts as covers on a shelf, one cover per chapter.
 *
 * Posts whose titles follow the chapter convention (`Series #2, Pg. 7` — see
 * `src/utils/chapterGrouping`) collapse into a single card; everything else
 * keeps a card of its own. A chapter's cover and the page it opens on both come
 * from its first page in reading order.
 */
export function PublicationPostsChapterList({
  publication,
  chapters,
  disableLinks = false,
}: {
  publication: PublicationForURL;
  chapters: ChapterListItem<PublicationPostsListPost>[];
  // In the editor the shelf is something you're laying out, not reading, so
  // covers render as plain cards that don't navigate away from the page.
  disableLinks?: boolean;
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
        membersOnly: item.posts.some((post) => post.membersOnly),
      };
    });
  }, [chapters, publication]);

  let pubRecord = publication.record as NormalizedPublication;
  const gridRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState<number | null>(null);
  useEffect(() => {
    let el = gridRef.current;
    if (!el) return;
    let observer = new ResizeObserver((entries) => {
      setMeasuredWidth(entries[0].contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const width = measuredWidth ?? pubRecord?.theme?.pageWidth ?? 624;
  // Fewest columns that keep every card within MAX_CARD_WIDTH, counting the
  // gaps between them. The 1px slack absorbs sub-pixel measurements so a shelf
  // sized exactly to its container doesn't tip into an extra column.
  const gridCols = Math.max(
    1,
    Math.ceil((width - 1 + GRID_GAP) / (MAX_CARD_WIDTH + GRID_GAP)),
  );

  return (
    <div
      ref={gridRef}
      className="publicationPostChapterList gap-3 sm:gap-6 w-full"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))`,
      }}
    >
      {cards.map((card) => (
        <ChapterItem key={card.key} card={card} disableLinks={disableLinks} />
      ))}
    </div>
  );
}

function ChapterItem({
  card,
  disableLinks,
}: {
  card: ChapterCard;
  disableLinks?: boolean;
}) {
  const warmRoutes = useWarmRoutes();
  // Prefetch is deduped by the router, so pointing at a card repeatedly costs
  // one request per page.
  const warm = () => {
    if (disableLinks) return;
    warmRoutes(card.preloadHrefs);
  };

  const cardClassName =
    "chapterItem group flex flex-col gap-2 no-underline! text-primary min-w-0 w-full";
  const content = (
    <>
      <div
        className={`chapterCover relative w-full aspect-2/3 overflow-hidden block-border ${disableLinks ? "" : " hover:outline-border!"}`}
      >
        {card.coverImageSrc ? (
          <img
            src={card.coverImageSrc}
            // Decorative: the card's own title, below, already names it.
            alt=""
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        ) : (
          // No art to show, so the label carries the cover rather than
          // leaving a blank card. The link's own text already reads it out.
          <div
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-center p-3 bg-[var(--color-bg-light)] text-tertiary max-w-full w-[1000px]"
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
    </>
  );

  return (
    <div onPointerEnter={warm} onFocus={warm} className="min-w-0">
      {disableLinks ? (
        <div className={cardClassName}>{content}</div>
      ) : (
        <SpeedyLink href={card.href} className={cardClassName}>
          {content}
        </SpeedyLink>
      )}
    </div>
  );
}
