import {
  PubLeafletContent,
  PubLeafletPagesCanvas,
  PubLeafletPagesLinearDocument,
  PubLeafletPublicationPage,
} from "lexicons/api";

import type { Fact } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";
import {
  processBlocksToPages,
  type ProcessBlocksToPagesHooks,
} from "src/utils/factsToPagesRecord";

export async function leafletToPublicationPageRecord(opts: {
  facts: Fact<Attribute>[];
  root_entity: string;
  publication_uri: string;
  path: string;
  title?: string;
  publishedAt?: string;
  hooks: ProcessBlocksToPagesHooks;
}): Promise<PubLeafletPublicationPage.Record> {
  const { pages } = await processBlocksToPages({
    facts: opts.facts,
    root_entity: opts.root_entity,
    hooks: opts.hooks,
  });

  const pagesArray: PubLeafletContent.Main["pages"] = pages.map((p) => {
    if (p.type === "canvas") {
      return {
        $type: "pub.leaflet.pages.canvas" as const,
        id: p.id,
        blocks: p.blocks as PubLeafletPagesCanvas.Block[],
      };
    }
    return {
      $type: "pub.leaflet.pages.linearDocument" as const,
      id: p.id,
      blocks: p.blocks as PubLeafletPagesLinearDocument.Block[],
    };
  });

  return {
    $type: "pub.leaflet.publicationPage",
    publication: opts.publication_uri,
    path: opts.path,
    ...(opts.title !== undefined && { title: opts.title }),
    publishedAt: opts.publishedAt ?? new Date().toISOString(),
    content: {
      $type: "pub.leaflet.content",
      pages: pagesArray,
    },
  };
}
