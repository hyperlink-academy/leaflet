import { describe, expect, test } from "vitest";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { YJSFragmentToString } from "src/utils/yjsFragmentToString";
import { comicPostToLeaflet } from "./comicPostToLeaflet";

const image = {
  src: "https://x/y.jpg",
  width: 800,
  height: 1200,
  fallback: "",
};
const footer = "Nowhere © Someone. No AI. Contact a[@]b.c";

const textOf = (value: string) => {
  const ydoc = new Y.Doc();
  Y.applyUpdate(ydoc, base64.toByteArray(value));
  return YJSFragmentToString(ydoc.getXmlElement("prosemirror"));
};

describe("comicPostToLeaflet", () => {
  test("builds image, blank line, small footer in order", () => {
    const leaflet = comicPostToLeaflet({ image, isCover: false, footer });
    const pageId = leaflet.facts.find((f) => f.attribute === "root/page")!
      .data as { value: string };
    const blocks = leaflet.facts
      .filter((f) => f.entity === pageId.value && f.attribute === "card/block")
      .sort((a, b) =>
        (a.data as { position: string }).position.localeCompare(
          (b.data as { position: string }).position,
        ),
      )
      .map((f) => (f.data as { value: string }).value);
    expect(blocks).toHaveLength(3);
    const type = (id: string) =>
      (
        leaflet.facts.find(
          (f) => f.entity === id && f.attribute === "block/type",
        )!.data as { value: string }
      ).value;
    expect(blocks.map(type)).toEqual(["image", "text", "text"]);
    expect(
      leaflet.facts.find(
        (f) => f.entity === blocks[0] && f.attribute === "block/image",
      )!.data,
    ).toEqual({ type: "image", ...image });
    expect(
      leaflet.facts.some(
        (f) => f.entity === blocks[1] && f.attribute === "block/text",
      ),
    ).toBe(false);
    const footerFacts = leaflet.facts.filter((f) => f.entity === blocks[2]);
    expect(
      footerFacts.find((f) => f.attribute === "block/text-size")!.data,
    ).toEqual({
      type: "text-size-union",
      value: "small",
    });
    expect(
      textOf(
        (
          footerFacts.find((f) => f.attribute === "block/text")!.data as {
            value: string;
          }
        ).value,
      ),
    ).toBe(footer);
    expect(leaflet.facts.some((f) => f.attribute === "root/cover-image")).toBe(
      false,
    );
    for (const f of leaflet.facts) expect(leaflet.entities).toContain(f.entity);
  });

  test("a cover post gets a cover entity sharing the image", () => {
    const leaflet = comicPostToLeaflet({ image, isCover: true, footer });
    const cover = leaflet.facts.find(
      (f) => f.attribute === "root/cover-image",
    )!;
    expect(cover.entity).toBe(leaflet.rootEntityId);
    const coverId = (cover.data as { value: string }).value;
    expect(leaflet.entities).toContain(coverId);
    expect(
      leaflet.facts.find(
        (f) => f.entity === coverId && f.attribute === "block/image",
      )!.data,
    ).toEqual({ type: "image", ...image });
  });
});
