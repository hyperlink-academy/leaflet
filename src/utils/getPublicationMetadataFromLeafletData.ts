import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { Json } from "supabase/database.types";

/**
 * Return type for publication metadata extraction.
 * Note: `publications.record` and `documents.data` are raw JSON from the database.
 * Consumers should use `normalizePublicationRecord()` and `normalizeDocumentRecord()`
 * from `src/utils/normalizeRecords` to get properly typed data.
 */
type PublicationPageMetadataEntry = {
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
    publication_contributors?: {
      contributor_did: string;
      confirmed: boolean;
      created_at: string;
    }[];
  } | null;
  documents: {
    /** Raw data - use normalizeDocumentRecord() to get typed data */
    data: Json;
    indexed_at: string;
    uri: string;
  } | null;
  /** Set when this leaflet is a publication's draft leaflet. */
  isPublicationDraft?: boolean;
} | null;

export function getPublicationMetadataFromLeafletData(
  data?: GetLeafletDataReturnType["result"]["data"],
): PublicationMetadata {
  if (!data) return null;

  // Look across the leaflet's own associations and any sibling tokens that share
  // its entity set. Each association is checked in a single pass.
  let leafletInPub = data.leaflets_in_publications?.[0];
  let standaloneDoc = data.leaflets_to_documents?.[0];
  let draftPub = data.publications?.[0];

  if (!leafletInPub || !standaloneDoc || !draftPub) {
    let siblingTokens =
      data.permission_token_rights[0].entity_sets?.permission_tokens || [];
    for (let token of siblingTokens) {
      if (!leafletInPub && token.leaflets_in_publications?.length)
        leafletInPub = token.leaflets_in_publications[0];
      if (!standaloneDoc && token.leaflets_to_documents?.length)
        standaloneDoc = token.leaflets_to_documents[0];
      if (!draftPub && token.publications?.length)
        draftPub = token.publications[0];
      if (leafletInPub && standaloneDoc && draftPub) break;
    }
  }

  if (leafletInPub) return leafletInPub;
  if (standaloneDoc)
    return {
      ...standaloneDoc,
      publications: null,
      doc: standaloneDoc.document,
    };
  if (draftPub) {
    return {
      title: draftPub.name || "",
      description: "",
      leaflet: data.id,
      doc: null,
      publications: draftPub,
      documents: null,
      isPublicationDraft: true,
    };
  }

  return null;
}
