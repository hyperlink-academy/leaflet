import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { Json } from "supabase/database.types";

/**
 * Return type for publication metadata extraction.
 * Note: `publications.record` and `documents.data` are raw JSON from the database.
 * Consumers should use `normalizePublicationRecord()` and `normalizeDocumentRecord()`
 * from `src/utils/normalizeRecords` to get properly typed data.
 */
export type PublicationPageMetadataEntry = {
  id: number;
  title: string;
  path: string | null;
  document: string | null;
  metadata: Json;
};

export type PublicationMetadata = {
  description: string;
  title: string;
  leaflet: string;
  doc: string | null;
  publications: {
    identity_did: string;
    name: string;
    indexed_at: string;
    /** Raw record - use normalizePublicationRecord() to get typed data */
    record: Json | null;
    uri: string;
  } | null;
  documents: {
    /** Raw data - use normalizeDocumentRecord() to get typed data */
    data: Json;
    indexed_at: string;
    uri: string;
  } | null;
  /** Set when this leaflet is the source of a publication_pages row. */
  page?: PublicationPageMetadataEntry;
} | null;

export function getPublicationMetadataFromLeafletData(
  data?: GetLeafletDataReturnType["result"]["data"],
): PublicationMetadata {
  if (!data) return null;

  // Look across the leaflet's own associations and any sibling tokens that share
  // its entity set. Each association is checked in a single pass.
  let leafletInPub = data.leaflets_in_publications?.[0];
  let standaloneDoc = data.leaflets_to_documents?.[0];
  let pageRow = data.publication_pages?.[0];

  if (!leafletInPub || !standaloneDoc || !pageRow) {
    let siblingTokens =
      data.permission_token_rights[0].entity_sets?.permission_tokens || [];
    for (let token of siblingTokens) {
      if (!leafletInPub && token.leaflets_in_publications?.length)
        leafletInPub = token.leaflets_in_publications[0];
      if (!standaloneDoc && token.leaflets_to_documents?.length)
        standaloneDoc = token.leaflets_to_documents[0];
      if (!pageRow && token.publication_pages?.length)
        pageRow = token.publication_pages[0];
      if (leafletInPub && standaloneDoc && pageRow) break;
    }
  }

  let pubData: NonNullable<PublicationMetadata> | null = null;

  if (leafletInPub) {
    pubData = leafletInPub;
  } else if (standaloneDoc) {
    pubData = {
      ...standaloneDoc,
      publications: null,
      doc: standaloneDoc.document,
    };
  } else if (pageRow && pageRow.publications) {
    pubData = {
      title: pageRow.title || "",
      description: "",
      leaflet: data.id,
      doc: pageRow.document,
      publications: pageRow.publications,
      documents: null,
    };
  }

  if (pageRow) {
    if (!pubData) return null;
    pubData = {
      ...pubData,
      page: {
        id: pageRow.id,
        title: pageRow.title,
        path: pageRow.path,
        document: pageRow.document,
        metadata: pageRow.metadata,
      },
    };
  }

  return pubData;
}
