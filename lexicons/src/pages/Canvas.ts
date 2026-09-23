import { LexiconDoc } from "@atproto/lexicon";
import { BlockUnion } from "../blocks";

export const PubLeafletPagesCanvasDocument: LexiconDoc = {
  lexicon: 1,
  id: "pub.leaflet.pages.canvas",
  defs: {
    main: {
      type: "object",
      required: ["blocks"],
      properties: {
        id: { type: "string" },
        blocks: { type: "array", items: { type: "ref", ref: "#block" } },
        mobileView: {
          type: "string",
          knownValues: ["unconstrained", "left", "center"],
          description:
            "How a narrow viewport frames the canvas: the whole canvas scaled to fit the width (unconstrained, the default), or a phone-width area anchored to the canvas's left edge or centered on it, shown at up to 1:1.",
        },
        lockViewerZoom: {
          type: "boolean",
          description:
            "Viewers cannot zoom the canvas: no wheel, pinch, double-tap or zoom controls.",
        },
      },
    },
    block: {
      type: "object",
      required: ["block", "x", "y", "width"],
      properties: {
        block: {
          ...BlockUnion,
          description:
            "A single block, or a linear document: blocks grouped in reading order that are positioned, sized and rotated on the canvas as one.",
          refs: [...BlockUnion.refs, "pub.leaflet.pages.linearDocument"],
        },
        x: { type: "integer" },
        y: { type: "integer" },
        width: { type: "integer" },
        height: { type: "integer" },
        rotation: {
          type: "integer",
          description: "The rotation of the block in degrees",
        },
        stackOrder: {
          type: "string",
          description:
            "Fractional index ordering this block against its siblings on the z axis. Blocks without one stack below every block with one, ordered by position.",
        },
      },
    },
    textAlignLeft: { type: "token" },
    textAlignCenter: { type: "token" },
    textAlignRight: { type: "token" },
    quote: {
      type: "object",
      required: ["start", "end"],
      properties: {
        start: { type: "ref", ref: "#position" },
        end: { type: "ref", ref: "#position" },
      },
    },
    position: {
      type: "object",
      required: ["block", "offset"],
      properties: {
        block: { type: "array", items: { type: "integer" } },
        offset: { type: "integer" },
      },
    },
  },
};
