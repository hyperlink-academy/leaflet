import { GetLeafletDataReturnType } from "app/api/rpc/[command]/get_leaflet_data";
import { Json } from "supabase/database.types";

export function getPublicationMetadataFromLeafletData(
  data?: GetLeafletDataReturnType["result"]["data"],
) {
  if (!data) return null;

  let pubData:
    | {
        description: string;
        title: string;
        leaflet: string;
        doc: string | null;
        publications: {
          identity_did: string;
          name: string;
          indexed_at: string;
          record: Json | null;
          uri: string;
        } | null;
        documents: {
          data: Json;
          indexed_at: string;
          uri: string;
        } | null;
      }
    | undefined
    | null =
    data?.leaflets_in_publications?.[0] ||
    data?.permission_token_rights[0].entity_sets?.permission_tokens?.find(
      (p) => p.leaflets_in_publications.length,
    )?.leaflets_in_publications?.[0];

  // If not found, check for standalone documents
  let standaloneDoc =
    data?.leaflets_to_documents?.[0] ||
    data?.permission_token_rights[0].entity_sets?.permission_tokens.find(
      (p) => p.leaflets_to_documents.length,
    )?.leaflets_to_documents?.[0];
  if (!pubData && standaloneDoc) {
    // Transform standalone document data to match the expected format
    pubData = {
      ...standaloneDoc,
      publications: null, // No publication for standalone docs
      doc: standaloneDoc.document,
    };
  }
  return pubData;
}
