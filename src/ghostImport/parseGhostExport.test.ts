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
  updated_at: null,
  ...over,
});

const exportWith = (data: Record<string, unknown>) => ({
  db: [{ meta: { version: "6.0.0" }, data }],
});

describe("parseGhostExport", () => {
  test("rejects files without a posts table", () => {
    expect(parseGhostExport({ db: [{ data: {} }] }).ok).toBe(false);
    expect(parseGhostExport("nope").ok).toBe(false);
  });

  test("accepts the bare {data} shape", () => {
    const r = parseGhostExport({ data: { posts: [post({})] } });
    expect(r.ok && r.value.posts.map((p) => p.slug)).toEqual(["hello"]);
  });

  test("joins public tags in sort order and drops internal ones", () => {
    const r = parseGhostExport(
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
    expect(r.ok && r.value.posts[0].tags).toEqual(["cozy", "games"]);
  });

  test("classifies pages, drafts, and visibility; sorts oldest first", () => {
    const r = parseGhostExport(
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
        settings: [
          { key: "title", value: "My Blog" },
          { key: "description", value: "Words" },
        ],
      }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(r.value.posts.map((p) => p.slug)).toEqual(["a", "b"]);
    expect(r.value.posts[0]).toMatchObject({
      type: "page",
      status: "draft",
      visibility: "paid",
      publishedAt: null,
    });
    expect(r.value.site).toEqual({ title: "My Blog", description: "Words" });
    expect(r.value.counts).toMatchObject({ posts: 1, pages: 1 });
  });
});

describe("resolveGhostUrl", () => {
  test("replaces the placeholder against the site url", () => {
    expect(
      resolveGhostUrl("__GHOST_URL__/content/images/a.png", "https://x.com/"),
    ).toBe("https://x.com/content/images/a.png");
    expect(resolveGhostUrl(null, "https://x.com")).toBeNull();
  });
});

describe("ghostExcerpt", () => {
  test("prefers the custom excerpt", () => {
    const r = parseGhostExport(
      exportWith({ posts: [post({ custom_excerpt: "  Custom  " })] }),
    );
    expect(r.ok && ghostExcerpt(r.value.posts[0])).toBe("Custom");
  });

  test("falls back to the first paragraph, trimmed at a word boundary", () => {
    const r = parseGhostExport(
      exportWith({
        posts: [post({ plaintext: "first para words here\n\nsecond" })],
      }),
    );
    if (!r.ok) throw new Error(r.error);
    expect(ghostExcerpt(r.value.posts[0])).toBe("first para words here");
    expect(ghostExcerpt(r.value.posts[0], 12)).toBe("first para…");
  });
});
