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
        width: {
          type: "integer",
          description:
            "Fixed canvas width in canvas px. With height, bounds the canvas: blocks are clipped to the area. Absent, the canvas grows with its content and is 1272px wide, or as wide as the inside of the publication's page (its theme's pageWidth) when it is one of a publication's pages.",
        },
        height: {
          type: "integer",
          description: "Fixed canvas height in canvas px; see width.",
        },
        lockViewerZoom: {
          type: "boolean",
          description:
            "Viewers cannot zoom the canvas or scroll it sideways: no wheel, pinch, double-tap or zoom controls, and the initial framing (see mobileView) stays. Vertical scrolling is unaffected.",
        },
        background: { type: "ref", ref: "#background" },
        pattern: {
          type: "string",
          knownValues: ["grid", "dot", "plain"],
          description:
            "The guide pattern drawn over the canvas's background, under its blocks. Absent, a canvas that grows with its content shows the grid and a fixed-size canvas is plain.",
        },
      },
    },
    background: {
      type: "object",
      required: ["image"],
      description:
        "An image tiled across the canvas, under its guide pattern and blocks.",
      properties: {
        image: {
          type: "blob",
          accept: ["image/*"],
          maxSize: 1000000,
        },
        width: {
          type: "integer",
          description: "Width of each tile in canvas px. Defaults to 500.",
        },
        opacity: {
          type: "integer",
          minimum: 0,
          maximum: 100,
          description: "Opacity of the image as a percentage. Defaults to 100.",
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
        alignment: {
          type: "string",
          description:
            "Alignment of a single block's content. A linear document's blocks carry their own.",
          knownValues: [
            "lex:pub.leaflet.pages.linearDocument#textAlignLeft",
            "lex:pub.leaflet.pages.linearDocument#textAlignCenter",
            "lex:pub.leaflet.pages.linearDocument#textAlignRight",
            "lex:pub.leaflet.pages.linearDocument#textAlignJustify",
          ],
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
