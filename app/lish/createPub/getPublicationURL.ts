import { AtUri } from "@atproto/syntax";
import { PubLeafletPublication } from "lexicons/api";
import { isProductionDomain } from "src/utils/isProductionDeployment";
import { Json } from "supabase/database.types";
import {
  normalizePublicationRecord,
  isLeafletPublication,
  hasLeafletContent,
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
  if (normalized?.url && isProductionDomain()) {
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
 * For non-leaflet documents (content.$type !== "pub.leaflet.content"),
 * always uses the full publication site URL, not internal /lish/ URLs.
 */
export function getDocumentURL(
  doc: NormalizedDocument,
  docUri: string,
  publication?: PublicationInput | NormalizedPublication | null,
): string {
  const path = doc.path || "/" + new AtUri(docUri).rkey;
  const aturi = new AtUri(docUri);

  const isNormalized =
    !!publication &&
    (publication as NormalizedPublication).$type === "site.standard.publication";
  const normPub = isNormalized
    ? (publication as NormalizedPublication)
    : publication
      ? normalizePublicationRecord((publication as PublicationInput).record)
      : null;
  const pubInput = isNormalized ? null : (publication as PublicationInput | null);

  // Non-leaflet documents always use the full publication site URL
  if (doc.content && !hasLeafletContent(doc) && normPub?.url) {
    return normPub.url + path;
  }

  // For leaflet documents, use getPublicationURL (may return /lish/ internal paths)
  if (pubInput) {
    return getPublicationURL(pubInput) + path;
  }

  // When we only have a normalized publication, use its URL directly
  if (normPub?.url) {
    return normPub.url + path;
  }

  // Standalone document fallback
  return `/p/${aturi.host}${path}`;
}
