import { describe, expect, it } from "vitest";
import {
  buildPostsListIndex,
  readerControlledUris,
  sortPostsForList,
} from "./postsListPagination";

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
