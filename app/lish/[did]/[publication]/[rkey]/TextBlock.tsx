"use client";
import { UnicodeString } from "@atproto/api";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { useMemo } from "react";
import { useHighlight } from "./useHighlight";

type Facet = PubLeafletRichtextFacet.Main;
export function TextBlock(props: {
  plaintext: string;
  facets?: Facet[];
  index: number[];
  preview?: boolean;
}) {
  let children = [];
  let highlights = useHighlight(props.index);
  let richText = useMemo(() => {
    let facets = [...(props.facets || [])];
    if (!props.preview) {
      for (let highlight of highlights) {
        facets.push({
          $type: "pub.leaflet.richtext.facet",
          index: {
            byteStart: highlight.startOffset
              ? new UnicodeString(
                  props.plaintext.slice(0, highlight.startOffset),
                ).length
              : 0,
            byteEnd: new UnicodeString(
              props.plaintext.slice(0, highlight.endOffset || undefined),
            ).length,
          },
          features: [
            { $type: "pub.leaflet.richtext.facet#highlight" },
            {
              $type: "pub.leaflet.richtext.facet#id",
              id: `${props.index.join(".")}_${highlight.startOffset}`,
            },
          ],
        });
      }
    }
    return new RichText({ text: props.plaintext, facets });
  }, [props.plaintext, props.facets, highlights, props.preview]);
  let counter = 0;
  for (const segment of richText.segments()) {
    let id = segment.facet?.find(PubLeafletRichtextFacet.isId);
    let link = segment.facet?.find(PubLeafletRichtextFacet.isLink);
    let isBold = segment.facet?.find(PubLeafletRichtextFacet.isBold);
    let isStrikethrough = segment.facet?.find(
      PubLeafletRichtextFacet.isStrikethrough,
    );
    let isUnderline = segment.facet?.find(PubLeafletRichtextFacet.isUnderline);
    let isItalic = segment.facet?.find(PubLeafletRichtextFacet.isItalic);
    let isHighlighted = segment.facet?.find(
      PubLeafletRichtextFacet.isHighlight,
    );
    let className = `
      ${id ? "scroll-mt-12 scroll-mb-16" : ""}
      ${isBold ? "font-bold" : ""}
      ${isItalic ? "italic" : ""}
      ${isUnderline ? "underline" : ""}
      ${isStrikethrough ? "line-through decoration-tertiary" : ""}
      ${isHighlighted ? "highlight bg-highlight-1" : ""}`;

    if (link) {
      children.push(
        <a
          key={counter}
          href={link.uri}
          className={`text-accent-contrast hover:underline ${className}`}
          target="_blank"
        >
          {segment.text}
        </a>,
      );
    } else {
      children.push(
        <span key={counter} className={className} id={id?.id}>
          {segment.text}
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
