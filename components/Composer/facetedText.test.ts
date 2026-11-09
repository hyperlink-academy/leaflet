import { describe, expect, it } from "vitest";
import { multiBlockSchema as s } from "components/Blocks/TextBlock/schema";
import { docToFacetedText } from "./facetedText";

const bold = { $type: "pub.leaflet.richtext.facet#bold" };

// "héllo" (é is two bytes) / "a **b**" / "" / "😀 **c**" (😀 is four bytes)
const doc = s.nodes.doc.create(null, [
  s.nodes.paragraph.create(null, [s.text("héllo")]),
  s.nodes.paragraph.create(null, [
    s.text("a "),
    s.text("b", [s.marks.strong.create()]),
  ]),
  s.nodes.paragraph.create(),
  s.nodes.paragraph.create(null, [
    s.text("😀 "),
    s.text("c", [s.marks.strong.create()]),
  ]),
]);

describe("docToFacetedText", () => {
  it("joins paragraphs with newlines and offsets facets by bytes", () => {
    expect(docToFacetedText(doc)).toEqual({
      plaintext: "héllo\na b\n\n😀 c",
      facets: [
        { index: { byteStart: 9, byteEnd: 10 }, features: [bold] },
        { index: { byteStart: 17, byteEnd: 18 }, features: [bold] },
      ],
    });
  });
});
