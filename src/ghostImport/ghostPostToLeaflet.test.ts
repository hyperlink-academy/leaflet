import { describe, expect, test } from "vitest";
import {
  ghostPostToLeaflet,
  ghostPostToPage,
  previewImage,
} from "./ghostPostToLeaflet";
import type { GhostPost } from "./parseGhostExport";

const post = (over: Partial<GhostPost>): GhostPost => ({
  id: "p1",
  slug: "hello",
  title: "Hello",
  type: "post",
  status: "published",
  visibility: "public",
  html: "<p>Hi</p>",
  plaintext: "Hi",
  featureImage: null,
  customExcerpt: null,
  publishedAt: "2026-01-02T00:00:00.000Z",
  createdAt: "2026-01-01T00:00:00.000Z",
  tags: [],
  ...over,
});

const orderedBlockTypes = (
  facts: Array<{ entity: string; attribute: string; data: unknown }>,
) =>
  facts
    .filter((f) => f.attribute === "card/block")
    .map((f) => f.data as { value: string; position: string })
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map(
      (ref) =>
        (
          facts.find(
            (f) => f.entity === ref.value && f.attribute === "block/type",
          )?.data as { value: string }
        ).value,
    );

const blockTypes = async (p: GhostPost) =>
  orderedBlockTypes(
    (await ghostPostToLeaflet(p, "https://s.com", previewImage)).facts,
  );

const value = (
  facts: Array<{ entity: string; attribute: string; data: unknown }>,
  entity: string,
  attribute: string,
) =>
  (
    facts.find((f) => f.entity === entity && f.attribute === attribute)
      ?.data as { value: unknown } | undefined
  )?.value;

describe("ghostPostToLeaflet", () => {
  test("gates the whole of a members-only post", async () => {
    expect(await blockTypes(post({ visibility: "paid" }))).toEqual([
      "members-only-delimiter",
      "text",
    ]);
  });

  test("keeps the public preview above a paywall card", async () => {
    expect(
      await blockTypes(
        post({
          visibility: "paid",
          html: "<p>free</p><!--members-only--><p>paid</p>",
        }),
      ),
    ).toEqual(["text", "members-only-delimiter", "text"]);
  });

  test("leaves public posts ungated", async () => {
    expect(await blockTypes(post({}))).toEqual(["text"]);
  });

  test("uses a post's feature image as the cover", async () => {
    const leaflet = await ghostPostToLeaflet(
      post({ featureImage: "__GHOST_URL__/content/images/cover.png" }),
      "https://s.com",
      previewImage,
    );
    expect(leaflet.coverImageUrl).toBe(
      "https://s.com/content/images/cover.png",
    );
    const cover = value(
      leaflet.facts,
      leaflet.rootEntityId,
      "root/cover-image",
    );
    expect(typeof cover).toBe("string");
    expect(orderedBlockTypes(leaflet.facts)).toEqual(["text"]);
    expect(leaflet.facts.every((f) => f.attribute !== "page/route")).toBe(true);
  });
});

describe("ghostPostToPage", () => {
  test("makes a Ghost page a nav page at its slug", async () => {
    const page = await ghostPostToPage(
      post({ type: "page", slug: "about", title: "About" }),
      "https://s.com",
      previewImage,
    );
    expect(page.route).toBe("/about");
    expect(value(page.facts, page.pageId, "page/type")).toBe("doc");
    expect(value(page.facts, page.pageId, "page/route")).toBe("/about");
    expect(value(page.facts, page.pageId, "page/title")).toBe("About");
    expect(page.coverImage).toBeNull();
    expect(page.entities).toContain(page.pageId);
  });

  test("never gates a page", async () => {
    const page = await ghostPostToPage(
      post({ type: "page", visibility: "paid" }),
      "https://s.com",
      previewImage,
    );
    expect(orderedBlockTypes(page.facts)).toEqual(["text"]);
  });

  test("puts a page's feature image first as an image block", async () => {
    const page = await ghostPostToPage(
      post({
        type: "page",
        featureImage: "__GHOST_URL__/content/images/hero.png",
      }),
      "https://s.com",
      previewImage,
    );
    expect(orderedBlockTypes(page.facts)).toEqual(["image", "text"]);
    expect(page.coverImage).toBeNull();
    expect(page.imageCount).toBe(1);
    const image = page.facts.find((f) => f.attribute === "block/image");
    expect((image?.data as { src: string }).src).toBe(
      "https://s.com/content/images/hero.png",
    );
  });
});
