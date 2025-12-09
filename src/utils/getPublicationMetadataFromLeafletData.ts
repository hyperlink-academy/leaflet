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
      (p) => p.leaflets_in_publications?.length,
    )?.leaflets_in_publications?.[0];

  // If not found, check for standalone documents (looseleafs)
  let standaloneDoc = data?.leaflets_to_documents;

  // Only use standaloneDoc if it exists and has meaningful data
  // (either published with a document, or saved as draft with a title)
  if (
    !pubData &&
    standaloneDoc &&
    (standaloneDoc.document || standaloneDoc.title)
  ) {
    // Transform standalone document data to match the expected format
    pubData = {
      ...standaloneDoc,
      publications: null, // No publication for standalone docs
      doc: standaloneDoc.document,
      leaflet: data.id,
    };
  }

  // Also check nested permission tokens for looseleafs
  if (!pubData) {
    let nestedStandaloneDoc =
      data?.permission_token_rights[0].entity_sets?.permission_tokens?.find(
        (p) =>
          p.leaflets_to_documents &&
          (p.leaflets_to_documents.document || p.leaflets_to_documents.title),
      )?.leaflets_to_documents;

    if (nestedStandaloneDoc) {
      pubData = {
        ...nestedStandaloneDoc,
        publications: null,
        doc: nestedStandaloneDoc.document,
        leaflet: data.id,
      };
    }
  }

  return pubData;
}
