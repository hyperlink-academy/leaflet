import { ids } from "lexicons/api/lexicons";

/**
 * Check if a collection is a document collection (either namespace).
 */
export function isDocumentCollection(collection: string): boolean {
  return (
    collection === ids.PubLeafletDocument ||
    collection === ids.SiteStandardDocument
  );
}

/**
 * Check if a collection is a publication collection (either namespace).
 */
export function isPublicationCollection(collection: string): boolean {
  return (
    collection === ids.PubLeafletPublication ||
    collection === ids.SiteStandardPublication
  );
}

/**
 * Check if a collection belongs to the site.standard namespace.
 */
export function isSiteStandardCollection(collection: string): boolean {
  return collection.startsWith("site.standard.");
}

/**
 * Check if a collection belongs to the pub.leaflet namespace.
 */
export function isPubLeafletCollection(collection: string): boolean {
  return collection.startsWith("pub.leaflet.");
}

/**
 * Get the document $type to use based on an existing URI's collection.
 * If no existing URI or collection isn't a document, defaults to site.standard.document.
 */
export function getDocumentType(existingCollection?: string): "pub.leaflet.document" | "site.standard.document" {
  if (existingCollection === ids.PubLeafletDocument) {
    return ids.PubLeafletDocument as "pub.leaflet.document";
  }
  return ids.SiteStandardDocument as "site.standard.document";
}

/**
 * Get the publication $type to use based on an existing URI's collection.
 * If no existing URI or collection isn't a publication, defaults to site.standard.publication.
 */
export function getPublicationType(existingCollection?: string): "pub.leaflet.publication" | "site.standard.publication" {
  if (existingCollection === ids.PubLeafletPublication) {
    return ids.PubLeafletPublication as "pub.leaflet.publication";
  }
  return ids.SiteStandardPublication as "site.standard.publication";
}
