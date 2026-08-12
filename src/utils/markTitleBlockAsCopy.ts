import * as base64 from "base64-js";
import { Doc, XmlText, applyUpdate, encodeStateAsUpdate } from "yjs";
import { generateKeyBetween } from "fractional-indexing";
import { v7 } from "uuid";

import { createYjsText } from "src/utils/createYjsText";
import { scanIndexLocal } from "src/replicache/utils";
import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

const COPY_SUFFIX = " (Copy)";
const COPY_BLOCK_TEXT = "Copy";
// Canvas positions are pixels; enough room for a one-line text block.
const CANVAS_MARKER_HEIGHT = 60;

/**
 * Mark a leaflet's facts as a copy by writing the marker into its title — the
 * first block of its first page, which is what the editor syncs up as the
 * leaflet's title. When that block can't hold text (an image, an embed, an
 * empty canvas) a new text block carrying the marker is inserted ahead of it
 * instead.
 *
 * Returns the facts unchanged if there's no page to write into.
 */
export function markTitleBlockAsCopy(
  facts: Fact<Attribute>[],
  rootEntity: string,
): Fact<Attribute>[] {
  const scan = scanIndexLocal(facts);
  const page = scan
    .eav(rootEntity, "root/page")
    .sort((a, b) => (a.data.position > b.data.position ? 1 : -1))[0]
    ?.data.value;
  if (!page) return facts;

  const isCanvas = scan.eav(page, "page/type")[0]?.data.value === "canvas";
  const canvasBlocks = isCanvas
    ? scan.eav(page, "canvas/block").sort((a, b) => {
        if (a.data.position.y === b.data.position.y)
          return a.data.position.x - b.data.position.x;
        return a.data.position.y - b.data.position.y;
      })
    : [];
  const cardBlocks = isCanvas
    ? []
    : scan.eav(page, "card/block").sort((a, b) => {
        if (a.data.position === b.data.position) return a.id > b.id ? 1 : -1;
        return a.data.position > b.data.position ? 1 : -1;
      });

  const firstBlock = (isCanvas ? canvasBlocks[0] : cardBlocks[0])?.data.value;
  const firstBlockType = firstBlock
    ? scan.eav(firstBlock, "block/type")[0]?.data.value
    : undefined;

  if (firstBlockType === "text" || firstBlockType === "heading") {
    const text = scan.eav(firstBlock!, "block/text")[0];
    // An empty title block reads as the marker on its own rather than as a
    // stray leading space.
    if (!text) return [...facts, blockTextFact(firstBlock!, COPY_BLOCK_TEXT)];
    return facts.map((f) =>
      f.id === text.id
        ? { ...f, data: { ...text.data, value: append(text.data.value) } }
        : f,
    );
  }

  const newBlock = v7();
  const markerBlock: Fact<Attribute>[] = [
    {
      id: v7(),
      entity: newBlock,
      attribute: "block/type",
      data: { type: "block-type-union", value: "text" },
    },
    blockTextFact(newBlock, COPY_BLOCK_TEXT),
  ];

  if (!isCanvas)
    return [
      ...facts,
      ...markerBlock,
      {
        id: v7(),
        entity: page,
        attribute: "card/block",
        data: {
          type: "ordered-reference",
          value: newBlock,
          position: generateKeyBetween(null, cardBlocks[0]?.data.position),
        },
      },
    ];

  // Nothing on a canvas is "first", so the marker takes the topmost block's
  // spot and everything else slides down to make room for it.
  const topmost = canvasBlocks[0]?.data.position ?? { x: 8, y: 12 };
  return [
    ...facts.map((f) =>
      f.entity === page && f.data.type === "spatial-reference"
        ? {
            ...f,
            data: {
              ...f.data,
              position: {
                x: f.data.position.x,
                y: f.data.position.y + CANVAS_MARKER_HEIGHT,
              },
            },
          }
        : f,
    ),
    ...markerBlock,
    {
      id: v7(),
      entity: page,
      attribute: "canvas/block",
      data: { type: "spatial-reference", value: newBlock, position: topmost },
    },
  ];
}

function blockTextFact(entity: string, content: string): Fact<Attribute> {
  return {
    id: v7(),
    entity,
    attribute: "block/text",
    data: { type: "text", value: createYjsText(content) },
  };
}

// Append the marker to the end of a block's first line, preserving the
// existing yjs document so its marks and inline nodes survive the copy.
function append(value: string) {
  const doc = new Doc();
  applyUpdate(doc, base64.toByteArray(value));
  const first = doc.getXmlFragment("prosemirror").toArray()[0];
  if (!first) return createYjsText(COPY_BLOCK_TEXT);

  if (first.constructor === XmlText) {
    first.insert(first.length, COPY_SUFFIX);
  } else if ("toArray" in first) {
    const children = first.toArray();
    const last = children[children.length - 1];
    if (last?.constructor === XmlText) {
      (last as XmlText).insert((last as XmlText).length, COPY_SUFFIX);
    } else {
      const text = new XmlText();
      text.insert(0, COPY_SUFFIX);
      first.insert(children.length, [text]);
    }
  }
  return base64.fromByteArray(encodeStateAsUpdate(doc));
}
