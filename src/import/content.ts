import { JSDOM } from "jsdom";
import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import {
  buildBlocksFromPasteHTML,
  type BuiltBlock,
} from "src/utils/paste/htmlToBlocks";
import type { FactInput } from "src/replicache/mutations";

export type ImportImage = {
  entityID: string;
  url: string;
  // The intrinsic size, when the source states it, lets a preview reserve the
  // right aspect ratio before the bytes are fetched.
  width: number | null;
  height: number | null;
  // Defaults to block/image.
  attribute?: "block/image" | "link/preview";
};

export type ConvertedContent = {
  blocks: BuiltBlock[];
  extraEntities: string[];
  images: ImportImage[];
};

export type Card = {
  type: BuiltBlock["type"];
  facts: Array<{ id?: string; attribute: string; data: unknown }>;
};

export type GalleryImage = {
  url: string;
  width: number | null;
  height: number | null;
  alt?: string | null;
};

// The paste pipeline (src/utils/paste) is written against browser globals.
// Node has none, so they're installed from a jsdom window for the duration of
// a synchronous conversion and removed again — leaving `document` defined on
// the server would trip libraries that use it to detect a browser.
let sharedDom: JSDOM | undefined;
export function withDomGlobals<T>(fn: () => T): T {
  const g = globalThis as Record<string, unknown>;
  if (typeof g.document !== "undefined") return fn();
  sharedDom ??= new JSDOM("");
  const w = sharedDom.window as unknown as Record<string, unknown>;
  const names = ["DOMParser", "document", "Node", "HTMLElement", "Element"];
  for (const n of names) g[n] = w[n];
  try {
    return fn();
  } finally {
    for (const n of names) delete g[n];
  }
}

export function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export const stringFact = (attribute: string, value: string) => ({
  attribute,
  data: { type: "string", value },
});
export const numberFact = (attribute: string, value: number) => ({
  attribute,
  data: { type: "number", value },
});

// Lift an element out of whatever contains it so it stands directly in the
// body, splitting each ancestor in two around it. An image inside a list item
// becomes: the list up to that point, the image, the rest of the list.
export function hoist(el: Element, body: Element) {
  while (el.parentElement && el.parentElement !== body) {
    const parent = el.parentElement;
    const after = parent.cloneNode(false) as Element;
    after.removeAttribute("id");
    while (el.nextSibling) after.appendChild(el.nextSibling);
    const container = parent.parentNode!;
    container.insertBefore(el, parent.nextSibling);
    if (after.childNodes.length) container.insertBefore(after, el.nextSibling);
    if (!parent.childNodes.length) parent.remove();
  }
}

function cardBlock(parent: string, c: Card): BuiltBlock {
  const entityID = v7();
  return {
    entityID,
    parent,
    type: c.type,
    facts: [
      {
        entity: entityID,
        attribute: "block/type",
        data: { type: "block-type-union", value: c.type },
      },
      ...c.facts.map((f) => ({ ...f, entity: entityID })),
    ] as FactInput[],
  };
}

// Accumulates one page's blocks from a source document walked in order: runs
// of ordinary HTML go through the paste pipeline, and everything the paste
// pipeline has no notion of is added as a card with explicit facts.
export function contentBuilder(parent: string) {
  const content: ConvertedContent = {
    blocks: [],
    extraEntities: [],
    images: [],
  };
  let pending = "";
  const appendHtml = (markup: string) => {
    const result = withDomGlobals(() =>
      // Only the ids of extra entities are used; they join the leaflet's
      // entity set on insert.
      buildBlocksFromPasteHTML(markup, { parent, permission_set: "" }),
    );
    content.blocks.push(...result.blocks);
    content.extraEntities.push(...result.extraEntities.map((e) => e.entityID));
    content.images.push(
      ...result.imageTasks.map((t) => ({
        entityID: t.entityID,
        url: t.url,
        width: null,
        height: null,
      })),
    );
    return result.blocks.length > 0;
  };
  const flush = () => {
    if (!pending) return;
    appendHtml(pending);
    pending = "";
  };
  const card = (c: Card): string => {
    flush();
    const block = cardBlock(parent, c);
    content.blocks.push(block);
    return block.entityID;
  };
  return {
    html(html: string) {
      pending += html;
    },
    table(markup: string) {
      flush();
      // Preserve oversized or empty source tables as HTML rather than dropping them.
      if (!appendHtml(markup))
        card({ type: "html", facts: [stringFact("embed/html", markup)] });
    },
    card,
    image(image: ImportImage) {
      content.images.push(image);
    },
    gallery(format: "grid" | "carousel", images: GalleryImage[]): string {
      const children = images.map(() => v7());
      const positions = generateNKeysBetween(null, null, children.length);
      const entityID = card({
        type: "image-gallery",
        facts: [
          {
            attribute: "gallery/format",
            data: { type: "gallery-format-union", value: format },
          },
          ...children.map((child, i) => ({
            // Cardinality-many facts need caller-generated ids.
            id: v7(),
            attribute: "gallery/image",
            data: {
              type: "ordered-reference",
              value: child,
              position: positions[i],
            },
          })),
        ],
      });
      const block = content.blocks[content.blocks.length - 1];
      images.forEach((img, i) => {
        content.images.push({
          entityID: children[i],
          url: img.url,
          width: img.width,
          height: img.height,
        });
        if (img.alt)
          block.facts.push({
            entity: children[i],
            ...stringFact("image/alt", img.alt),
          } as FactInput);
      });
      content.extraEntities.push(...children);
      return entityID;
    },
    finish(): ConvertedContent {
      flush();
      return content;
    },
  };
}

// Put the whole of a page behind the paywall, unless the source already
// marked where the public preview ends.
export function gateContent(content: ConvertedContent, parent: string) {
  if (content.blocks.some((b) => b.type === "members-only-delimiter")) return;
  content.blocks.unshift(
    cardBlock(parent, { type: "members-only-delimiter", facts: [] }),
  );
}
