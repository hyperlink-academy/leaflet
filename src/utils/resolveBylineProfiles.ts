import { AtUri } from "@atproto/api";
import { getProfiles } from "src/identity/profileCache";
import {
  getBylineDids,
  hasExplicitByline,
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

/**
 * Enriches a list of publication posts with their byline contributor profiles,
 * resolving every post's DIDs in a single batched `getProfiles` call (no N+1).
 *
 * Only posts with an *explicit* byline (contributors beyond the publication
 * owner — the host DID of the post AT-URI) get profiles; for the common
 * single-author post `contributors` is left empty so the publication list
 * doesn't repeat the owner's name on every row (the owner is already shown in
 * the publication header). Used by the publication home / custom-page renders.
 */
export async function withBylineProfiles<
  T extends { uri: string; record: Pick<NormalizedDocument, "contributors"> },
>(posts: T[]): Promise<(T & { contributors: BylineProfile[] })[]> {
  const perPostDids = posts.map((p) => {
    const ownerDid = new AtUri(p.uri).host;
    return hasExplicitByline(p.record, ownerDid)
      ? getBylineDids(p.record, ownerDid)
      : [];
  });
  const allDids = Array.from(new Set(perPostDids.flat()));
  const profiles = await getProfiles(allDids);
  return posts.map((p, i) => ({
    ...p,
    contributors: toBylineProfiles(perPostDids[i], profiles),
  }));
}
