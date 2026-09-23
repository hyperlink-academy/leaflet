import path from "path";

export type ComicFile = {
  // Path inside the archive, e.g. "chapter2/ch2_014.jpg".
  path: string;
  // "Chapter 2 - 014": the chapter first, then the page, separated the way
  // the posts list's chapter view groups titles (src/utils/chapterGrouping).
  title: string;
  chapter: number;
  // Null for a cover.
  page: number | null;
  isCover: boolean;
};

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".gif", ".webp"]);

// A chapter number is taken from the enclosing folder ("chapter3/") and, failing
// that, from the file name itself ("ch3_004", "chap3-cover"). Files with
// neither are rejected rather than guessed at, since they'd land somewhere
// arbitrary in the reading order.
function chapterOf(filePath: string, base: string): number {
  const fromDir = /chapter\s*(\d+)/i.exec(path.dirname(filePath));
  const fromName = /^ch(?:ap(?:ter)?)?\s*[-_]?\s*(\d+)/i.exec(base);
  const match = fromDir ?? fromName;
  if (!match) throw new Error(`Can't tell which chapter ${filePath} is in`);
  return Number(match[1]);
}

export function parseComicFile(filePath: string): ComicFile | null {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, path.extname(filePath));
  if (!IMAGE_EXTENSIONS.has(ext) || base.startsWith(".")) return null;
  const isCover = /cover/i.test(base);
  const pageMatch = /(\d+)\s*$/.exec(base);
  if (!isCover && !pageMatch)
    throw new Error(`${filePath} has neither a page number nor "cover"`);
  const chapter = chapterOf(filePath, base);
  return {
    path: filePath,
    title: `Chapter ${chapter} - ${isCover ? "Cover" : pageMatch![1]}`,
    chapter,
    page: isCover ? null : Number(pageMatch![1]),
    isCover,
  };
}

// Reading order: chapter by chapter, each chapter's cover first and then its
// pages by number. Non-image files are dropped.
export function planComicPosts(paths: string[]): ComicFile[] {
  const files = paths.flatMap((p) => parseComicFile(p) ?? []);
  return files.sort(
    (a, b) =>
      a.chapter - b.chapter ||
      Number(b.isCover) - Number(a.isCover) ||
      (a.page ?? 0) - (b.page ?? 0) ||
      a.title.localeCompare(b.title),
  );
}

// Posts are ordered by their published date everywhere they're listed, so
// each post is dated one minute after the one before it, ending at `end`.
export function assignPublishedAt<T>(
  posts: T[],
  end: Date,
): Array<T & { publishedAt: string }> {
  return posts.map((p, i) => ({
    ...p,
    publishedAt: new Date(
      end.getTime() - (posts.length - 1 - i) * 60_000,
    ).toISOString(),
  }));
}
