# Performance Plan: Reduce TTL + Fast Navigation

## Context

Every route in the app is dynamically rendered because the root layout (`app/layout.tsx`) calls `headers()` and `getIdentityData()`. The `staleTimes: { dynamic: 600 }` config means revisiting a previously-loaded page within 10 min is instant (Router Cache), but **first visits** to sibling pages are slow because each page.tsx re-runs `getIdentityData()` — a deeply nested Supabase query that fetches identity, home leaflet with all facts, publications, subscriptions, entitlements, and more.

On the leaflet page, `generateMetadata` and the page component independently fetch the same data (doubled DB calls), and all secondary data (RSVP, polls) blocks the entire render.

## Phase 1: Deduplicate leaflet page fetches

**Goal**: Eliminate doubled DB queries on every leaflet page load.

**File: `app/[leaflet_id]/page.tsx`**

`generateMetadata` (line 79) and `LeafletPage` (line 28) both call `get_leaflet_data.handler()` with the same `token_id`. Same for `get_facts` (lines 45 and 92). Since both run in the same request, wrapping in `cache()` deduplicates them:

```ts
import { cache } from "react";

const getCachedLeafletData = cache((token_id: string) =>
  get_leaflet_data.handler({ token_id }, { supabase: supabaseServerClient })
);

const getCachedFacts = cache((root: string) =>
  supabaseServerClient.rpc("get_facts", { root })
);
```

Replace the 4 call sites (2 in page, 2 in generateMetadata) with these cached versions.

---

## Phase 2: Add loading.tsx skeletons

**Goal**: Instant visual feedback during client-side navigation.

Create `loading.tsx` files for:
- `app/(home-pages)/home/loading.tsx` — grid skeleton matching leaflet cards
- `app/(home-pages)/looseleafs/loading.tsx` — same skeleton
- `app/(home-pages)/notifications/loading.tsx` — notification list skeleton
- `app/[leaflet_id]/loading.tsx` — document skeleton

These render immediately during route transitions while the page server component resolves. Reference the existing `app/(home-pages)/reader/loading.tsx` (uses `FeedSkeleton`) for the pattern.

---

## Phase 3: SpeedyLink on hot navigation paths

**Goal**: Trigger prefetch on hover so clicks feel instant.

**File: `app/(home-pages)/reader/layout.tsx`** (line 55)
- Reader tab links (`Subs`, `Trending`, `New`) use plain `<Link>`. Replace with `SpeedyLink`.
- SpeedyLink sets `prefetch={true}` on mouseEnter/pointerDown, triggering RSC prefetch before click.

**File: `components/PostListing.tsx`** (line 14)
- Post links in the feed use plain `<Link>`. Replace with `SpeedyLink` for the main post navigation link.
- SpeedyLink needs to support the same props PostListing passes (currently just `href`, `className`, `children` — already supported).

---

## Phase 4: Cache `getIdentityData` across requests

**Goal**: Navigating between sibling home-pages routes reuses identity data instead of re-querying DB.

**File: `actions/getIdentityData.ts`**

`unstable_cache` can't call `cookies()` inside the cached function (no request context when serving from cache). Split the function:

```ts
import { unstable_cache } from "next/cache";

// Cached core — takes auth_token as param, no request context needed
async function fetchIdentityByToken(auth_token: string) {
  // ... existing query logic using auth_token (lines 14-93)
}

// Request-scoped wrapper — reads cookies, calls cached core
export const getIdentityData = cache(async () => {
  let cookieStore = await cookies();
  let auth_token =
    cookieStore.get("auth_token")?.value ||
    cookieStore.get("external_auth_token")?.value;
  if (!auth_token) return null;

  return unstable_cache(
    () => fetchIdentityByToken(auth_token),
    [`identity-${auth_token}`],
    { revalidate: 30, tags: [`identity-${auth_token}`] }
  )();
});
```

- **Cache key**: `identity-${auth_token}` — per-user cache entry
- **TTL**: 30 seconds — short enough for fresh notification counts, long enough for rapid navigation (home → reader → notifications without re-querying)
- **Tags**: Enable manual invalidation from identity-mutating server actions
- **Outer `cache()`**: Still deduplicates within a single request (layout + page)

**Invalidation**: In actions that mutate identity-related data (login, logout, create/delete leaflet, subscribe/unsubscribe), add:
```ts
revalidateTag(`identity-${auth_token}`);
```

Key actions to audit:
- `actions/auth/` — login/logout
- `actions/createLeaflet.ts` — adds to homepage
- `actions/deleteLeaflet.ts` — removes from homepage
- `actions/subscriptions/` — subscription changes
- Any action that mutates `identities`, `permission_token_on_homepage`, `publications`, or `user_subscriptions` tables

**No changes needed to consumers** — the function signature stays the same. All pages that call `getIdentityData()` automatically benefit.

---

## Phase 5: Suspense boundaries for secondary leaflet data

**Goal**: Stream the main document content immediately, load RSVP/poll data in the background.

**File: `app/[leaflet_id]/page.tsx`**

Currently (line 44):
```ts
let [{ data }, rsvp_data, poll_data] = await Promise.all([
  getCachedFacts(rootEntity),
  getRSVPData(...),
  getPollData(...),
]);
```

Restructure to only await facts at the top level. Create an async component for secondary data:

```tsx
async function SecondaryData({ entity_sets, leaflet_id, leaflet_data }: {...}) {
  let [rsvp_data, poll_data] = await Promise.all([
    getRSVPData(entity_sets),
    getPollData(entity_sets),
  ]);
  return (
    <PageSWRDataProvider rsvp_data={rsvp_data} poll_data={poll_data}
      leaflet_id={leaflet_id} leaflet_data={leaflet_data} />
  );
}
```

Then in the page:
```tsx
<Suspense fallback={<Leaflet ... />}>
  <SecondaryData ...>
    <Leaflet ... />
  </SecondaryData>
</Suspense>
```

This depends on whether `PageSWRDataProvider` can be split so the Leaflet renders without RSVP/poll data initially. Check if those are optional — if the SWR provider just seeds client-side caches, the Leaflet should render fine without them initially.

---

## Verification

1. **Phase 1**: Open a leaflet page, check server logs — should see 1 call to `get_leaflet_data` and 1 call to `get_facts` instead of 2 each.
2. **Phase 2**: Navigate between home-pages routes — should see skeleton UI immediately during transition.
3. **Phase 3**: Hover over reader tabs / post listings — network tab should show prefetch requests.
4. **Phase 4**: Navigate home → reader → notifications rapidly — second and third navigations should be faster (check server logs for `getIdentityData` cache hits). Verify identity data is still fresh after login/logout.
5. **Phase 5**: Load a leaflet with polls/RSVP — main content should appear before poll/RSVP data resolves.
6. Run `npx tsc` and `npm run lint` after all changes.

## Critical files
- `app/[leaflet_id]/page.tsx`
- `actions/getIdentityData.ts`
- `app/(home-pages)/reader/layout.tsx`
- `components/PostListing.tsx`
- `components/SpeedyLink.tsx`
- `app/(home-pages)/reader/loading.tsx` (reference for skeleton pattern)
