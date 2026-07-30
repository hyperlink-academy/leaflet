import type { Json } from "supabase/database.types";
import type {
  PubLeafletPublication,
  SiteStandardPublication,
} from "lexicons/api";

// Everything these functions return crosses to the client (RSC props plus the
// DocumentContext payload of a CDN-cacheable page), so they are allow-lists,
// never spreads: the `publications` row carries `draft_leaflet` — a
// permission_tokens id that /[leaflet_id] honours with no auth check — and the
// embedded subscription rows carry every subscriber's DID.

type PublicationRow = {
  uri: string;
  name: string;
  identity_did: string;
  record: Json | null;
  publication_newsletter_settings?: { enabled: boolean } | null;
};

export type ProjectedPublication = {
  uri: string;
  name: string;
  identity_did: string;
  record: PubLeafletPublication.Record | SiteStandardPublication.Record | null;
  newsletterMode: boolean;
};

export function projectPublicationForClient(
  rawPub: PublicationRow | null | undefined,
): ProjectedPublication | null {
  if (!rawPub) return null;
  return {
    uri: rawPub.uri,
    name: rawPub.name,
    identity_did: rawPub.identity_did,
    record: rawPub.record as ProjectedPublication["record"],
    newsletterMode: !!rawPub.publication_newsletter_settings?.enabled,
  };
}

type DocumentRow = {
  uri: string;
  data: Json;
  documents_in_publications: { publications: PublicationRow | null }[];
  leaflets_in_publications: { leaflet: string }[];
};

// PostHeader reads the publication link and the owner's edit link straight off
// these raw relation shapes, so they survive projection — trimmed to the
// columns it touches.
export function projectDocumentRowForClient(document: DocumentRow) {
  const rawPub = document.documents_in_publications[0]?.publications;
  return {
    uri: document.uri,
    data: document.data,
    documents_in_publications: rawPub
      ? [
          {
            publications: {
              uri: rawPub.uri,
              name: rawPub.name,
              identity_did: rawPub.identity_did,
              record: rawPub.record,
            },
          },
        ]
      : [],
    leaflets_in_publications: document.leaflets_in_publications.map((l) => ({
      leaflet: l.leaflet,
    })),
  };
}
