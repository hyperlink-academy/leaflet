/**
 * Utilities for normalizing pub.leaflet and site.standard records from database queries.
 *
 * These helpers apply the normalization functions from lexicons/src/normalize.ts
 * to database query results, providing properly typed normalized records.
 */

import {
  normalizeDocument,
  normalizePublication,
  type NormalizedDocument,
  type NormalizedPublication,
} from "lexicons/src/normalize";
import type { Json } from "supabase/database.types";

/**
 * Normalizes a document record from a database query result.
 * Returns the normalized document or null if the record is invalid/unrecognized.
 *
 * @param data - The document record data from the database
 * @param uri - Optional document URI, used to extract the rkey for the path field when normalizing pub.leaflet records
 *
 * @example
 * const doc = normalizeDocumentRecord(dbResult.data, dbResult.uri);
 * if (doc) {
 *   // doc is NormalizedDocument with proper typing
 *   console.log(doc.title, doc.site, doc.publishedAt);
 * }
 */
export function normalizeDocumentRecord(
  data: Json | unknown,
  uri?: string
): NormalizedDocument | null {
  return normalizeDocument(data, uri);
}

/**
 * Normalizes a publication record from a database query result.
 * Returns the normalized publication or null if the record is invalid/unrecognized.
 *
 * @example
 * const pub = normalizePublicationRecord(dbResult.record);
 * if (pub) {
 *   // pub is NormalizedPublication with proper typing
 *   console.log(pub.name, pub.url);
 * }
 */
export function normalizePublicationRecord(
  record: Json | unknown
): NormalizedPublication | null {
  return normalizePublication(record);
}

/**
 * Type helper for a publication row from the database with normalized record.
 * Use this when you need the full row but with typed record.
 */
type PublicationRowWithNormalizedRecord<
  T extends { record: Json | unknown }
> = Omit<T, "record"> & {
  record: NormalizedPublication | null;
};

/**
 * Normalizes a publication row in place, returning a properly typed row.
 */
export function normalizePublicationRow<T extends { record: Json | unknown }>(
  row: T
): PublicationRowWithNormalizedRecord<T> {
  return {
    ...row,
    record: normalizePublicationRecord(row.record),
  };
}

/**
 * Type guard for filtering normalized publication rows with non-null record.
 * Use with .filter() after .map(normalizePublicationRow) to narrow the type.
 */
export function hasValidPublication<
  T extends { record: NormalizedPublication | null }
>(row: T): row is T & { record: NormalizedPublication } {
  return row.record !== null;
}

// Re-export the core types and functions for convenience
export {
  type NormalizedDocument,
  type NormalizedPublication,
} from "lexicons/src/normalize";

export {
  isLeafletPublication,
  hasLeafletContent,
  getDocumentPages,
} from "lexicons/src/normalize";
