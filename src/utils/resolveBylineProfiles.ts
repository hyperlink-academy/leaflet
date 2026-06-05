import { getProfiles } from "src/identity/profileCache";
import {
  getBylineDids,
  toBylineProfiles,
  type BylineProfile,
} from "src/utils/byline";
import type { NormalizedDocument } from "src/utils/normalizeRecords";

/**
 * Resolves the byline (contributor) profiles for a post's document, given the
 * document author/owner DID (the host of the document AT-URI).
 *
 * Always returns at least the author; documents with an explicit
 * `contributors` array return every contributor in order. Server-only — relies
 * on the request-cached `getProfiles` (Redis + Bluesky) profile cache.
 *
 * Used by the feed/listing queries so the PostListing byline can render
 * contributor display names the same way the post header does.
 */
export async function resolveBylineProfiles(
  doc: Pick<NormalizedDocument, "contributors"> | null | undefined,
  authorDid: string,
): Promise<BylineProfile[]> {
  const dids = getBylineDids(doc, authorDid);
  const profiles = await getProfiles(dids);
  return toBylineProfiles(dids, profiles);
}
