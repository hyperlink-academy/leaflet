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
