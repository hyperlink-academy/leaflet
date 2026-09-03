import { describe, expect, test } from "vitest";
import {
  adjacentPosts,
  sortPostsForPrevNext,
  type PrevNextCandidate,
} from "src/utils/prevNextPosts";

const post = (
  n: number,
  extra: Partial<Omit<PrevNextCandidate, "uri">> = {},
): PrevNextCandidate & { uri: string } => ({
  uri: `at://did:plc:x/pub.leaflet.document/${n}`,
  sort_date: `2026-01-0${n}T00:00:00Z`,
  title: `Post ${n}`,
  publishedAt: `2026-01-0${n}T00:00:00Z`,
  ...extra,
});

describe("sortPostsForPrevNext", () => {
  test("orders oldest first and drops unpublished or untitled posts", () => {
    const sorted = sortPostsForPrevNext([
      post(3),
      post(1),
      post(2, { title: null }),
      post(4, { publishedAt: null }),
    ]);
    expect(sorted.map((d) => d.uri)).toEqual([post(1).uri, post(3).uri]);
  });
});

describe("adjacentPosts", () => {
  const sorted = sortPostsForPrevNext([post(1), post(2), post(3), post(4)]);

  test("index neighbours for a post still in the run", () => {
    const { prev, next, atEdge } = adjacentPosts(sorted, post(2));
    expect(prev?.uri).toBe(post(1).uri);
    expect(next?.uri).toBe(post(3).uri);
    expect(atEdge).toBe(false);
  });

  test("edges have one neighbour and report atEdge", () => {
    expect(adjacentPosts(sorted, post(1))).toMatchObject({
      prev: undefined,
      next: { uri: post(2).uri },
      atEdge: true,
    });
    expect(adjacentPosts(sorted, post(4))).toMatchObject({
      prev: { uri: post(3).uri },
      next: undefined,
      atEdge: true,
    });
  });

  test("a deleted post resolves to the posts that bracketed its sort_date", () => {
    const remaining = sortPostsForPrevNext([post(1), post(2), post(4)]);
    expect(adjacentPosts(remaining, post(3))).toMatchObject({
      prev: { uri: post(2).uri },
      next: { uri: post(4).uri },
      atEdge: false,
    });
    expect(adjacentPosts(remaining, post(5))).toMatchObject({
      prev: { uri: post(4).uri },
      next: undefined,
      atEdge: true,
    });
    expect(
      adjacentPosts(remaining, {
        uri: "at://gone",
        sort_date: "2025-12-31T00:00:00Z",
      }),
    ).toMatchObject({
      prev: undefined,
      next: { uri: post(1).uri },
      atEdge: true,
    });
  });

  test("an unknown sort_date sorts to the start", () => {
    expect(
      adjacentPosts(sorted, { uri: "at://gone", sort_date: null }),
    ).toMatchObject({ prev: undefined, next: { uri: post(1).uri } });
  });
});
