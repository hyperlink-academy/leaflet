# 01b — Home card previews: no loading state, one monotonic transition

## Problem (observed by the user on a Vercel build of pwa/integration)

Home leaflet cards show a separate loading state for their preview content,
and on at least one load the card visibly went loading → content → loading →
content. The user wants:

1. **No loading placeholder for preview content.** A blank card body that
   fills in when content is ready is fine (the card frame, title and metadata
   render immediately; the block preview simply appears).
2. **A double transition must be structurally impossible**, not merely rare.
   Each card body goes blank → content exactly once per mount and never back.
3. The whole interaction simplified: fewer moving parts, fewer states.

## Where the transitions come from today

All in `app/(app)/(identity)/(home-pages)/(writer)/home/LeafletList/`:

- `HomeLeafletFactsProvider.tsx` — `useLeafletFacts(root, enabled)` is an
  SWR hook whose key flips from `null` to `leaflet-facts:<root>` when the
  card is reported visible, with default `revalidateIfStale`, so a key that
  already has cached data can still refetch and re-deliver.
- `LeafletCardReplicache.tsx` — `providerKey` is
  `${id}:${facts ? "loaded" : "loading"}`, so the `ReplicacheProvider` (and
  the whole card subtree) is **remounted** when facts arrive. That is a
  loading → content transition by construction, and any later change of
  `facts` identity (SWR revalidate, re-batched result) remounts again.
- `LeafletContent.tsx` — reads blocks via `useBlocks` (mirror populates
  async after provider creation, see the block-structure-mirror notes in
  CLAUDE.md-adjacent memory: mirror fills in a tick after creation, so
  `blocks` is `[]` first, then populated: another blank → content step),
  gates on `props.isOnScreen`, and (from plan 01) lazy-loads `CanvasContent`
  via `next/dynamic` with the default loading fallback for canvas leaflets.
- `LeafletPreview.tsx` / `LeafletListItem.tsx` — check for any explicit
  loading / skeleton UI for the preview body and any `isLoading` reads.
- Plan 06's `DashboardSkeleton` / `loading.tsx` boundaries and plan 02's
  `IdentityProvider` `mutate(...)` on `initialValue` can re-render the list;
  confirm neither can drive a card back to a blank body.

Start by reproducing: production build, throttled network, log every
mount/unmount of `ReplicacheProvider` per card and every render of the
preview body with its block count. Write the observed sequence in the report
before changing anything.

## Goal state

- Card body renders nothing (no spinner, no skeleton, no placeholder) until
  facts are available, then renders the preview. No `next/dynamic` loading
  fallback for the canvas path either: pass `loading: () => null` or
  preload the chunk with the facts.
- Facts arrive **once** per card mount and are then immutable for that
  mount: no provider remount on facts arrival (seed the provider once, or
  gate rendering the provider until facts exist so it mounts exactly once
  with `initialFacts`), no SWR revalidation on an already-populated key
  (`revalidateIfStale: false`, `revalidateOnMount` only when empty, or a
  plain once-per-root promise cache instead of SWR if that is simpler).
- Model it as a one-way latch: `notVisible → fetching → ready`. Encode it so
  the type system or the component structure forbids going backwards (e.g.
  the ready subtree is mounted only under `facts !== null` and `facts` is
  never set back to null; no `key` derived from loading state).
- Keep the batching (`@yornaath/batshit` window) and the
  `EAGERLY_VISIBLE_CARDS` single-RPC behaviour for the first screen.
- Keep plan 04a's `recordLaunchMark("local-render")` firing on the first
  real content render.
- Remove whatever becomes dead (loading branches, `isLoading` plumbing).

## Steps

1. Reproduce and log the transition sequence (report section "Observed").
2. Rewrite the three files above to the latch model; delete loading UI.
3. Prove it: a small unit test or an assertion in dev that the preview body
   never transitions from non-empty to empty for the same mount (a ref that
   records `hadContent` and throws/logs if `blocks.length` drops to 0 after
   being > 0 while facts are unchanged). Keep the guard if it is cheap;
   otherwise describe the structural argument in the report.
4. `verify.sh`; then the production build again with the same logging:
   exactly one provider mount per visible card, one body transition.

## Coordination

Task 02b is concurrently reworking identity fetching (`actions/getIdentityData.ts`,
`src/identityCache.ts`, `components/IdentityProvider.tsx`). Do not edit
those files; if the flicker traces to `IdentityProvider`, report it and
stop at the card-level fix.
