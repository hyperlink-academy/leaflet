"use client";
import { UnicodeString } from "@atproto/api";
import { PubLeafletRichtextFacet } from "lexicons/api";
import { useMemo } from "react";
import { useHighlight } from "./useHighlight";
import { BaseTextBlock } from "./BaseTextBlock";

type Facet = PubLeafletRichtextFacet.Main;
export function TextBlock(props: {
  plaintext: string;
  facets?: Facet[];
  index: number[];
  preview?: boolean;
  pageId?: string;
}) {
  let children = [];
  let highlights = useHighlight(props.index, props.pageId);
  let facets = useMemo(() => {
    if (props.preview) return props.facets;
    let facets = [...(props.facets || [])];
    for (let highlight of highlights) {
      const fragmentId = props.pageId
        ? `${props.pageId}~${props.index.join(".")}_${highlight.startOffset || 0}`
        : `${props.index.join(".")}_${highlight.startOffset || 0}`;
      facets = addFacet(
        facets,
        {
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
              id: fragmentId,
            },
          ],
        },
        new UnicodeString(props.plaintext).length,
      );
    }
    return facets;
  }, [props.plaintext, props.facets, highlights, props.preview, props.pageId]);
  return <BaseTextBlock {...props} facets={facets} />;
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
