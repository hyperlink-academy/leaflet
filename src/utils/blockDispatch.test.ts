import { describe, expect, test } from "vitest";
import { schemaDict } from "lexicons/api/lexicons";
import { BlockLexicons } from "lexicons/src/blocks";
import { PubLeafletRichTextFacet } from "lexicons/src/facet";
import { matchBlock } from "./blockDispatch";
import { extractFacetFeatures } from "./facetFeatures";

// BlockTypeMap and FacetFeatureTypes derive from the generated types in
// lexicons/api, which lexgen produces from lexicons/src. These tests compare
// the generated runtime schemas back to the source, so editing lexicons/src
// without running `npm run lexgen` fails here instead of silently leaving
// every dispatch type — and every surface compiled against it — stale.

const generatedBlockIds = (
  (schemaDict.PubLeafletPagesLinearDocument.defs.block.properties.block as any)
    .refs as string[]
).map((r) => r.replace(/^lex:/, ""));

test("generated block union matches BlockLexicons in lexicons/src", () => {
  const srcIds = BlockLexicons.map((l) => l.id);
  expect([...generatedBlockIds].sort()).toEqual([...srcIds].sort());
});

test("generated facet feature union matches lexicons/src", () => {
  const generated = (
    (
      schemaDict.PubLeafletRichtextFacet.defs.main.properties.features
        .items as any
    ).refs as string[]
  ).map((r) => r.split("#")[1]);
  const srcKeys = (
    (PubLeafletRichTextFacet.defs.main as any).properties.features.items
      .refs as string[]
  ).map((r) => r.replace(/^#/, ""));
  expect([...generated].sort()).toEqual([...srcKeys].sort());
});

describe("matchBlock", () => {
  const handlers = Object.fromEntries(
    generatedBlockIds.map((t) => [t, () => t]),
  ) as any;

  test("dispatches on the exact $type", () => {
    expect(
      matchBlock(
        { $type: "pub.leaflet.blocks.text" },
        handlers,
        () => "unknown",
      ),
    ).toBe("pub.leaflet.blocks.text");
  });

  test("routes Object.prototype key names to the fallback", () => {
    // $type is authored by other apps' records; inherited keys must not
    // resolve to Object.prototype members (old switch behavior: fall through).
    for (const $type of [
      "toString",
      "constructor",
      "hasOwnProperty",
      "valueOf",
      "__proto__",
    ]) {
      expect(matchBlock({ $type }, handlers, () => "unknown")).toBe("unknown");
    }
  });

  test("routes unknown and #main-suffixed types to the fallback", () => {
    // is$typed(v, id, "main") matches the bare NSID only; the dispatcher must
    // not be more lenient than the isMain guards it replaced.
    expect(
      matchBlock({ $type: "some.other.app.block" }, handlers, () => "unknown"),
    ).toBe("unknown");
    expect(
      matchBlock(
        { $type: "pub.leaflet.blocks.text#main" },
        handlers,
        () => "unknown",
      ),
    ).toBe("unknown");
  });
});

describe("extractFacetFeatures", () => {
  test("picks the first feature of each kind", () => {
    const features = extractFacetFeatures([
      { $type: "pub.leaflet.richtext.facet#bold" },
      { $type: "pub.leaflet.richtext.facet#link", uri: "https://a.test" },
      { $type: "pub.leaflet.richtext.facet#link", uri: "https://b.test" },
    ] as any);
    expect(features.bold).toBeDefined();
    expect((features.link as any)?.uri).toBe("https://a.test");
    expect(features.italic).toBeUndefined();
  });

  test("handles undefined input", () => {
    expect(extractFacetFeatures(undefined)).toEqual({
      link: undefined,
      didMention: undefined,
      atMention: undefined,
      code: undefined,
      highlight: undefined,
      underline: undefined,
      strikethrough: undefined,
      id: undefined,
      bold: undefined,
      italic: undefined,
      footnote: undefined,
    });
  });
});
