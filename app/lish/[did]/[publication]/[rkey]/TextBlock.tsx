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
        facets = addFacet(facets, {
          index: {
            byteStart: highlight.startOffset
              ? new UnicodeString(
                  props.plaintext.slice(0, highlight.startOffset),
                ).length
              : 0,
            byteEnd: new UnicodeString(
              props.plaintext.slice(0, highlight.endOffset ?? undefined),
            ).length,
          },
          features: [
            { $type: "pub.leaflet.richtext.facet#highlight" },
            {
              $type: "pub.leaflet.richtext.facet#id",
              id: `${props.index.join(".")}_${highlight.startOffset || 0}`,
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
    let isCode = segment.facet?.find(PubLeafletRichtextFacet.isCode);
    let isStrikethrough = segment.facet?.find(
      PubLeafletRichtextFacet.isStrikethrough,
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
      ${isHighlighted ? "highlight bg-highlight-1" : ""}`;

    if (isCode) {
      children.push(
        <code key={counter} className={className} id={id?.id}>
          {segment.text}
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

function addFacet(facets: Facet[], facet: Facet) {
  // Handle empty facets array
  if (facets.length === 0) {
    return [facet];
  }

  const newStart = facet.index.byteStart;
  const newEnd = facet.index.byteEnd;

  // Find facets that overlap with the new facet
  const overlapping: number[] = [];
  for (let i = 0; i < facets.length; i++) {
    const existing = facets[i];
    const existingStart = existing.index.byteStart;
    const existingEnd = existing.index.byteEnd;

    // Check if there's any overlap
    if (newEnd > existingStart && newStart < existingEnd) {
      overlapping.push(i);
    }
  }

  // No overlaps - just insert the new facet at the right position
  if (overlapping.length === 0) {
    // Find the correct position to insert (maintain sorted order)
    let insertIndex = facets.length;
    for (let i = 0; i < facets.length; i++) {
      if (newStart < facets[i].index.byteStart) {
        insertIndex = i;
        break;
      }
    }

    let newFacets = [...facets];
    newFacets.splice(insertIndex, 0, facet);
    return newFacets;
  }

  // Handle overlaps by splitting and merging
  const newFacets: Facet[] = [];
  let processedUpTo = 0;

  for (let i = 0; i < facets.length; i++) {
    const existing = facets[i];
    const existingStart = existing.index.byteStart;
    const existingEnd = existing.index.byteEnd;

    // Add non-overlapping facets before the current one
    if (!overlapping.includes(i)) {
      newFacets.push(existing);
      continue;
    }

    // Split the existing facet based on overlap with new facet
    const overlapStart = Math.max(existingStart, newStart);
    const overlapEnd = Math.min(existingEnd, newEnd);

    // Part before overlap
    if (existingStart < overlapStart) {
      newFacets.push({
        index: {
          byteStart: existingStart,
          byteEnd: overlapStart,
        },
        features: [...existing.features],
      });
    }

    // Overlapping part - merge features
    newFacets.push({
      index: {
        byteStart: overlapStart,
        byteEnd: overlapEnd,
      },
      features: [...existing.features, ...facet.features],
    });

    // Part after overlap
    if (overlapEnd < existingEnd) {
      newFacets.push({
        index: {
          byteStart: overlapEnd,
          byteEnd: existingEnd,
        },
        features: [...existing.features],
      });
    }

    // Track what part of the new facet we've processed
    if (newStart < overlapStart && processedUpTo < overlapStart) {
      // Add the part of new facet before this overlap
      newFacets.push({
        index: {
          byteStart: newStart,
          byteEnd: overlapStart,
        },
        features: [...facet.features],
      });
    }
    processedUpTo = overlapEnd;
  }

  // Add any remaining part of the new facet after all overlaps
  if (processedUpTo < newEnd) {
    newFacets.push({
      index: {
        byteStart: processedUpTo,
        byteEnd: newEnd,
      },
      features: [...facet.features],
    });
  }

  return newFacets.sort((a, b) => a.index.byteStart - b.index.byteStart);
}
