import { DOMParser as ProsemirrorDOMParser } from "prosemirror-model";
import type { Node as ProsemirrorNode } from "prosemirror-model";
import { generateNKeysBetween } from "fractional-indexing";
import { v7 } from "uuid";
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import * as base64 from "base64-js";
import {
  multiBlockSchema,
  schema,
} from "components/Blocks/TextBlock/schema";
import type { Fact } from "src/replicache";
import type { FactInput } from "src/replicache/mutations";
import type { FilterAttributes } from "src/replicache/attributes";
import {
  mergeAndNestFlattenedLists,
  normalizePastedHTML,
} from "./normalizePastedHTML";

const parser = ProsemirrorDOMParser.fromSchema(schema);

export type BlockType = Fact<"block/type">["data"]["value"];

export type BuiltBlock = {
  entityID: string;
  parent: string;
  type: BlockType;
  facts: FactInput[];
  parsedContent?: ProsemirrorNode;
};

export type ImageRefetchTask = {
  url: string;
  entityID: string;
  attribute: keyof FilterAttributes<{ type: "image" }>;
};

export type BuildResult = {
  blocks: BuiltBlock[];
  extraEntities: Array<{ entityID: string; permission_set: string }>;
  imageTasks: ImageRefetchTask[];
};

const emptyBuildResult = (): BuildResult => ({
  blocks: [],
  extraEntities: [],
  imageTasks: [],
});

function mergeInto(target: BuildResult, source: BuildResult) {
  target.blocks.push(...source.blocks);
  target.extraEntities.push(...source.extraEntities);
  target.imageTasks.push(...source.imageTasks);
}

// Parse a clipboard text/html payload into the block-level elements the block
// builder consumes. Also normalizes the quirks of the word processors people
// actually paste from — see normalizePastedHTML.
export function parsePasteHTMLToElements(html: string): HTMLElement[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  // see stripCommentMarks — this path parses clipboard HTML itself, so the
  // comment-anchor markup is stripped here instead
  for (const anchor of doc.querySelectorAll("span.comment-anchor")) {
    anchor.classList.remove("comment-anchor");
    anchor.removeAttribute("data-comment-id");
  }
  normalizePastedHTML(doc.body);
  return mergeAndNestFlattenedLists(flattenHTMLToTextBlocks(doc.body));
}

export function buildBlocksFromElements(
  children: Element[],
  opts: { parent: string; permission_set: string },
): BuildResult {
  const result = emptyBuildResult();
  for (const child of children)
    mergeInto(result, buildBlockFromHTML(child, opts));
  return result;
}

// Full clipboard-HTML → BuildResult pipeline. The paste handler parses and
// builds in two steps (it inspects the elements first); tests drive this.
export function buildBlocksFromPasteHTML(
  html: string,
  opts: { parent: string; permission_set: string },
): BuildResult {
  return buildBlocksFromElements(parsePasteHTMLToElements(html), opts);
}

function buildBlockFromHTML(
  child: Element,
  opts: {
    parent: string;
    permission_set: string;
    listStyle?: "ordered" | "unordered";
  },
): BuildResult {
  const { parent, permission_set, listStyle } = opts;
  const result = emptyBuildResult();

  if (child.tagName === "UL" || child.tagName === "OL") {
    const childListStyle = child.tagName === "OL" ? "ordered" : "unordered";
    for (const c of Array.from(child.children)) {
      mergeInto(
        result,
        buildBlockFromHTML(c, {
          parent,
          permission_set,
          listStyle: childListStyle,
        }),
      );
    }
    return result;
  }

  // Initial type from tagName; may be overridden below.
  let baseType: BlockType | null;
  let headingLevel: number | null = null;
  switch (child.tagName) {
    case "BLOCKQUOTE":
      baseType = "blockquote";
      break;
    case "LI":
    case "SPAN":
      baseType = "text";
      break;
    case "PRE":
      baseType = "code";
      break;
    case "P":
      baseType = "text";
      break;
    case "H1":
      baseType = "heading";
      headingLevel = 1;
      break;
    case "H2":
      baseType = "heading";
      headingLevel = 2;
      break;
    case "H3":
      baseType = "heading";
      headingLevel = 3;
      break;
    // Leaflet only has three heading levels; deeper headings clamp to the
    // smallest rather than being dropped on the floor.
    case "H4":
    case "H5":
    case "H6":
      baseType = "heading";
      headingLevel = 3;
      break;
    case "DIV":
      baseType = "card";
      break;
    case "IMG":
      baseType = "image";
      break;
    // The flattener coalesces plain links into the surrounding text block as an
    // inline mark, so the only <a> that reaches here as a block is a button.
    case "A":
      baseType =
        child.getAttribute("data-type") === "button" &&
        child.getAttribute("href")
          ? "button"
          : null;
      break;
    case "HR":
      baseType = "horizontal-rule";
      break;
    default:
      baseType = null;
  }
  if (!baseType) return result;

  // Special DIV variants determine final type.
  const isMath = child.tagName === "DIV" && !!child.getAttribute("data-tex");
  const isBlueskyPost =
    child.tagName === "DIV" && !!child.getAttribute("data-bluesky-post");
  const isCardPaste =
    child.tagName === "DIV" && !!child.getAttribute("data-entityid");

  let finalType: BlockType = baseType;
  if (isMath) finalType = "math";
  else if (isBlueskyPost) finalType = "bluesky-post";

  const entityID = v7();
  const facts: FactInput[] = [];
  let parsedContent: ProsemirrorNode | undefined;

  facts.push({
    entity: entityID,
    attribute: "block/type",
    data: { type: "block-type-union", value: finalType },
  });

  if (finalType === "heading" && headingLevel) {
    facts.push({
      entity: entityID,
      attribute: "block/heading-level",
      data: { type: "number", value: headingLevel },
    });
  }

  const alignment = child.getAttribute("data-alignment");
  if (alignment && ["right", "left", "center"].includes(alignment)) {
    facts.push({
      entity: entityID,
      attribute: "block/text-alignment",
      data: {
        type: "text-alignment-type-union",
        value: alignment as "right" | "left" | "center",
      },
    });
  }

  const textSize = child.getAttribute("data-text-size");
  if (textSize && ["default", "small", "large"].includes(textSize)) {
    facts.push({
      entity: entityID,
      attribute: "block/text-size",
      data: {
        type: "text-size-union",
        value: textSize as "default" | "small" | "large",
      },
    });
  }

  // block/text — Yjs-encode parsed content for text-ish blocks only.
  if (
    (finalType === "text" ||
      finalType === "heading" ||
      finalType === "blockquote") &&
    child.tagName !== "PRE"
  ) {
    // Footnote refs (spans carrying their definition's HTML, marked by
    // normalizePastedHTML) each get their own entity holding the definition as
    // block/text, plus a block/footnote reference on this block, ordered by
    // appearance. Giving the span the schema's footnote shape makes
    // parser.parse below emit a footnote node pointing at the minted entity.
    const footnoteRefs = (
      Array.from(
        child.querySelectorAll("span[data-footnote-def]"),
      ) as HTMLElement[]
    ).filter((ref) => {
      // A ref inside a nested list belongs to the nested item's own block
      // (built recursively), not to the LI whose subtree it happens to sit in.
      const list = ref.closest("ul, ol");
      return !list || !child.contains(list);
    });
    const footnotePositions = generateNKeysBetween(
      null,
      null,
      footnoteRefs.length,
    );
    footnoteRefs.forEach((ref, i) => {
      const footnoteEntityID = v7();
      ref.className = "footnote-ref";
      ref.setAttribute("data-footnote-id", footnoteEntityID);
      result.extraEntities.push({
        entityID: footnoteEntityID,
        permission_set,
      });
      facts.push({
        // block/footnote is cardinality-many: without a caller-generated id
        // the client and server mint diverging fact ids (see createFootnote).
        id: v7(),
        entity: entityID,
        attribute: "block/footnote",
        data: {
          type: "ordered-reference",
          value: footnoteEntityID,
          position: footnotePositions[i],
        },
      });
      facts.push({
        entity: footnoteEntityID,
        attribute: "block/text",
        data: {
          type: "text",
          value: encodeYJSDoc(
            parseFootnoteDefinition(ref.getAttribute("data-footnote-def")!),
          ),
        },
      });
    });
    const doc = parser.parse(child);
    parsedContent = doc;
    facts.push({
      entity: entityID,
      attribute: "block/text",
      data: { type: "text", value: encodeYJSDoc(doc) },
    });
  }

  // PRE → code body. data-lang is Leaflet's own exact language; fall back to a
  // language-* class (markdown fenced code) and then data-language.
  if (child.tagName === "PRE" && child.textContent) {
    let lang = child.getAttribute("data-lang");
    if (!lang && child.firstElementChild?.className) {
      const match =
        child.firstElementChild.className.match(/language-([\w.+-]+)/);
      if (match) lang = match[1];
    }
    if (!lang) lang = child.getAttribute("data-language") || "plaintext";
    facts.push({
      entity: entityID,
      attribute: "block/code-language",
      data: { type: "string", value: lang },
    });
    facts.push({
      entity: entityID,
      attribute: "block/code",
      // markdown→HTML wraps the body in extra blank lines; strip them so pasted
      // code doesn't gain leading/trailing empty lines.
      data: {
        type: "string",
        value: child.textContent.replace(/^\n+|\n+$/g, ""),
      },
    });
  }

  if (finalType === "button") {
    facts.push({
      entity: entityID,
      attribute: "button/text",
      data: { type: "string", value: child.textContent || "" },
    });
    facts.push({
      entity: entityID,
      attribute: "button/url",
      data: { type: "string", value: child.getAttribute("href") || "" },
    });
  }

  // IMG → placeholder + async fetch+upload
  if (child.tagName === "IMG") {
    const src = child.getAttribute("src");
    if (src) {
      result.imageTasks.push({
        url: src,
        entityID,
        attribute: "block/image",
      });
    }
  }

  // DIV with data-tex → math (markdown "$$…$$" wraps the tex in newlines)
  if (isMath) {
    const tex = child.getAttribute("data-tex");
    facts.push({
      entity: entityID,
      attribute: "block/math",
      data: { type: "string", value: (tex || "").trim() },
    });
  }

  // DIV with data-bluesky-post
  if (isBlueskyPost) {
    const postData = child.getAttribute("data-bluesky-post");
    if (postData) {
      try {
        facts.push({
          entity: entityID,
          attribute: "block/bluesky-post",
          data: { type: "bluesky-post", value: JSON.parse(postData) },
        });
      } catch {
        // Malformed bluesky-post payload — leave as a bare bluesky-post block.
      }
    }
  }

  // Card paste — recreate nested entities and remap references.
  if (isCardPaste) {
    const oldRootID = child.getAttribute("data-entityid") as string;
    const factsData = child.getAttribute("data-facts");
    if (factsData) {
      let cardFacts: Fact<any>[] = [];
      try {
        cardFacts = JSON.parse(factsData) as Fact<any>[];
      } catch {
        cardFacts = [];
      }
      const oldToNew: { [k: string]: string } = {};
      const seen = new Set<string>();
      for (const f of cardFacts) {
        if (!seen.has(f.entity)) {
          seen.add(f.entity);
          const newID = v7();
          oldToNew[f.entity] = newID;
          result.extraEntities.push({ entityID: newID, permission_set });
        }
      }
      for (const fact of cardFacts) {
        const newEntity = oldToNew[fact.entity];
        if (!newEntity) continue;
        const data = { ...fact.data };
        if (
          data.type === "ordered-reference" ||
          data.type === "spatial-reference" ||
          data.type === "reference"
        ) {
          data.value = oldToNew[data.value] ?? data.value;
        }
        if (data.type === "image") {
          result.imageTasks.push({
            url: data.src,
            entityID: newEntity,
            attribute: fact.attribute,
          });
        } else {
          facts.push({
            entity: newEntity,
            attribute: fact.attribute,
            data,
          } as FactInput);
        }
      }
      const newRootID = oldToNew[oldRootID];
      if (newRootID) {
        facts.push({
          entity: entityID,
          attribute: "block/card",
          data: { type: "reference", value: newRootID },
        });
      }
    }
  }

  // LI metadata + nested-list children
  if (child.tagName === "LI") {
    const nestedList = Array.from(child.children)
      .flatMap((f) => flattenHTMLToTextBlocks(f as HTMLElement))
      .find((f) => f.tagName === "UL" || f.tagName === "OL");
    const checked = child.getAttribute("data-checked");
    if (checked !== null) {
      facts.push({
        entity: entityID,
        attribute: "block/check-list",
        data: { type: "boolean", value: checked === "true" },
      });
    }
    facts.push({
      entity: entityID,
      attribute: "block/is-list",
      data: { type: "boolean", value: true },
    });
    if (listStyle) {
      facts.push({
        entity: entityID,
        attribute: "block/list-style",
        data: { type: "list-style-union", value: listStyle },
      });
    }
    if (nestedList) {
      const nested = buildBlockFromHTML(nestedList, {
        parent: entityID,
        permission_set,
      });
      const nestedTopLevel = nested.blocks.filter((b) => b.parent === entityID);
      if (nestedTopLevel.length > 0) {
        const nestedPositions = generateNKeysBetween(
          null,
          null,
          nestedTopLevel.length,
        );
        nestedTopLevel.forEach((nb, i) => {
          facts.push({
            entity: entityID,
            attribute: "card/block",
            data: {
              type: "ordered-reference",
              value: nb.entityID,
              position: nestedPositions[i],
            },
          });
        });
      }
      mergeInto(result, nested);
    }
  }

  result.blocks.unshift({
    entityID,
    parent,
    type: finalType,
    facts,
    parsedContent,
  });
  return result;
}

// A definition can hold several blocks, but a footnote's content is a single
// text block (the schema's doc holds exactly one). Parse it with the
// multi-block schema — which handles the whitespace, nesting, and marks of
// arbitrary HTML — then join the blocks' inline content with hard breaks.
const multiBlockParser = ProsemirrorDOMParser.fromSchema(multiBlockSchema);

function parseFootnoteDefinition(html: string): ProsemirrorNode {
  const container = document.createElement("div");
  container.innerHTML = html;
  const inline: any[] = [];
  multiBlockParser.parse(container).forEach((block) => {
    if (block.content.size === 0) return;
    if (inline.length > 0) inline.push({ type: "hard_break" });
    block.forEach((node) => inline.push(node.toJSON()));
  });
  return schema.nodeFromJSON({
    type: "doc",
    content: [{ type: "paragraph", content: inline }],
  });
}

function encodeYJSDoc(doc: ProsemirrorNode): string {
  const ydoc = prosemirrorToYDoc(doc, "prosemirror");
  const update = Y.encodeStateAsUpdate(ydoc);
  ydoc.destroy();
  return base64.fromByteArray(update);
}

// Block-level tags that become their own block when flattening pasted HTML.
// NOTE: inline/phrasing tags (A, SPAN, I, SUP, …) are deliberately NOT here —
// they're coalesced into the surrounding text block (see INLINE_FLATTEN_TAGS)
// so a hyperlink in flowing prose parses as an inline link mark instead of
// splitting the paragraph and becoming its own (async) link block.
const BLOCK_FLATTEN_TAGS = new Set([
  "BLOCKQUOTE",
  "P",
  "PRE",
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "LI",
  "UL",
  "OL",
  "IMG",
  "HR",
]);

// Phrasing/inline elements that stay *within* a text block rather than breaking
// the paragraph. A run of these (plus text nodes) is gathered into one <p>.
const INLINE_FLATTEN_TAGS = new Set([
  "A",
  "SPAN",
  "I",
  "B",
  "EM",
  "STRONG",
  "U",
  "S",
  "STRIKE",
  "DEL",
  "INS",
  "SUP",
  "SUB",
  "CODE",
  "MARK",
  "SMALL",
  "ABBR",
  "CITE",
  "Q",
  "TIME",
  "FONT",
  "KBD",
  "VAR",
  "SAMP",
  "BDI",
  "BDO",
  "DFN",
  "BR",
  "WBR",
]);

export function flattenHTMLToTextBlocks(element: HTMLElement): HTMLElement[] {
  const htmlBlocks: HTMLElement[] = [];

  const isSpecialBlock = (el: HTMLElement) =>
    !!el.getAttribute("data-entityid") ||
    !!el.getAttribute("data-tex") ||
    !!el.getAttribute("data-bluesky-post");

  // A <p> that only wraps a special block (e.g. inline "$$…$$" math, which
  // markdown nests inside a paragraph) should yield the inner block rather than
  // a text block, so we recurse into it instead of pushing the <p>.
  const wrapsOnlySpecialBlock = (el: HTMLElement) =>
    el.tagName === "P" &&
    !isSpecialBlock(el) &&
    !!el.querySelector("[data-tex], [data-entityid], [data-bluesky-post]") &&
    !Array.from(el.childNodes).some(
      (n) => n.nodeType === Node.TEXT_NODE && n.textContent?.trim() !== "",
    );

  // Walk a container's children, coalescing consecutive inline content (text
  // nodes + phrasing elements) into a single <p>. This keeps inline links and
  // other marks inside one text block instead of fragmenting the paragraph.
  //
  // `wrappers` are inline ancestors we descended through (see the
  // containsBlockContent branch); each flushed run is re-wrapped in shallow
  // clones of them so their formatting survives the descent.
  function walk(container: Node, wrappers: HTMLElement[]): void {
    let inlineBuffer: Node[] = [];
    const flushInline = () => {
      if (inlineBuffer.length === 0) return;
      const p = document.createElement("p");
      let target: HTMLElement = p;
      for (const w of wrappers) {
        const clone = w.cloneNode(false) as HTMLElement;
        target.appendChild(clone);
        target = clone;
      }
      for (const n of inlineBuffer) target.appendChild(n.cloneNode(true));
      inlineBuffer = [];
      if (p.textContent && p.textContent.trim() !== "") htmlBlocks.push(p);
    };

    for (const child of Array.from(container.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        inlineBuffer.push(child);
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      // Explicit buttons keep their own block; plain links stay inline.
      const isButtonLink =
        el.tagName === "A" && el.getAttribute("data-type") === "button";

      if (
        (isSpecialBlock(el) ||
          BLOCK_FLATTEN_TAGS.has(el.tagName) ||
          isButtonLink) &&
        !wrapsOnlySpecialBlock(el)
      ) {
        flushInline();
        htmlBlocks.push(el);
      } else if (INLINE_FLATTEN_TAGS.has(el.tagName)) {
        // Google Docs wraps its whole payload in a <b style="font-weight:normal"
        // id="docs-internal-guid-…">, and wraps images in a styled <span>.
        // Buffering an inline element that contains block content would collapse
        // an entire document into one paragraph, so descend into it instead.
        if (containsBlockContent(el)) {
          flushInline();
          walk(el, [...wrappers, el]);
        } else {
          inlineBuffer.push(el);
        }
      } else {
        // Non-phrasing container (DIV, SECTION, a special-wrapping <p>, …):
        // descend so its own inline content coalesces at that level.
        flushInline();
        walk(el, wrappers);
      }
    }
    flushInline();
  }

  // A block/special element passed directly (e.g. the nested-list lookup in the
  // LI handler hands us a <ul>/<ol>) is returned as-is.
  if (
    element.nodeType === Node.ELEMENT_NODE &&
    (BLOCK_FLATTEN_TAGS.has(element.tagName) || isSpecialBlock(element))
  ) {
    return [element];
  }
  walk(element, []);
  return htmlBlocks;
}

const BLOCK_CONTENT_SELECTOR = [
  ...Array.from(BLOCK_FLATTEN_TAGS).map((t) => t.toLowerCase()),
  "div",
  "table",
  "[data-entityid]",
  "[data-tex]",
  "[data-bluesky-post]",
].join(",");

function containsBlockContent(el: Element): boolean {
  return !!el.querySelector(BLOCK_CONTENT_SELECTOR);
}
