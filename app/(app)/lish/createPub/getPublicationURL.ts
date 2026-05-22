import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { Json } from "supabase/database.types";
import {
  normalizePublicationRecord,
  isLeafletPublication,
  type NormalizedDocument,
  type NormalizedPublication,
} from "src/utils/normalizeRecords";

type PublicationInput =
  | { uri: string; record: Json | NormalizedPublication | null }
  | { uri: string; record: unknown };

/**
 * Gets the public URL for a publication.
 * Works with both pub.leaflet.publication and site.standard.publication records.
 */
export function getPublicationURL(pub: PublicationInput): string {
  const normalized = normalizePublicationRecord(pub.record);

  // If we have a normalized record with a URL (site.standard format), use it
  if (normalized?.url) {
    return normalized.url;
  }

  // Fall back to checking raw record for legacy base_path
  if (
    isLeafletPublication(pub.record) &&
    pub.record.base_path &&
    isProductionDomain()
  ) {
    return `https://${pub.record.base_path}`;
  }

  return getBasePublicationURL(pub);
}

export function getBasePublicationURL(pub: PublicationInput): string {
  const normalized = normalizePublicationRecord(pub.record);
  const aturi = new AtUri(pub.uri);

  //use rkey, fallback to name
  const name = aturi.rkey || normalized?.name;
  return `/lish/${aturi.host}/${encodeURIComponent(name || "")}`;
}

/**
 * Gets the full URL for a document.
 * Always appends the document's path property.
 */
export function getDocumentURL(
  doc: NormalizedDocument,
  docUri: string,
  publication?: PublicationInput | NormalizedPublication | null,
): string {
  let path = doc.path || "/" + new AtUri(docUri).rkey;
  if (path[0] !== "/") path = "/" + path;

  if (!publication) {
    return doc.site + path;
  }

  // Already-normalized publications: use URL directly
  if (
    (publication as NormalizedPublication).$type ===
    "site.standard.publication"
  ) {
    return ((publication as NormalizedPublication).url || doc.site) + path;
  }

  // Raw publication input: delegate to getPublicationURL for full resolution
  return getPublicationURL(publication as PublicationInput) + path;
}
