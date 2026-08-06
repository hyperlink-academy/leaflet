// Reading chapters out of post titles.
//
// A publication that posts one page per document — a comic, a serialised story
// — names its pages in a run: `chapter 1 - 001`, `chapter 1 - 002`, `FITV #2,
// Pg. 7`. Its archive then reads as dozens of near-identical rows when what a
// reader wants to browse is chapters. Chapter view collapses those pages back
// into the chapters they came from and shows the art instead.
//
// Two things make that readable without a vocabulary of chapter words, which
// there is no writing — `#`, `chapter`, `Ch.`, `Episode`, `Capítulo` are all
// the same idea. Posts go up in reading order, so a chapter is always a *run*
// of consecutive posts and only neighbours need comparing. And whatever a
// publication calls its chapters, the pages of one share a prefix that ends at
// a space or a punctuation mark — the next chapter is where that shared prefix
// gets shorter.

// A space or special character: whitespace and the punctuation people separate
// title parts with. Everything else — letters in any script, digits, CJK —
// reads as part of a word.
const SEPARATOR = /[\s_\-–—#.,:;!?()[\]{}<>'"“”‘’/\\|~*+=&%$@^`]/;

// End of string counts: a title that stops exactly where its neighbour carries
// on has still finished a whole word.
function isSeparatorAt(title: string, index: number) {
  return index >= title.length || SEPARATOR.test(title[index]);
}

function trimSeparators(text: string) {
  let end = text.length;
  while (end > 0 && SEPARATOR.test(text[end - 1])) end--;
  return text.slice(0, end);
}

/**
 * The chapter two neighbouring titles share, or null when they aren't in one.
 *
 * Their common prefix is cut back to the last point where *both* carry on with
 * a separator: `chapter 1 - 001` and `chapter 1 - 002` agree as far as
 * `chapter 1 - 00`, but stopping there would cut the page number in half, so
 * this gives `chapter 1`. Case is ignored, since a publication that wrote
 * `Chapter 1` once and `chapter 2` the next time still means one convention.
 */
function sharedChapter(a: string, b: string): string | null {
  let length = 0;
  while (
    length < a.length &&
    length < b.length &&
    a[length].toLowerCase() === b[length].toLowerCase()
  )
    length++;

  for (; length > 0; length--) {
    if (!isSeparatorAt(a, length) || !isSeparatorAt(b, length)) continue;
    return trimSeparators(a.slice(0, length)) || null;
  }
  return null;
}

/**
 * Whether a shared prefix is still the same chapter as `prefix`.
 *
 * Agreeing *further* is not a new chapter — two pages of one chapter agree past
 * it (`…, Pg. 1` / `…, Pg. 2`) where the chapter's own cover did not. The
 * separator check is what keeps `Chapter 10` from reading as more of
 * `Chapter 1`.
 */
function extendsChapter(shared: string, prefix: string) {
  const s = shared.toLowerCase();
  const p = prefix.toLowerCase();
  if (s === p) return true;
  return s.startsWith(p) && SEPARATOR.test(shared[prefix.length]);
}

export type ChapterListItem<T> = {
  key: string;
  /** The chapter's name, or the post's own title when it stands alone. */
  label: string;
  /** In reading order — index 0 is the page opening the item lands on. */
  posts: T[];
  isChapter: boolean;
};

type ChapterablePost = {
  uri: string;
  record: { title?: string; publishedAt?: string };
};

/**
 * Collapse the posts whose titles follow the archive's own chapter convention
 * into one item per chapter, leaving every other post an item of its own.
 *
 * Items come back newest-first, the order every other view shows. Pages within
 * a chapter stay in reading order, which is what makes `posts[0]` the page a
 * card opens on.
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

  const items: ChapterListItem<T>[] = [];
  let i = 0;
  while (i < inOrder.length) {
    const prefix =
      i + 1 < inOrder.length
        ? sharedChapter(titleOf(inOrder[i]), titleOf(inOrder[i + 1]))
        : null;

    if (!prefix) {
      items.push({
        key: inOrder[i].uri,
        label: titleOf(inOrder[i]),
        posts: [inOrder[i]],
        isChapter: false,
      });
      i++;
      continue;
    }

    const chapterPosts = [inOrder[i], inOrder[i + 1]];
    let last = i + 1;
    while (last + 1 < inOrder.length) {
      const shared = sharedChapter(
        titleOf(inOrder[last]),
        titleOf(inOrder[last + 1]),
      );
      if (!shared || !extendsChapter(shared, prefix)) break;
      chapterPosts.push(inOrder[last + 1]);
      last++;
    }

    items.push({
      // Two runs could carry the same name (a chapter posted in two sittings),
      // so where the run started is part of its identity.
      key: `${prefix.toLowerCase()}|${inOrder[i].uri}`,
      label: prefix.charAt(0).toUpperCase() + prefix.slice(1),
      posts: chapterPosts,
      isChapter: true,
    });
    i = last + 1;
  }

  return items.reverse();
}
