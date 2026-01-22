/**
 * Utilities for deduplicating records that may exist under both
 * pub.leaflet.* and site.standard.* namespaces.
 *
 * After the migration to site.standard.*, records can exist in both namespaces
 * with the same DID and rkey. This utility deduplicates them, preferring
 * site.standard.* records when available.
 */

import { AtUri } from "@atproto/syntax";

/**
 * Extracts the identity key (DID + rkey) from an AT URI.
 * This key uniquely identifies a record across namespaces.
 *
 * @example
 * getRecordIdentityKey("at://did:plc:abc/pub.leaflet.document/3abc")
 * // Returns: "did:plc:abc/3abc"
 *
 * getRecordIdentityKey("at://did:plc:abc/site.standard.document/3abc")
 * // Returns: "did:plc:abc/3abc" (same key, different namespace)
 */
function getRecordIdentityKey(uri: string): string | null {
  try {
    const parsed = new AtUri(uri);
    return `${parsed.host}/${parsed.rkey}`;
  } catch {
    return null;
  }
}

/**
 * Checks if a URI is from the site.standard namespace.
 */
function isSiteStandardUri(uri: string): boolean {
  return uri.includes("/site.standard.");
}

/**
 * Deduplicates an array of records that have a `uri` property.
 *
 * When records exist under both pub.leaflet.* and site.standard.* namespaces
 * (same DID and rkey), this function keeps only the site.standard version.
 *
 * @param records - Array of records with a `uri` property
 * @returns Deduplicated array, preferring site.standard records
 *
 * @example
 * const docs = [
 *   { uri: "at://did:plc:abc/pub.leaflet.document/3abc", data: {...} },
 *   { uri: "at://did:plc:abc/site.standard.document/3abc", data: {...} },
 *   { uri: "at://did:plc:abc/pub.leaflet.document/3def", data: {...} },
 * ];
 * const deduped = deduplicateByUri(docs);
 * // Returns: [
 * //   { uri: "at://did:plc:abc/site.standard.document/3abc", data: {...} },
 * //   { uri: "at://did:plc:abc/pub.leaflet.document/3def", data: {...} },
 * // ]
 */
export function deduplicateByUri<T extends { uri: string }>(records: T[]): T[] {
  const recordsByKey = new Map<string, T>();

  for (const record of records) {
    const key = getRecordIdentityKey(record.uri);
    if (!key) {
      // Invalid URI, keep the record as-is
      continue;
    }

    const existing = recordsByKey.get(key);
    if (!existing) {
      recordsByKey.set(key, record);
    } else {
      // Prefer site.standard records over pub.leaflet records
      if (isSiteStandardUri(record.uri) && !isSiteStandardUri(existing.uri)) {
        recordsByKey.set(key, record);
      }
      // If both are same namespace or existing is already site.standard, keep existing
    }
  }

  return Array.from(recordsByKey.values());
}

/**
 * Deduplicates records while preserving the original order based on the first
 * occurrence of each unique record.
 *
 * Same deduplication logic as deduplicateByUri, but maintains insertion order.
 *
 * @param records - Array of records with a `uri` property
 * @returns Deduplicated array in original order, preferring site.standard records
 */
export function deduplicateByUriOrdered<T extends { uri: string }>(
  records: T[]
): T[] {
  const recordsByKey = new Map<string, { record: T; index: number }>();

  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    const key = getRecordIdentityKey(record.uri);
    if (!key) {
      continue;
    }

    const existing = recordsByKey.get(key);
    if (!existing) {
      recordsByKey.set(key, { record, index: i });
    } else {
      // Prefer site.standard records over pub.leaflet records
      if (isSiteStandardUri(record.uri) && !isSiteStandardUri(existing.record.uri)) {
        // Replace with site.standard but keep original position
        recordsByKey.set(key, { record, index: existing.index });
      }
    }
  }

  // Sort by original index to maintain order
  return Array.from(recordsByKey.values())
    .sort((a, b) => a.index - b.index)
    .map((entry) => entry.record);
}
