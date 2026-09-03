// Reading chapters out of post titles.
//
// A publication that posts one page per document — a comic, a serialised story
// — names its pages in a run: `chapter 1 - 001`, `chapter 1 - 002`, `FITV #2 |
// Pg. 7`. Its archive then reads as dozens of near-identical rows when what a
// reader wants to browse is chapters. Chapter view collapses those pages back
// into the chapters they came from and shows the art instead.
//
// Two things make that readable without a vocabulary of chapter words, which
// there is no writing — `#`, `chapter`, `Ch.`, `Episode`, `Capítulo` are all
// the same idea. Titles in a run name the chapter first and the page second,
// divided by one of a handful of characters people reach for. And posts go up
// in reading order, so a chapter is always a *run* of consecutive posts and
// only neighbours need comparing.

import { AtUri } from "@atproto/api";
import { getDocumentURL } from "./getPublicationURL";
import { blobRefToSrc, COVER_THUMBNAIL_WIDTH } from "./blobRefToSrc";
import type { NormalizedDocument } from "./normalizeRecords";

// The characters a title uses to divide its chapter from its page. Dash
// variants count as the dash people meant to type.
const CHAPTER_SEPARATOR = /[:,\-–—/|]/;

/**
 * The chapter a title names, or null when it names none.
 */
function chapterOf(title: string): string | null {
  const match = title.match(CHAPTER_SEPARATOR);
  if (!match || match.index === undefined) return null;
  return title.slice(0, match.index).trim() || null;
}

// ignore casing
function sameChapter(a: string | null, b: string | null) {
  return a !== null && b !== null && a.toLowerCase() === b.toLowerCase();
}

export type ChapterListItem<T> = {
  key: string;
  label: string;
  posts: T[];
};

type ChapterablePost = {
  uri: string;
  record: { title?: string; publishedAt?: string };
};

/**
 * Collapse the posts whose titles follow the archive's own chapter convention
 * into one item per chapter, leaving every other post an item of its own.
 *
 * Items come back oldest-first
 */
export function groupPostsIntoChapters<T extends ChapterablePost>(
  posts: T[],
): ChapterListItem<T>[] {
  // The convention only shows up as a run of neighbouring titles, so the
  // archive has to be walked the way it was written.
  const inOrder = [...posts].sort((a, b) => {
    const ad = a.record.publishedAt
      ? new Date(a.record.publishedAt).getTime()
      : 0;
    const bd = b.record.publishedAt
      ? new Date(b.record.publishedAt).getTime()
      : 0;
    if (ad !== bd) return ad - bd;
    return a.uri < b.uri ? -1 : 1;
  });
  const titleOf = (post: T) => (post.record.title || "").trim();
  const chapters = inOrder.map((post) => chapterOf(titleOf(post)));

  const items: ChapterListItem<T>[] = [];
  let i = 0;
  while (i < inOrder.length) {
    // A chapter needs a second page to be one: a lone title that happens to
    // carry a separator is still just a post.
    if (!sameChapter(chapters[i], chapters[i + 1] ?? null)) {
      items.push({
        key: inOrder[i].uri,
        label: titleOf(inOrder[i]),
        posts: [inOrder[i]],
      });
      i++;
      continue;
    }

    let last = i + 1;
    while (
      last + 1 < inOrder.length &&
      sameChapter(chapters[i], chapters[last + 1])
    )
      last++;

    const label = chapters[i] as string;
    items.push({
      // Two runs could carry the same name (a chapter posted in two sittings),
      // so where the run started is part of its identity.
      key: `${label.toLowerCase()}|${inOrder[i].uri}`,
      label,
      posts: inOrder.slice(i, last + 1),
    });
    i = last + 1;
  }

  return items;
}

// Everything a chapter's card on the shelf renders — plain strings, so a
// server render can group the whole archive and ship one small card per
// chapter instead of the posts behind it.
export type ChapterCard = {
  key: string;
  label: string;
  href: string;
  pageCount: number;
  coverImageSrc?: string;
  membersOnly: boolean;
};

type CardablePost = {
  uri: string;
  membersOnly?: boolean;
  record: NormalizedDocument;
};

/**
 * Group posts into chapters and reduce each to its card: label, the URL of its
 * first page in reading order, that page's cover, and whether any page is
 * members-only. Runs wherever the full archive already lives (the SSR page
 * query, the editor's in-memory documents) so the shelf never needs the posts
 * themselves shipped to it.
 */
export function buildChapterCards(
  posts: CardablePost[],
  publication: { uri: string; record: unknown },
): ChapterCard[] {
  return groupPostsIntoChapters(posts).map((item) => {
    const first = item.posts[0];
    const coverImage = first.record.coverImage;
    return {
      key: item.key,
      label: item.label,
      href: getDocumentURL(first.record, first.uri, publication),
      pageCount: item.posts.length,
      coverImageSrc: coverImage
        ? blobRefToSrc(coverImage.ref, new AtUri(first.uri).host, undefined, {
            width: COVER_THUMBNAIL_WIDTH.medium,
          })
        : undefined,
      membersOnly: item.posts.some((post) => !!post.membersOnly),
    };
  });
}
