import type { Identity } from "components/IdentityProvider";
import type { Fact, PermissionToken } from "src/replicache";
import type { Attribute } from "src/replicache/attributes";

// Cards assumed on-screen before the IntersectionObserver has fired: the home
// page server-renders their previews, and cards past them fetch on scroll.
export const EAGERLY_VISIBLE_CARDS = 16;
type Listed = { added_at: string; token: { root_entity: string } };
// Home's default card order. The server seeds previews for the first cards in
// this order, so it has to be the same comparator the list sorts by.
export const newestFirst = (a: Listed, b: Listed) =>
  a.added_at === b.added_at
    ? a.token.root_entity > b.token.root_entity
      ? -1
      : 1
    : a.added_at > b.added_at
      ? -1
      : 1;

// The leaflets on the viewer's home: their homepage rows plus the drafts they
// contribute to.
export function identityHomeLeaflets(identity: NonNullable<Identity>) {
  let owned = identity.permission_token_on_homepage.map((ptoh) => ({
    added_at: ptoh.created_at,
    token: ptoh.permission_tokens as PermissionToken,
    archived: ptoh.archived,
  }));
  let ownedIds = new Set(owned.map((l) => l.token.id));
  let contributed = (identity.contributor_leaflets ?? [])
    .filter((row) => !ownedIds.has(row.permission_tokens.id))
    .map((row) => ({
      added_at: row.created_at,
      token: row.permission_tokens as unknown as PermissionToken,
      // Contributed leaflets have no personal homepage row, so archived
      // state comes from the publication's draft list
      archived:
        row.permission_tokens.leaflets_in_publications?.some(
          (l) => l.archived,
        ) ?? false,
    }));
  return [...owned, ...contributed];
}

// LeafletContent renders a doc page's first 10 blocks.
const PREVIEW_BLOCKS = 10;

// The facts a home card preview reads: everything reachable from the root,
// with every block list cut to the blocks a preview can show (the first N of a
// flattened list only ever use each list's first N children).
export function toPreviewFacts(root: string, facts: Fact<Attribute>[]) {
  let byEntity = Map.groupBy(facts, (f) => f.entity);
  let kept: Fact<Attribute>[] = [];
  let seen = new Set<string>();
  let stack = [root];
  while (stack.length) {
    let entity = stack.pop()!;
    if (seen.has(entity)) continue;
    seen.add(entity);
    let entityFacts = byEntity.get(entity) ?? [];
    let shownBlocks = new Set(
      entityFacts
        .filter((f) => f.attribute === "card/block")
        .sort((a, b) =>
          (a.data as { position: string }).position >
          (b.data as { position: string }).position
            ? 1
            : -1,
        )
        .slice(0, PREVIEW_BLOCKS),
    );
    for (let f of entityFacts) {
      if (f.attribute === "card/block" && !shownBlocks.has(f)) continue;
      let { id, attribute, data } = f;
      kept.push({ id, entity, attribute, data });
      if (data.type.endsWith("reference"))
        stack.push((data as { value: string }).value);
    }
  }
  return kept;
}
