import { UnicodeString } from "@atproto/api";
import { PubLeafletRichtextFacet } from "lexicons/api";

type Facet = PubLeafletRichtextFacet.Main;
export function BaseTextBlock(props: {
  plaintext: string;
  facets?: Facet[];
  index: number[];
  preview?: boolean;
}) {
  let children = [];
  let richText = new RichText({
    text: props.plaintext,
    facets: props.facets || [],
  });
  let counter = 0;
  for (const segment of richText.segments()) {
    let id = segment.facet?.find(PubLeafletRichtextFacet.isId);
    let link = segment.facet?.find(PubLeafletRichtextFacet.isLink);
    let isBold = segment.facet?.find(PubLeafletRichtextFacet.isBold);
    let isCode = segment.facet?.find(PubLeafletRichtextFacet.isCode);
    let isStrikethrough = segment.facet?.find(
      PubLeafletRichtextFacet.isStrikethrough,
    );
    let isDidMention = segment.facet?.find(
      PubLeafletRichtextFacet.isDidMention,
    );
    let isUnderline = segment.facet?.find(PubLeafletRichtextFacet.isUnderline);
    let isItalic = segment.facet?.find(PubLeafletRichtextFacet.isItalic);
    let isHighlighted = segment.facet?.find(
      PubLeafletRichtextFacet.isHighlight,
    );
    let className = `
      ${isCode ? "inline-code" : ""}
      ${id ? "scroll-mt-12 scroll-mb-10" : ""}
      ${isBold ? "font-bold" : ""}
      ${isItalic ? "italic" : ""}
      ${isUnderline ? "underline" : ""}
      ${isStrikethrough ? "line-through decoration-tertiary" : ""}
      ${isHighlighted ? "highlight bg-highlight-1" : ""}`.replaceAll("\n", " ");

    // Split text by newlines and insert <br> tags
    const textParts = segment.text.split('\n');
    const renderedText = textParts.flatMap((part, i) =>
      i < textParts.length - 1 ? [part, <br key={`br-${counter}-${i}`} />] : [part]
    );

    if (isCode) {
      children.push(
        <code key={counter} className={className} id={id?.id}>
          {renderedText}
        </code>,
      );
    } else if (link) {
      children.push(
        <a
          key={counter}
          href={link.uri}
          className={`text-accent-contrast hover:underline ${className}`}
          target="_blank"
        >
          {renderedText}
        </a>,
      );
    } else {
      children.push(
        <span key={counter} className={className} id={id?.id}>
          {renderedText}
        </span>,
      );
    }

    counter++;
  }
  return <>{children}</>;
}

type RichTextSegment = {
  text: string;
  facet?: Exclude<Facet["features"], { $type: string }>;
};

export class RichText {
  unicodeText: UnicodeString;
  facets?: Facet[];

  constructor(props: { text: string; facets: Facet[] }) {
    this.unicodeText = new UnicodeString(props.text);
    this.facets = props.facets;
    if (this.facets) {
      this.facets = this.facets
        .filter((facet) => facet.index.byteStart <= facet.index.byteEnd)
        .sort((a, b) => a.index.byteStart - b.index.byteStart);
    }
  }

  *segments(): Generator<RichTextSegment, void, void> {
    const facets = this.facets || [];
    if (!facets.length) {
      yield { text: this.unicodeText.utf16 };
      return;
    }

    let textCursor = 0;
    let facetCursor = 0;
    do {
      const currFacet = facets[facetCursor];
      if (textCursor < currFacet.index.byteStart) {
        yield {
          text: this.unicodeText.slice(textCursor, currFacet.index.byteStart),
        };
      } else if (textCursor > currFacet.index.byteStart) {
        facetCursor++;
        continue;
      }
      if (currFacet.index.byteStart < currFacet.index.byteEnd) {
        const subtext = this.unicodeText.slice(
          currFacet.index.byteStart,
          currFacet.index.byteEnd,
        );
        if (!subtext.trim()) {
          // dont empty string entities
          yield { text: subtext };
        } else {
          yield { text: subtext, facet: currFacet.features };
        }
      }
      textCursor = currFacet.index.byteEnd;
      facetCursor++;
    } while (facetCursor < facets.length);
    if (textCursor < this.unicodeText.length) {
      yield {
        text: this.unicodeText.slice(textCursor, this.unicodeText.length),
      };
    }
  }
}
function addFacet(facets: Facet[], newFacet: Facet, length: number) {
  if (facets.length === 0) {
    return [newFacet];
  }

  const allFacets = [...facets, newFacet];

  // Collect all boundary positions
  const boundaries = new Set<number>();
  boundaries.add(0);
  boundaries.add(length);

  for (const facet of allFacets) {
    boundaries.add(facet.index.byteStart);
    boundaries.add(facet.index.byteEnd);
  }

  const sortedBoundaries = Array.from(boundaries).sort((a, b) => a - b);
  const result: Facet[] = [];

  // Process segments between consecutive boundaries
  for (let i = 0; i < sortedBoundaries.length - 1; i++) {
    const start = sortedBoundaries[i];
    const end = sortedBoundaries[i + 1];

    // Find facets that are active at the start position
    const activeFacets = allFacets.filter(
      (facet) => facet.index.byteStart <= start && facet.index.byteEnd > start,
    );

    // Only create facet if there are active facets (features present)
    if (activeFacets.length > 0) {
      const features = activeFacets.flatMap((f) => f.features);
      result.push({
        index: { byteStart: start, byteEnd: end },
        features,
      });
    }
  }

  return result;
}
