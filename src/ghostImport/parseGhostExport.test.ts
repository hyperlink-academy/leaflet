import { describe, expect, test } from "vitest";
import {
  ghostExcerpt,
  parseGhostExport,
  resolveGhostUrl,
} from "./parseGhostExport";

const post = (over: Record<string, unknown>) => ({
  id: "p1",
  slug: "hello",
  title: "Hello",
  type: "post",
  status: "published",
  visibility: "public",
  html: "<p>Hi</p>",
  plaintext: "Hi",
  feature_image: null,
  custom_excerpt: null,
  published_at: "2026-01-02T00:00:00.000Z",
  created_at: "2026-01-01T00:00:00.000Z",
  ...over,
});

const exportWith = (data: Record<string, unknown>) => ({
  db: [
    { meta: { version: "6.0.0" }, data: { tags: [], posts_tags: [], ...data } },
  ],
});

describe("parseGhostExport", () => {
  test("throws on anything but the full export shape", () => {
    expect(() => parseGhostExport({ db: [{ data: {} }] })).toThrow(/table/);
    expect(() => parseGhostExport({ data: { posts: [] } })).toThrow();
    expect(() => parseGhostExport("nope")).toThrow();
  });

  test("throws on a post missing a required field", () => {
    expect(() =>
      parseGhostExport(exportWith({ posts: [post({ slug: null })] })),
    ).toThrow(/slug/);
  });

  test("joins public tags in sort order and drops internal ones", () => {
    const posts = parseGhostExport(
      exportWith({
        posts: [post({})],
        tags: [
          { id: "t1", name: "games", visibility: "public" },
          { id: "t2", name: "#internal", visibility: "internal" },
          { id: "t3", name: "cozy", visibility: "public" },
        ],
        posts_tags: [
          { post_id: "p1", tag_id: "t3", sort_order: 0 },
          { post_id: "p1", tag_id: "t2", sort_order: 1 },
          { post_id: "p1", tag_id: "t1", sort_order: 2 },
        ],
      }),
    );
    expect(posts[0].tags).toEqual(["cozy", "games"]);
  });

  test("keeps pages, drafts, and visibility; sorts oldest first", () => {
    const posts = parseGhostExport(
      exportWith({
        posts: [
          post({
            id: "b",
            slug: "b",
            published_at: "2026-03-01T00:00:00.000Z",
          }),
          post({
            id: "a",
            slug: "a",
            type: "page",
            status: "draft",
            visibility: "paid",
            published_at: null,
            created_at: "2026-02-01T00:00:00.000Z",
          }),
        ],
      }),
    );
    expect(posts.map((p) => p.slug)).toEqual(["a", "b"]);
    expect(posts[0]).toMatchObject({
      type: "page",
      status: "draft",
      visibility: "paid",
      publishedAt: null,
    });
  });
});

describe("resolveGhostUrl", () => {
  test("replaces the placeholder against the site url", () => {
    expect(
      resolveGhostUrl("__GHOST_URL__/content/images/a.png", "https://x.com/"),
    ).toBe("https://x.com/content/images/a.png");
  });
});

describe("ghostExcerpt", () => {
  test("prefers the custom excerpt", () => {
    const [p] = parseGhostExport(
      exportWith({ posts: [post({ custom_excerpt: "  Custom  " })] }),
    );
    expect(ghostExcerpt(p)).toBe("Custom");
  });

  test("falls back to the first paragraph, trimmed at a word boundary", () => {
    const [p] = parseGhostExport(
      exportWith({
        posts: [post({ plaintext: "first para words here\n\nsecond" })],
      }),
    );
    expect(ghostExcerpt(p)).toBe("first para words here");
    expect(ghostExcerpt(p, 12)).toBe("first para…");
  });
});
