import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { Json } from "supabase/database.types";

/**
 * Return type for publication metadata extraction.
 * Note: `publications.record` and `documents.data` are raw JSON from the database.
 * Consumers should use `normalizePublicationRecord()` and `normalizeDocumentRecord()`
 * from `src/utils/normalizeRecords` to get properly typed data.
 */
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
} | null;

export function getPublicationMetadataFromLeafletData(
  data?: GetLeafletDataReturnType["result"]["data"],
): PublicationMetadata {
  if (!data) return null;

  let pubData:
    | NonNullable<PublicationMetadata>
    | undefined
    | null =
    data?.leaflets_in_publications?.[0] ||
    data?.permission_token_rights[0].entity_sets?.permission_tokens?.find(
      (p) => p.leaflets_in_publications?.length,
    )?.leaflets_in_publications?.[0];

  // If not found, check for standalone documents
  let standaloneDoc =
    data?.leaflets_to_documents?.[0] ||
    data?.permission_token_rights[0].entity_sets?.permission_tokens.find(
      (p) => p.leaflets_to_documents?.length,
    )?.leaflets_to_documents?.[0];
  if (!pubData && standaloneDoc) {
    // Transform standalone document data to match the expected format
    pubData = {
      ...standaloneDoc,
      publications: null, // No publication for standalone docs
      doc: standaloneDoc.document,
    };
  }
  return pubData || null;
}
