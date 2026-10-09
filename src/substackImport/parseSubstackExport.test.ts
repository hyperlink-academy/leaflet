import { describe, expect, test } from "vitest";
import { strToU8, zipSync } from "fflate";
import { parseSubstackExport } from "./parseSubstackExport";
import { applySubstackMetadata } from "./substackSite";
import {
  substackLinkRewriter,
  substackPostToLeaflet,
  substackPreviewImage,
  withCdnFallback,
} from "./substackPostToLeaflet";

const HEADER =
  "post_id,post_date,is_published,email_sent_at,inbox_sent_at,type,audience,title,subtitle,podcast_url";

const zip = (files: Record<string, string>) =>
  zipSync(
    Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])),
  );

const sample = () =>
  zip({
    "posts.csv": [
      HEADER,
      `200.second-post,2026-06-06T18:10:32.091Z,true,,,newsletter,only_paid,"Second, post",a subtitle,`,
      `100.first-post,2025-03-06T10:00:00.000Z,true,,,newsletter,everyone,First post,,`,
      `300.a-draft-idea,,false,,,newsletter,everyone,,,`,
      `400.b68,,false,,,newsletter,everyone,,,`,
    ].join("\n"),
    "posts/200.second-post.html": "<p>Two</p>",
    "posts/100.first-post.html": "<p>One</p>",
    "posts/300.a-draft-idea.html": "<p>Draft</p>",
    "posts/400.b68.html": "<p></p>",
    "posts/100.first-post.opens.csv": "post_id,timestamp,email\n",
    "email_list.charliesfarts.csv": "email,created_at\na@b.co,2020-01-20\n",
  });

describe("parseSubstackExport", () => {
  test("joins posts.csv to the post bodies, oldest first", () => {
    const exp = parseSubstackExport(sample());
    expect(exp.subdomain).toBe("charliesfarts");
    expect(exp.posts.map((p) => p.slug)).toEqual([
      "first-post",
      "second-post",
      "a-draft-idea",
    ]);
    expect(exp.posts[1]).toEqual({
      id: "200",
      slug: "second-post",
      title: "Second, post",
      subtitle: "a subtitle",
      publishedAt: "2026-06-06T18:10:32.091Z",
      isPublished: true,
      audience: "only_paid",
      type: "newsletter",
      html: "<p>Two</p>",
      coverImage: null,
      tags: [],
    });
  });

  test("titles an untitled draft from its slug and leaves out empty ones", () => {
    const exp = parseSubstackExport(sample());
    expect(exp.posts[2]).toMatchObject({
      title: "A draft idea",
      isPublished: false,
      publishedAt: null,
    });
    expect(exp.emptyDrafts).toBe(1);
  });

  test("rejects a zip that isn't a Substack export", () => {
    expect(() => parseSubstackExport(zip({ "ghost.json": "{}" }))).toThrow(
      "no posts.csv",
    );
  });
});

describe("applySubstackMetadata", () => {
  test("adds covers and tags, and an excerpt only where there's no subtitle", () => {
    const { posts } = parseSubstackExport(sample());
    const meta = { coverImage: "https://img/c.png", tags: ["pivot"] };
    const merged = applySubstackMetadata(posts, {
      "100": { ...meta, description: "An excerpt" },
      "200": { ...meta, description: "An excerpt" },
    });
    expect(merged[0]).toMatchObject({ ...meta, subtitle: "An excerpt" });
    expect(merged[1]).toMatchObject({ ...meta, subtitle: "a subtitle" });
    expect(merged[2]).toBe(posts[2]);
  });
});

describe("substackPostToLeaflet", () => {
  const orderedBlockTypes = (
    facts: Array<{ entity: string; attribute: string; data: unknown }>,
  ) =>
    facts
      .filter((f) => f.attribute === "card/block")
      .map((ref) => {
        const id = (ref.data as { value: string }).value;
        const type = facts.find(
          (f) => f.entity === id && f.attribute === "block/type",
        );
        return (type?.data as { value: string }).value;
      });

  test("gates a paid post and carries the cover and metadata", async () => {
    const [, paid] = applySubstackMetadata(
      parseSubstackExport(sample()).posts,
      {
        "200": {
          coverImage:
            "https://substack-post-media.s3.amazonaws.com/public/images/c_10x10.png",
          tags: ["pivot"],
          description: "",
        },
      },
    );
    const leaflet = await substackPostToLeaflet(paid, substackPreviewImage);
    expect(orderedBlockTypes(leaflet.facts)).toEqual([
      "members-only-delimiter",
      "text",
    ]);
    expect(leaflet).toMatchObject({
      substackId: "200",
      slug: "second-post",
      title: "Second, post",
      description: "a subtitle",
      tags: ["pivot"],
      publishedAt: "2026-06-06T18:10:32.091Z",
      coverImageUrl:
        "https://substack-post-media.s3.amazonaws.com/public/images/c_10x10.png",
    });
    const cover = leaflet.facts.find((f) => f.attribute === "root/cover-image");
    const image = leaflet.facts.find(
      (f) =>
        f.attribute === "block/image" &&
        f.entity === (cover?.data as { value: string }).value,
    );
    expect((image?.data as { src: string }).src).toContain(
      "substackcdn.com/image/fetch/w_1456",
    );
  });

  test("doesn't gate a free post", async () => {
    const [free] = parseSubstackExport(sample()).posts;
    const leaflet = await substackPostToLeaflet(free, substackPreviewImage);
    expect(orderedBlockTypes(leaflet.facts)).toEqual(["text"]);
  });
});

describe("withCdnFallback", () => {
  const data = { src: "", width: 1, height: 1, fallback: "" };
  const image = (url: string) => ({
    entityID: "e",
    url,
    width: null,
    height: null,
  });
  const legacy = "https://bucketeer-e05b.s3.amazonaws.com/public/images/a.jpeg";
  const fullSize = `https://substackcdn.com/image/fetch/q_auto:best/${encodeURIComponent(legacy)}`;

  test("takes the CDN's full-size rendition when the original is unreadable", async () => {
    const tried: string[] = [];
    const resolve = withCdnFallback(async (img) => {
      tried.push(img.url);
      if (img.url === legacy) throw new Error("HTTP 403");
      return { ...data, src: img.url };
    });
    expect((await resolve(image(legacy))).src).toBe(fullSize);
    expect(tried).toEqual([legacy, fullSize]);
  });

  test("fails with the original error when the CDN was already the source", async () => {
    const resolve = withCdnFallback(async () => {
      throw new Error("HTTP 500");
    });
    await expect(resolve(image(fullSize))).rejects.toThrow("HTTP 500");
  });
});

describe("substackLinkRewriter", () => {
  const rewrite = substackLinkRewriter(
    "https://charliesfarts.substack.com",
    "https://judy.example.com/",
  );

  test("points the author's own post links at the imported posts", () => {
    expect(rewrite("https://charliesfarts.substack.com/p/a-fork#part")).toBe(
      "https://judy.example.com/a-fork#part",
    );
  });

  test("leaves everything else alone", () => {
    for (const href of [
      "https://other.substack.com/p/a-fork",
      "https://charliesfarts.substack.com/subscribe?",
      "https://charliesfarts.substack.com/p/a-fork/comments",
      "#footnote-1",
      "mailto:a@b.co",
    ])
      expect(rewrite(href)).toBe(href);
  });
});
