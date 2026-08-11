// @vitest-environment jsdom
import { describe, expect, test, vi } from "vitest";
import type { BuiltBlock } from "./htmlToBlocks";
import {
  buildBlocksFromElements,
  parsePasteHTMLToElements,
} from "./htmlToBlocks";
import { resolveCopiedFootnoteRefs } from "./resolveCopiedFootnoteRefs";
import { blockFootnotes } from "./testHelpers";

// The paste handler's pipeline for Leaflet-internal clipboard HTML: parse,
// resolve refs against a (faked) local replicache, build.
async function buildResolved(
  html: string,
  getDefHTML: (id: string) => Promise<string | null>,
) {
  const children = parsePasteHTMLToElements(html);
  await resolveCopiedFootnoteRefs(children, getDefHTML);
  return buildBlocksFromElements(children, {
    parent: "test-parent-entity",
    permission_set: "test-permission-set",
  });
}

function footnoteNodeIDs(block: BuiltBlock): string[] {
  const ids: string[] = [];
  block.parsedContent?.descendants((node) => {
    if (node.type.name === "footnote") ids.push(node.attrs.footnoteEntityID);
    return true;
  });
  return ids;
}

describe("Leaflet-internal footnote refs", () => {
  // The clipboard shape schema toDOM emits (in-block copies and pre-def-embed
  // copies): a bare entity reference. It must never survive as-is — a pasted
  // node pointing at the source entity means deleting the copy deletes the
  // original's content.
  test("an id-only ref is re-minted from the local definition", async () => {
    const result = await buildResolved(
      `<p>Text<span class="footnote-ref" data-footnote-id="original-entity"></span> more.</p>`,
      async () => `<p>Original note.</p>`,
    );
    const footnotes = blockFootnotes(result.blocks[0]);
    expect(footnotes.map((f) => f.text)).toEqual(["Original note."]);
    expect(footnotes[0].entityID).not.toBe("original-entity");
    expect(footnoteNodeIDs(result.blocks[0])).toEqual([footnotes[0].entityID]);
  });

  test("a ref whose entity isn't in the local store is dropped", async () => {
    const result = await buildResolved(
      `<p>Text<span class="footnote-ref" data-footnote-id="foreign-entity"></span> more.</p>`,
      async () => null,
    );
    expect(result.blocks[0].parsedContent?.textContent).toBe("Text more.");
    expect(blockFootnotes(result.blocks[0])).toEqual([]);
    expect(footnoteNodeIDs(result.blocks[0])).toEqual([]);
  });

  test("a def-carrying ref mints a fresh entity without a lookup", async () => {
    const getDefHTML = vi.fn(async () => null);
    const result = await buildResolved(
      `<p>Text<span class="footnote-ref" data-footnote-id="original-entity" data-footnote-def="&lt;p&gt;Copied note.&lt;/p&gt;"></span> more.</p>`,
      getDefHTML,
    );
    expect(getDefHTML).not.toHaveBeenCalled();
    const footnotes = blockFootnotes(result.blocks[0]);
    expect(footnotes.map((f) => f.text)).toEqual(["Copied note."]);
    expect(footnotes[0].entityID).not.toBe("original-entity");
    expect(footnoteNodeIDs(result.blocks[0])).toEqual([footnotes[0].entityID]);
  });

  test("several refs to the same entity each get their own footnote", async () => {
    const result = await buildResolved(
      `<p>One<span class="footnote-ref" data-footnote-id="original-entity"></span> two<span class="footnote-ref" data-footnote-id="original-entity"></span>.</p>`,
      async () => `<p>Shared note.</p>`,
    );
    const footnotes = blockFootnotes(result.blocks[0]);
    expect(footnotes.map((f) => f.text)).toEqual([
      "Shared note.",
      "Shared note.",
    ]);
    expect(footnotes[0].entityID).not.toBe(footnotes[1].entityID);
  });
});
