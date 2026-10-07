import { UnicodeString } from "@atproto/api";
import { Mark, Node } from "prosemirror-model";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { multiBlockSchema } from "components/Blocks/TextBlock/schema";
import { RichText } from "app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/TextBlockCore";

export type FacetedText = {
  plaintext: string;
  facets: PubLeafletRichtextFacet.Main[];
};

export function docToFacetedText(doc: Node): FacetedText {
  let plaintext = "";
  let facets: PubLeafletRichtextFacet.Main[] = [];
  let byteOffset = 0;

  doc.forEach((paragraph) => {
    if (paragraph.type.name !== "paragraph") return;

    paragraph.forEach((node) => {
      if (node.isText) {
        const text = node.text || "";
        const unicodeString = new UnicodeString(text);
        if (node.marks.length > 0) {
          const facet: PubLeafletRichtextFacet.Main = {
            index: {
              byteStart: byteOffset,
              byteEnd: byteOffset + unicodeString.length,
            },
            features: marksToFeatures(node.marks),
          };
          if (facet.features.length > 0) facets.push(facet);
        }
        plaintext += text;
        byteOffset += unicodeString.length;
      } else if (node.type.name === "didMention") {
        const text = node.attrs.text || "";
        const unicodeString = new UnicodeString(text);
        facets.push({
          index: {
            byteStart: byteOffset,
            byteEnd: byteOffset + unicodeString.length,
          },
          features: [
            {
              $type: "pub.leaflet.richtext.facet#didMention",
              did: node.attrs.did,
            },
          ],
        });
        plaintext += text;
        byteOffset += unicodeString.length;
      } else if (node.type.name === "atMention") {
        const text = node.attrs.text || "";
        const unicodeString = new UnicodeString(text);
        facets.push({
          index: {
            byteStart: byteOffset,
            byteEnd: byteOffset + unicodeString.length,
          },
          features: [
            {
              $type: "pub.leaflet.richtext.facet#atMention",
              atURI: node.attrs.atURI,
            },
          ],
        });
        plaintext += text;
        byteOffset += unicodeString.length;
      }
    });

    if (paragraph !== doc.lastChild) {
      const newline = "\n";
      plaintext += newline;
      byteOffset += new UnicodeString(newline).length;
    }
  });

  return { plaintext, facets };
}

// Inverse of docToFacetedText: rebuilds the editor document from a published
// record so it can be edited.
export function facetedTextToDoc(
  plaintext: string,
  facets: PubLeafletRichtextFacet.Main[],
): Node {
  let paragraphs: Node[][] = [[]];
  for (let segment of new RichText({ text: plaintext, facets }).segments()) {
    let features = segment.facet ?? [];
    let didMention = features.find(PubLeafletRichtextFacet.isDidMention);
    let atMention = features.find(PubLeafletRichtextFacet.isAtMention);
    if (didMention) {
      paragraphs[paragraphs.length - 1].push(
        multiBlockSchema.nodes.didMention.create({
          did: didMention.did,
          text: segment.text,
        }),
      );
      continue;
    }
    if (atMention) {
      paragraphs[paragraphs.length - 1].push(
        multiBlockSchema.nodes.atMention.create({
          atURI: atMention.atURI,
          text: segment.text,
        }),
      );
      continue;
    }
    let marks = featuresToMarks(features);
    segment.text.split("\n").forEach((line, i) => {
      if (i > 0) paragraphs.push([]);
      if (line)
        paragraphs[paragraphs.length - 1].push(
          multiBlockSchema.text(line, marks),
        );
    });
  }
  return multiBlockSchema.nodes.doc.create(
    null,
    paragraphs.map((inline) =>
      multiBlockSchema.nodes.paragraph.create(null, inline),
    ),
  );
}

function featuresToMarks(
  features: PubLeafletRichtextFacet.Main["features"],
): Mark[] {
  let marks: Mark[] = [];
  for (let feature of features) {
    if (PubLeafletRichtextFacet.isBold(feature))
      marks.push(multiBlockSchema.marks.strong.create());
    else if (PubLeafletRichtextFacet.isItalic(feature))
      marks.push(multiBlockSchema.marks.em.create());
    else if (PubLeafletRichtextFacet.isUnderline(feature))
      marks.push(multiBlockSchema.marks.underline.create());
    else if (PubLeafletRichtextFacet.isStrikethrough(feature))
      marks.push(multiBlockSchema.marks.strikethrough.create());
    else if (PubLeafletRichtextFacet.isCode(feature))
      marks.push(multiBlockSchema.marks.code.create());
    else if (PubLeafletRichtextFacet.isHighlight(feature))
      marks.push(multiBlockSchema.marks.highlight.create());
    else if (PubLeafletRichtextFacet.isLink(feature))
      marks.push(multiBlockSchema.marks.link.create({ href: feature.uri }));
  }
  return marks;
}

function marksToFeatures(marks: readonly Mark[]) {
  const features: PubLeafletRichtextFacet.Main["features"] = [];
  for (const mark of marks) {
    switch (mark.type.name) {
      case "strong":
        features.push({ $type: "pub.leaflet.richtext.facet#bold" });
        break;
      case "em":
        features.push({ $type: "pub.leaflet.richtext.facet#italic" });
        break;
      case "underline":
        features.push({ $type: "pub.leaflet.richtext.facet#underline" });
        break;
      case "strikethrough":
        features.push({ $type: "pub.leaflet.richtext.facet#strikethrough" });
        break;
      case "code":
        features.push({ $type: "pub.leaflet.richtext.facet#code" });
        break;
      case "highlight":
        features.push({ $type: "pub.leaflet.richtext.facet#highlight" });
        break;
      case "link":
        features.push({
          $type: "pub.leaflet.richtext.facet#link",
          uri: mark.attrs.href as string,
        });
        break;
    }
  }
  return features;
}
