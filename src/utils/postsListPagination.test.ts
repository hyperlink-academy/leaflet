import { describe, expect, it } from "vitest";
import {
  buildPostsListIndex,
  postMatchesTags,
  postsListFilterFromSearch,
  postsListFilterSearch,
  readerControlledUris,
  sortPostsForList,
} from "./postsListPagination";

describe("postMatchesTags", () => {
  it("matches any of the filter's tags, and everything when empty", () => {
    expect(postMatchesTags(["a", "b"], ["b", "c"])).toBe(true);
    expect(postMatchesTags(["a"], ["c"])).toBe(false);
    expect(postMatchesTags(undefined, ["c"])).toBe(false);
    expect(postMatchesTags(undefined, [])).toBe(true);
    expect(postMatchesTags(["a"], null)).toBe(true);
  });
});

describe("posts-list filter search params", () => {
  it("is empty without a filter", () => {
    expect(postsListFilterSearch(undefined)).toBe("");
    expect(postsListFilterSearch([])).toBe("");
  });

  it("writes one stable URL per tag set and reads it back", () => {
    const search = postsListFilterSearch([
      "zines, etc",
      "art & craft",
      "art & craft",
    ]);
    expect(search).toBe(postsListFilterSearch(["art & craft", "zines, etc"]));
    expect(postsListFilterFromSearch(new URLSearchParams(search))).toEqual([
      "art & craft",
      "zines, etc",
    ]);
  });

  it("ignores unrelated params", () => {
    expect(
      postsListFilterFromSearch(
        new URLSearchParams("?interactionDrawer=comments&tag=fiction"),
      ),
    ).toEqual(["fiction"]);
  });
});

const post = (uri: string, publishedAt?: string, tags?: string[]) => ({
  uri,
  record: { title: uri, publishedAt, tags },
  commentsCount: 0,
  mentionsCount: 0,
  recommendsCount: 0,
});

describe("readerControlledUris", () => {
  // The published page ships only the index when a list has reader controls,
  // so the default order must reproduce the server's list order exactly.
  it("matches sortPostsForList at the default reader state", () => {
    const posts = [
      post("at://a/3", "2026-01-03T00:00:00Z"),
      post("at://a/1", "2026-01-01T00:00:00Z"),
      post("at://a/undated"),
      post("at://a/2b", "2026-01-02T00:00:00Z"),
      post("at://a/2a", "2026-01-02T00:00:00Z"),
      post("at://a/undated2"),
    ];
    const expected = sortPostsForList(posts).map((p) => p.uri);
    expect(readerControlledUris(buildPostsListIndex(posts), {})).toEqual(
      expected,
    );
    expect(
      readerControlledUris(buildPostsListIndex(posts), {
        search: "",
        tags: null,
        sort: "latest",
      }),
    ).toEqual(expected);
  });
});
