import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";

/**
 * Returns an OR filter string for Supabase queries to match either namespace URI.
 * Used for querying documents that may be stored under either pub.leaflet.document
 * or site.standard.document namespaces.
 */
export function documentUriFilter(did: string, rkey: string): string {
  const standard = AtUri.make(did, ids.SiteStandardDocument, rkey).toString();
  const legacy = AtUri.make(did, ids.PubLeafletDocument, rkey).toString();
  return `uri.eq.${standard},uri.eq.${legacy}`;
}

/**
 * Returns an OR filter string for Supabase queries to match either namespace URI.
 * Used for querying publications that may be stored under either pub.leaflet.publication
 * or site.standard.publication namespaces.
 */
export function publicationUriFilter(did: string, rkey: string): string {
  const standard = AtUri.make(did, ids.SiteStandardPublication, rkey).toString();
  const legacy = AtUri.make(did, ids.PubLeafletPublication, rkey).toString();
  return `uri.eq.${standard},uri.eq.${legacy}`;
}

/**
 * Returns an OR filter string for Supabase queries to match a publication by name
 * or by either namespace URI. Used when the rkey might be the publication name.
 */
export function publicationNameOrUriFilter(did: string, nameOrRkey: string): string {
  const standard = AtUri.make(did, ids.SiteStandardPublication, nameOrRkey).toString();
  const legacy = AtUri.make(did, ids.PubLeafletPublication, nameOrRkey).toString();
  return `name.eq.${nameOrRkey},uri.eq.${standard},uri.eq.${legacy}`;
}
