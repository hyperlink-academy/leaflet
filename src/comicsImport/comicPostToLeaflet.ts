import { v7 } from "uuid";
import { generateNKeysBetween } from "fractional-indexing";
import type { LeafletFact } from "src/utils/insertLeaflet";
import type { ImageData } from "src/ghostImport/ghostPostToLeaflet";
import { withDomGlobals } from "src/ghostImport/ghostToBlocks";
import { buildBlocksFromPasteHTML } from "src/utils/paste/htmlToBlocks";

export type ComicLeaflet = {
  rootEntityId: string;
  entities: string[];
  facts: LeafletFact[];
};

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// One comic page as a leaflet: the image, a blank line, and the footer in
// small text. A cover post also carries the image as its cover, in its own
// entity the way the editor's "set as cover" does (see setCoverImageFromEntity).
export function comicPostToLeaflet(args: {
  image: ImageData;
  isCover: boolean;
  footer: string;
}): ComicLeaflet {
  const rootEntityId = v7();
  const pageId = v7();
  const imageId = v7();
  const blankId = v7();

  const footer = withDomGlobals(() =>
    buildBlocksFromPasteHTML(
      `<p data-text-size="small">${escapeHtml(args.footer)}</p>`,
      { parent: pageId, permission_set: "" },
    ),
  );
  if (footer.blocks.length !== 1 || footer.blocks[0].type !== "text")
    throw new Error("The footer didn't build as a single text block");
  const footerBlock = footer.blocks[0];

  const blockIds = [imageId, blankId, footerBlock.entityID];
  const positions = generateNKeysBetween(null, null, blockIds.length);
  const facts: LeafletFact[] = [
    {
      entity: rootEntityId,
      attribute: "root/page",
      data: { type: "ordered-reference", value: pageId, position: "a0" },
    },
    ...blockIds.map((value, i) => ({
      entity: pageId,
      attribute: "card/block",
      data: { type: "ordered-reference", value, position: positions[i] },
    })),
    {
      entity: imageId,
      attribute: "block/type",
      data: { type: "block-type-union", value: "image" },
    },
    {
      entity: imageId,
      attribute: "block/image",
      data: { type: "image", ...args.image },
    },
    {
      entity: blankId,
      attribute: "block/type",
      data: { type: "block-type-union", value: "text" },
    },
    ...footerBlock.facts,
  ];
  const entities = [rootEntityId, pageId, ...blockIds];

  if (args.isCover) {
    const coverId = v7();
    entities.push(coverId);
    facts.push(
      {
        entity: coverId,
        attribute: "block/image",
        data: { type: "image", ...args.image },
      },
      {
        entity: rootEntityId,
        attribute: "root/cover-image",
        data: { type: "reference", value: coverId },
      },
    );
  }
  return { rootEntityId, entities, facts };
}
