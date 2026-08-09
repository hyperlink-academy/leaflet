"use client";

import React, { useEffect, useRef, useState } from "react";
import { SpeedyLink } from "components/SpeedyLink";
import { LockTiny } from "components/Icons/LockTiny";
import type { ChapterCard } from "src/utils/chapterGrouping";
import type { PublicationPostsListPost } from "src/utils/buildPublicationPosts";
import type { NormalizedPublication } from "src/utils/normalizeRecords";
import { PublicationPostsList } from "./PublicationPostsList";

const MAX_CARD_WIDTH = 240;
const GRID_GAP = 24;

/**
 * The chapter view of a posts-list block: an optional "Latest" post card above
 * a shelf of chapter covers. Cards arrive prebuilt (see `buildChapterCards`) —
 * grouping happens where the full archive lives, so the shelf itself never
 * fetches or pages posts.
 */
export function ChapterShelf({
  publication,
  publicationRecord,
  cards,
  latestPost,
  highlightLatest = false,
  disableLinks = false,
  className,
}: {
  publication: { uri: string; record: unknown };
  publicationRecord: NormalizedPublication | null;
  cards: ChapterCard[];
  // The newest post in the archive, resolved separately since the cards don't
  // carry their posts.
  latestPost?: PublicationPostsListPost;
  highlightLatest?: boolean;
  disableLinks?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative w-full ${className ?? ""}`}>
      {highlightLatest && latestPost && (
        <>
          <div className="text-sm uppercase font-bold text-tertiary pb-1">
            Latest
          </div>
          <div className="block-border hover:outline-border!">
            <PublicationPostsList
              inList={false}
              publication={publication}
              publicationRecord={publicationRecord}
              posts={[latestPost]}
              view="medium"
              preSorted
              disableLinks={disableLinks}
            />
          </div>
          <hr className="border-border-light my-4" />
        </>
      )}
      <PublicationPostsChapterList
        cards={cards}
        pageWidth={publicationRecord?.theme?.pageWidth}
        disableLinks={disableLinks}
      />
    </div>
  );
}

/**
 * A publication's posts as covers on a shelf, one cover per chapter.
 *
 * Posts whose titles follow the chapter convention (`Series #2, Pg. 7` — see
 * `src/utils/chapterGrouping`) collapse into a single card; everything else
 * keeps a card of its own. A chapter's cover and the page it opens on both come
 * from its first page in reading order.
 */
export function PublicationPostsChapterList({
  cards,
  pageWidth,
  disableLinks = false,
}: {
  cards: ChapterCard[];
  // The publication theme's page width, used to size the grid until the
  // container has been measured.
  pageWidth?: number;
  // In the editor the shelf is something you're laying out, not reading, so
  // covers render as plain cards that don't navigate away from the page.
  disableLinks?: boolean;
}) {
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

  const width = measuredWidth ?? pageWidth ?? 624;
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
    <>
      {disableLinks ? (
        <div className={cardClassName}>{content}</div>
      ) : (
        <SpeedyLink href={card.href} className={cardClassName}>
          {content}
        </SpeedyLink>
      )}
    </>
  );
}
