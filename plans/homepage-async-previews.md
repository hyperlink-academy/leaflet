# Homepage Async Previews + Permission Token Metadata

## Context

The logged-in homepage at `app/(home-pages)/(writer)/home/page.tsx` is slow for users with many leaflets. The dominant costs:

1. **`getFactsFromHomeLeaflets`** calls the recursive CTE `get_facts_for_roots(tokens, max_depth=3)` (defined in `supabase/migrations/20241213050822_add_more_get_fact_functions.sql`) which returns every fact reachable from each root — full Yjs `block/text` blobs, themes, images, all blocks. Server then hydrates a `Y.Doc` per leaflet just to extract a title string from the first block.

2. **`getIdentityData`** (`actions/getIdentityData.ts`) embeds a recursive `home_leaflet:permission_tokens(... permission_token_rights → entity_sets → entities → facts)` subquery the homepage never reads, plus `documents(*)` joins on `leaflets_to_documents` and `leaflets_in_publications` that are only used as nullable existence checks.

3. **One `<ReplicacheProvider initialFactsOnly>` per leaflet** in `HomeLayout.tsx:201-237`, each receiving the full fact tree. The preview only renders the first ~10 blocks (`LeafletContent.tsx:51`) and items past index 16 are lazy-rendered (`LeafletListItem.tsx:21`), but all the data still ships up front.

The fix has two parts: move the title to a denormalized column on `permission_tokens` (maintained by a client-side mutation in the editor), and make the per-card fact bundle load asynchronously after FCP via a batshit-coalesced RPC.

## Architecture

### Title source of truth

Add `title text` and `description text` columns to `permission_tokens` (both nullable; null means "not yet populated"). The editor — not the homepage — is responsible for keeping these fresh. A debounced effect inside the document editor watches the computed first-block title and, on change, fires a Replicache mutation that writes `title` to **every** `permission_tokens` row sharing the same `root_entity`, gated on the editing user having `write = true` on at least one of them. Collaborators with read-only tokens cannot poison a title they don't own; collaborators with write tokens propagate the same value to all sibling tokens so the homepage display is consistent regardless of which token surfaced the doc.

Description is left unpopulated for now — the homepage `LeafletInfo` UI does not currently render a description. The column exists so the next iteration can fill it without another migration.

`leaflets_in_publications.title` and `leaflets_to_documents.title` already exist and are populated by `updatePublicationDraft` (`src/replicache/mutations.ts:661-721`). They continue to be the user-set publication/document title (which may differ from the document's first-block title) and remain authoritative for those contexts. The homepage prefers them in the fallback chain: `leaflets_in_publications.title || leaflets_to_documents.title || permission_tokens.title || "Untitled"`. This preserves existing semantics — explicit titles still win — while letting docs without a publication wrapper render a real title instead of "Untitled".

### Async preview load

The homepage server render returns only the data needed for the title row: tokens, archived state, titles (already in `getIdentityData` after the schema change), plus pub status derived from `leaflets_in_publications`. No `get_facts_for_roots` call.

The preview region of each card renders a skeleton until its facts arrive. A new client-side hook coalesces fetches via `@yornaath/batshit` — the same pattern already used in `components/RecommendButton.tsx:21-30`. Each `<LeafletPreview>` calls `useLeafletFacts(rootEntity)`, which calls `leafletFactsBatcher.fetch(rootEntity)`. Batshit collects all `fetch` calls within a short window (e.g. `windowScheduler(10)`) and dispatches one `callRPC("getFactsForRoots", { roots })` with every pending root, then resolves each pending Promise from the keyed result. Above-the-fold cards mount in the same React commit, fall in the same window, and batch into one RPC. Below-the-fold cards batch by IntersectionObserver tick (a subsequent batshit window).

Each card's `<ReplicacheProvider initialFactsOnly>` stays — it's the substrate `LeafletPreview`'s `useEntity` calls already use — but mounts with `initialFacts={[]}` until `useLeafletFacts` resolves, then re-mounts (via a `key={hasFacts ? "loaded" : "loading"}` swap or a setter threaded through the provider) with the populated array. Re-mount loses no state because the provider runs with `initialFactsOnly` + `disablePull` and holds no client-side mutations.

### Wire-level changes

- `actions/getIdentityData.ts`: select `permission_tokens.title, description` in the homepage select; drop the unused `home_leaflet:permission_tokens!… → entity_sets → entities → facts` recursive subquery; drop `documents(*)` joins inside `leaflets_to_documents` / `leaflets_in_publications` (only `.doc`, `.document`, `.leaflet` are read).
- `app/api/rpc/[command]/getFactsFromHomeLeaflets.ts`: drop the per-leaflet Yjs hydration loop — titles no longer come from this RPC.
- New RPC endpoint `app/api/rpc/[command]/getFactsForRoots.ts`: thin wrapper around `get_facts_for_roots(roots, max_depth=3)` returning facts grouped by root. No title extraction.
- `app/(home-pages)/(writer)/home/page.tsx`: stop calling `getFactsFromHomeLeaflets` server-side. Pass only titles + tokens to `HomeContent`.

## Implementation Steps

### 1. Schema migration — DONE

Shipped as `supabase/migrations/20260522195945_add_metadata_to_permission_tokens.sql` (commit `db8dba5e`):

```sql
alter table "public"."permission_tokens" add column "title" text;
alter table "public"."permission_tokens" add column "description" text;
```

Both nullable. No default. `supabase/database.types.ts` regenerated.

### 2. New Replicache mutation

Add `updateLeafletMetadata` to `src/replicache/mutations.ts` and the `mutations` export at line 754. Pattern mirrors `updatePublicationDraft` (`mutations.ts:661-721`):

```ts
const updateLeafletMetadata: Mutation<{
  title?: string;
  description?: string | null;
}> = async (args, ctx) => {
  await ctx.runOnServer(async (serverCtx) => {
    const updates: { title?: string; description?: string | null } = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (Object.keys(updates).length === 0) return;

    // Look up the writer's token and verify write permission.
    const { data: writerToken } = await serverCtx.supabase
      .from("permission_tokens")
      .select("root_entity, permission_token_rights(write)")
      .eq("id", ctx.permission_token_id)
      .single();
    if (!writerToken) return;
    const hasWrite = writerToken.permission_token_rights.some((r) => r.write);
    if (!hasWrite) return;

    // Propagate to every token sharing the same root_entity.
    await serverCtx.supabase
      .from("permission_tokens")
      .update(updates)
      .eq("root_entity", writerToken.root_entity);
  });
};
```

No `runOnClient` body — this is a derived/cache field maintained by the editor; the homepage reads it from the server-rendered identity payload, not from local Replicache state.

### 3. Editor-side trigger

Extend `components/utils/UpdateLeafletTitle.tsx`, which already mounts on every document page and computes the first-block title via `usePageTitle`. Add a debounced effect that compares the current computed title to a ref of the last-sent value, and fires `rep.mutate.updateLeafletMetadata({ title })` after ~500ms of idle. Use the existing `useDebouncedEffect` (`src/hooks/useDebouncedEffect.ts`) for consistency with the rest of the file.

Skip on the homepage (where this component is not mounted) and skip in read-only contexts. The `runOnServer` write-permission check is the authoritative gate; the client-side skip is just to avoid pointless RPCs.

Description: do not populate. The column exists for future use; the homepage UI does not display it today.

### 4. Async facts RPC + provider

New file `app/api/rpc/[command]/getFactsForRoots.ts` modeled on `getFactsFromHomeLeaflets.ts` but stripped of title extraction:

```ts
export const getFactsForRoots = makeRoute({
  route: "getFactsForRoots",
  input: z.object({ roots: z.array(z.string()) }),
  handler: async ({ roots }, { supabase }) => {
    const { data } = await supabase.rpc("get_facts_for_roots", {
      max_depth: 3,
      roots,
    });
    const facts: { [root: string]: Fact<Attribute>[] } = {};
    for (const f of data ?? []) {
      (facts[f.root_id] ??= []).push(f as unknown as Fact<Attribute>);
    }
    return { result: { facts } };
  },
});
```

Wire it into `app/api/rpc/[command]/route.ts` alongside the other routes.

New file `components/HomeLeafletFactsProvider.tsx`. Use `@yornaath/batshit` to coalesce per-card fetches, mirroring the pattern in `components/RecommendButton.tsx:21-30`:

```ts
import { create, windowScheduler } from "@yornaath/batshit";

const leafletFactsBatcher = create({
  fetcher: async (roots: string[]) => {
    const response = await callRPC("getFactsForRoots", { roots });
    return response.result.facts; // { [root: string]: Fact<Attribute>[] }
  },
  resolver: (results, root) => results[root] ?? [],
  scheduler: windowScheduler(10),
});

export function useLeafletFacts(root: string, enabled: boolean = true) {
  const { data, isLoading } = useSWR(
    enabled ? `leaflet-facts:${root}` : null,
    () => leafletFactsBatcher.fetch(root),
    { revalidateOnFocus: false },
  );
  return { facts: data ?? null, isLoading };
}
```

- The batcher is module-level so every `useLeafletFacts` call shares the same window. Above-the-fold cards mounting in the same commit batch into a single RPC; IntersectionObserver-triggered cards batch into the next window.
- `enabled` lets callers gate the fetch on `isVisible` (so below-the-fold cards don't pre-fetch until they enter the viewport).
- SWR's key (`leaflet-facts:${root}`) gives us dedup, in-flight sharing, and a place to `mutate(...)` from after a write if we ever need that — but the homepage is read-only against this cache so we don't need it today.
- Choose `windowScheduler(10)` to match the existing `RecommendButton` usage. If profiling shows above-the-fold cards span more than 10ms of mounting, bump it; if it's too generous, drop it.

### 5. Homepage rewiring

`app/(home-pages)/(writer)/home/page.tsx`: remove the `getFactsFromHomeLeaflets` call. Build `titles` from the identity payload's fallback chain (`leaflets_in_publications.title || leaflets_to_documents.title || permission_tokens.title`). Pass `initialFacts={{}}` to `HomeContent`.

`HomeLayout.tsx` (`HomeLeafletList`): remove the SWR `getFactsFromHomeLeaflets` call (lines 110-140). Titles come from props (server-rendered from the identity payload).

`HomeLayout.tsx` (`LeafletList`, line 201-237): each `<ReplicacheProvider>` now mounts with `initialFacts={[]}`. Wrap the children in a new component (or fold into `LeafletListItem`) that calls `useLeafletFacts(leaflet.root_entity)` and, on resolve, re-mounts the provider with the fetched facts. Two approaches:

- **Key swap** (simpler): wrap the provider in a parent that flips a `key` when facts arrive. Loses no state because `initialFactsOnly + disablePull` holds none.
- **Setter prop** (less remount churn): add an `updateInitialFacts` setter to `ReplicacheProvider` so the existing instance picks up the new array. Slightly more invasive to the provider.

Default to key swap; revisit if perf measurement shows churn matters.

`LeafletListItem.tsx`: pass `isVisible` from the IntersectionObserver (already wired) down to the new wrapper, which gates the `useLeafletFacts` call so below-the-fold cards don't pre-fetch. First-paint above-the-fold cards (index < 12, matching the existing `index < 16` heuristic — round down for safety) start their fetch immediately.

`LeafletPreview.tsx` / `LeafletContent.tsx`: while `useLeafletFacts` is loading, render the existing skeleton chrome (the bordered card frame) with the inner content area blank. The existing `isOnScreen` gate inside `LeafletContent` (`LeafletContent.tsx:30, 50`) already handles "don't render blocks yet" — the loading state is just "don't render anything, even chrome's inner content".

### 6. Backfill script

New file `scripts/backfill-permission-token-titles.ts`, modeled on `scripts/backfill-bsky-like-counts.ts`. Logic:

```
loop:
  select pt.id, pt.root_entity
  from permission_token_on_homepage pth
  join permission_tokens pt on pt.id = pth.token
  where pt.title is null
  order by pt.id
  limit 200 offset N

  for each batch of 200:
    roots = unique root_entities
    facts = supabase.rpc("get_facts_for_roots", { roots, max_depth: 3 })
    for each root:
      title = extractTitle(facts[root])   // reuse logic from getFactsFromHomeLeaflets
      update permission_tokens
        set title = title
        where root_entity = root and title is null
  break when batch empty
```

Idempotent (`title is null` gate). Safe to re-run. Only touches tokens on someone's homepage. Extract the title logic into a shared helper (e.g., `src/utils/extractTitleFromFacts.ts`) so the script, `getFactsFromHomeLeaflets`, and any future maintenance share one implementation.

### 7. Cleanup

After steps 1-6 are deployed and verified:

- Drop the Yjs hydration loop and titles result from `app/api/rpc/[command]/getFactsFromHomeLeaflets.ts` — or delete the file entirely if the new `getFactsForRoots` covers all call sites. Grep for other callers first.
- `actions/getIdentityData.ts`: drop `home_leaflet:permission_tokens!identities_home_page_fkey(*, permission_token_rights(*, entity_sets(entities(facts(*)))))` — the recursive entity_sets/entities/facts subquery is unused by the homepage. Confirm no other consumers via grep before removing.
- `actions/getIdentityData.ts`: drop `documents(*)` joins inside `leaflets_to_documents` and `leaflets_in_publications`. The homepage only reads `.doc` / `.document` as nullable existence checks; the full row is never accessed. Grep for `leaflets_to_documents.documents` / `leaflets_in_publications.documents` to confirm.
- `LeafletInfo.tsx:22-27`: remove the `useEntity("root/page")` + `usePageTitle` fallback. `props.title` from the server is authoritative once `permission_tokens.title` is populated for everyone (post-backfill).

## Open questions / risks

- **Collaborator title divergence.** Two writers editing the same document concurrently could each fire `updateLeafletMetadata` with different debounced values. Last write wins; since the value is derived deterministically from the same first-block Yjs state, the values converge once edits settle.
- **Token-less roots.** A root_entity could theoretically have zero `permission_tokens` (orphaned). The `update ... where root_entity = ?` is a no-op in that case — safe.
- **`updatePublicationDraft` interaction.** That mutation still writes title to `leaflets_in_publications` / `leaflets_to_documents` for explicit user-set titles. The fallback chain on the homepage prefers those, so explicit titles continue to override the derived `permission_tokens.title`. No conflict.
- **`ReplicacheProvider` re-mount.** Key swap drops any in-flight UndoManager state for that card, but homepage cards never mutate, so this is fine. Double-check that no preview-side code relies on persistent rep state across the loaded/loading transition.
- **First-paint cards count.** `LeafletListItem.tsx` defaults `isOnScreen` to `props.index < 16`. The new prefetch should match — pick a single constant (probably 12 to match a 3-col × 4-row grid) and use it for both `isOnScreen` and the eager-fetch gate.

## Sequencing

1. ~~Schema migration + types regeneration.~~ **Done** (commit `db8dba5e`).
2. Mutation + editor trigger. Ship alone; populates new rows organically as docs are edited.
3. Backfill script. Run once against prod after #2 is deployed.
4. New RPC + provider + homepage rewire. Ship as a unit — homepage now reads titles from `getIdentityData` and lazy-loads facts.
5. Cleanup. Ship after #4 has soaked, since it removes the old code paths.
