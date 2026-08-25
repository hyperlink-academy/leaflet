import { describe, expect, test } from "vitest";
import { ghostPostToLeaflet, previewImage } from "./ghostPostToLeaflet";
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

const blockTypes = async (p: GhostPost) => {
  const leaflet = await ghostPostToLeaflet(p, "https://s.com", previewImage);
  const order = leaflet.facts
    .filter((f) => f.attribute === "card/block")
    .map((f) => f.data as { value: string; position: string })
    .sort((a, b) => (a.position < b.position ? -1 : 1))
    .map((f) => f.value);
  return order.map(
    (entity) =>
      (
        leaflet.facts.find(
          (f) => f.entity === entity && f.attribute === "block/type",
        )?.data as { value: string }
      ).value,
  );
};

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
});
