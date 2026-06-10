import { AtUri } from "@atproto/syntax";
import type { NormalizedDocument } from "lexicons/src/normalize";
import type { Profile } from "src/identity/profileCache";

/** A trimmed profile shape sufficient for rendering a byline. */
export type BylineProfile = {
  did: string;
  handle: string | null;
  displayName: string | null;
};

/**
 * Returns the ordered list of DIDs that should appear in a post's byline.
 *
 * When the document has a non-empty `contributors` array, their DIDs are used
 * (in order). Otherwise it falls back to the single `fallbackAuthorDid` — the
 * document author / publication owner (the host of the document AT-URI, which
 * equals publication.identity_did).
 */
export function getBylineDids(
  doc: Pick<NormalizedDocument, "contributors"> | null | undefined,
  fallbackAuthorDid: string,
): string[] {
  const contributors = doc?.contributors;
  if (contributors && contributors.length > 0)
    return contributors.map((c) => c.did);
  return [fallbackAuthorDid];
}

/**
 * Whether a document has an *explicit* byline that differs from the lone
 * publication owner. Returns false when the only byline DID is the owner (or
 * there are no contributors), so consumers fall back to byte-for-byte the
 * previous single-author behavior. Returns true otherwise.
 *
 * This is the single source of truth for the "has contributors" decision used
 * by the post page, broadcast email, and post-list rendering.
 */
export function hasExplicitByline(
  doc: Pick<NormalizedDocument, "contributors"> | null | undefined,
  ownerDid: string,
): boolean {
  const dids = getBylineDids(doc, ownerDid);
  return !(dids.length === 1 && dids[0] === ownerDid);
}

/**
 * Resolves an ordered list of byline DIDs to trimmed byline profiles
 * (preserving order), given a map produced by `getProfiles`. DIDs without a
 * resolved profile keep null handle/displayName so callers can decide how to
 * present (or drop) them.
 */
export function toBylineProfiles(
  dids: string[],
  profiles: Map<string, Pick<Profile, "handle" | "displayName"> | null>,
): BylineProfile[] {
  return dids.map((did) => {
    const p = profiles.get(did);
    return {
      did,
      handle: p?.handle ?? null,
      displayName: p?.displayName ?? null,
    };
  });
}

/** Best display label for a profile: displayName, else handle, else did. */
export function bylineName(
  profile: Pick<Profile, "did" | "handle" | "displayName">,
): string {
  return profile.displayName || profile.handle || profile.did;
}

/**
 * The separator that should precede the byline name at `index` in a list of
 * `count` names. The single source of truth for join punctuation, shared by
 * `formatBylineNames` (plain strings) and JSX consumers that interleave
 * components between names.
 *
 *   index 0                       -> ""
 *   last of 2                     -> " and "
 *   last of 3+                    -> ", and "
 *   any other (middle) position   -> ", "
 */
export function bylineSeparator(index: number, count: number): string {
  if (index === 0) return "";
  if (index === count - 1) return count > 2 ? ", and " : " and ";
  return ", ";
}

/**
 * Joins byline names in a human-friendly way:
 *   ["A"]            -> "A"
 *   ["A", "B"]       -> "A and B"
 *   ["A", "B", "C"]  -> "A, B, and C"
 */
export function formatBylineNames(names: string[]): string {
  return names.reduce(
    (acc, name, i) => acc + bylineSeparator(i, names.length) + name,
    "",
  );
}

/** A post with the minimum fields needed to resolve its byline. */
type BylinePost = {
  uri: string;
  record: Pick<NormalizedDocument, "contributors">;
};

/** The author DID for a post — the host of its document AT-URI, or null. */
function postOwnerDid(uri: string): string | null {
  try {
    return new AtUri(uri).host;
  } catch {
    return null;
  }
}

/**
 * All distinct byline DIDs across a set of posts — each post's contributors
 * when present, otherwise its author (the AT-URI host). Use to batch a single
 * `getProfiles` lookup before attaching per-post byline profiles.
 */
export function bylineDidsForPosts(posts: BylinePost[]): string[] {
  const dids = new Set<string>();
  for (const post of posts) {
    const owner = postOwnerDid(post.uri);
    if (!owner) continue;
    for (const did of getBylineDids(post.record, owner)) dids.add(did);
  }
  return Array.from(dids);
}

/**
 * Attaches resolved `bylineProfiles` (in byline order) to each post, given a
 * map of did -> profile such as the one returned by `getProfiles`. Posts whose
 * URI can't be parsed get an empty list. Used by the server render paths so
 * post-list bylines land in the initial HTML instead of being fetched on the
 * client.
 */
export function attachBylineProfiles<T extends BylinePost>(
  posts: T[],
  profiles: Map<string, Pick<Profile, "handle" | "displayName"> | null>,
): (T & { bylineProfiles: BylineProfile[] })[] {
  return posts.map((post) => {
    const owner = postOwnerDid(post.uri);
    return {
      ...post,
      bylineProfiles: owner
        ? toBylineProfiles(getBylineDids(post.record, owner), profiles)
        : [],
    };
  });
}

/**
 * Resolves byline profiles to a single human-friendly name string, dropping
 * any that only resolve to a bare DID (unresolved profile). Returns undefined
 * when nothing presentable remains. Shared by the broadcast email and preview
 * email senders.
 */
export function formatBylineProfiles(
  profiles: BylineProfile[],
): string | undefined {
  let names = profiles
    .map(bylineName)
    .filter((name) => !name.startsWith("did:"));
  return names.length > 0 ? formatBylineNames(names) : undefined;
}
