# Static Publication Pages with Streamed-In Identity

**Status**: implemented — Phase 2 was built directly (no Phase 1 route-group
split): `cacheComponents` is on, the shared layout streams identity as a
promise, published pages are `"use cache"`d with tags from `src/cacheTags.ts`,
and invalidation flows from server actions (`updateTag`) and the appview via
`POST /api/revalidate` (`REVALIDATE_SECRET`, optional `REVALIDATE_URL`).

## Goal

Published publication pages (`/lish/[did]/[publication]`, `/lish/.../[rkey]`, `/p/...`, and every custom domain, which middleware rewrites into the `/lish` tree) should serve real post content on first byte, from cache, without waiting on the viewer's auth session. Identity-dependent UI (subscribe state, edit affordances, comment/vote gating) renders a logged-out placeholder in the cached HTML and gets the real identity data streamed or fetched in after.

## Why this is tractable: what's actually dynamic today

The published read path is already almost entirely viewer-independent. An audit of the render tree shows:

- **No server component on the published read path branches on the viewer.** `getPostPageData` (`app/(app)/lish/[did]/[publication]/[rkey]/getPostPageData.ts`), `fetchPublicationForPage`, `DocumentPageRenderer`, `tryRenderPublicationPage`, and both `generateMetadata` implementations use the service-role Supabase client and public bsky/constellation APIs (the external fetches already carry `next: { revalidate: 3600 }`). None read cookies or headers.
- **Every identity consumer is a client component** reading `useIdentityData()` from the SWR-backed `IdentityContext` (`components/IdentityProvider.tsx`): `SubscribeButton`/`useViewerSubscription`, `PostHeader`, `Interactions` (`EditButton`, recommend), comments UI, `PublishedPollBlock`, `QuoteHandler`. Writes go through server actions that re-derive identity server-side (`recommendAction`, `commentAction`, `voteOnPublishedPoll`), so nothing about correctness depends on the SSR'd identity.
- **Exactly two things force the whole `(app)` subtree dynamic**, both in the shared group layout `app/(app)/layout.tsx`:
  1. `IdentityProviderServer` → `getIdentityData()` → `cookies()` plus a very large `email_auth_tokens → identities` join (~15 embedded relations). This both marks the route dynamic *and* gates TTFB on the slowest query in the app.
  2. `await headers()` for `X-Vercel-IP-Country` / `accept-language` / `X-Vercel-IP-Timezone`, feeding `RequestHeadersProvider`. Its only consumer on the read path is `useLocalizedDate`, which already switches to browser `Intl` values after hydration — the header values only serve first paint.

So the entire conversion is a layout/data-plumbing change; the dozens of identity-consuming components don't need to be touched.

## Design

Two phases. Phase 1 needs no experimental flags and makes published routes fully cacheable today. Phase 2 adopts Cache Components (Next 16's PPR successor, available on our `next@16.0.7`) to eliminate the post-hydration identity roundtrip and get fine-grained data caching.

### Phase 1 — split the layout, ISR the published routes, fetch identity client-side

**1. Route-group split.** Layouts are inherited, so the published routes need a layout that doesn't touch request data. Restructure:

```
app/(app)/(dynamic)/layout.tsx      ← current layout (headers + IdentityProviderServer);
                                      home, reader, editor, dashboard, checkout, etc.
app/(app)/(published)/layout.tsx    ← static: <IdentityContextProvider initialValue={null}>
                                      + RequestHeadersProvider with nulls
app/(app)/(published)/lish/[did]/[publication]/...
app/(app)/(published)/p/[didOrHandle]/...
```

Route groups don't change URLs, so the middleware rewrite (`middleware.ts:83-88`) keeps working unchanged. The pub-scoped auth surfaces (`edit/`, `dashboard/`, `theme-settings/`, `subscribe/` with its cross-site auth) stay under `(dynamic)` — either by moving those segments or by keeping their existing `force-dynamic` + mounting `IdentityProviderServer` in their own nested layout.

**2. Client identity fetch.** `IdentityContextProvider` currently sets `revalidateOnMount: false`, trusting the server-provided `fallbackData` — with `initialValue={null}` it would never fetch. Change it to fetch when it wasn't server-seeded:

```tsx
useSWR("identity", () => getIdentityData(), {
  fallbackData: props.initialValue,
  revalidateOnMount: props.initialValue === undefined ? undefined : !props.seeded,
  ...
});
```

(Concretely: add a `seeded?: boolean` prop set by `IdentityProviderServer`; published layout omits it.) The fetcher already calls the `getIdentityData` server action, so no new endpoint is required. Optionally add a slim `getViewerData` action for the published surface — subscribe/interaction components only need `atp_did`, `email`, `bsky_profiles.handle`, `publication_subscriptions`, and `publication_email_subscribers`, a fraction of the full identity join — which cuts both latency and DB load for the most-trafficked pages.

**3. Make the routes cacheable.** With cookies/headers gone, add to the published `page.tsx` files (`lish/[did]/[publication]`, `.../[rkey]`, `.../l-quote/[quote]`, `p/[didOrHandle]/[rkey]`):

```ts
export const revalidate = 300;        // safety-net TTL; on-demand invalidation does the real work
export async function generateStaticParams() { return []; } // on-demand ISR, no build-time crawl
```

Notes:
- The 404 branches (`PubNotFound`, "post not found") get cached too. Keep the TTL modest so a just-published post that raced ingestion doesn't serve a cached 404 for long, and invalidate on ingest (below).
- `generateMetadata` on these routes is already cookie-free, so it caches with the page.
- `.../icon/route.ts` is `force-dynamic`; leave it (it's an image route, not the page).
- The client router cache (`experimental.staleTimes` = 600) already smooths intra-site navigation.

**4. Invalidation.** Two producers mutate published content:
- **In-app server actions** (`actions/publishToPublication.ts`, `actions/publishPublicationPages.ts`, theme settings, `dashboard/deletePost.ts`, `deletePublication.ts`) — several already call `revalidatePath("/lish/[did]/[publication]", "layout")`; audit that every publish/edit/delete/theme path does.
- **The appview firehose consumer** (`appview/index.ts`) — a separate Node service that upserts `documents`, `comments_on_documents`, `recommends_on_documents` directly into Postgres. Next.js never sees these writes. Add a secret-protected `app/api/revalidate/route.ts` that accepts tags/paths, and have the appview POST to it after ingesting a record affecting a publication (document upsert/delete, comment, recommend). Until Phase 2's tags land, it can call `revalidatePath` on the specific pub/post paths derived from the record's AT-URI.
- Comment/recommend counts and the comments list are baked into the cached page (`getPostPageData` fetches them; `CommentsSection` is Suspense-wrapped but still renders at revalidation time). Appview-triggered invalidation keeps them fresh enough; if that's too coarse, move counts/comments to a client fetch or defer to Phase 2 where they get their own short `cacheLife`.

**5. Dates.** With header values gone, `useLocalizedDate` first-paints UTC/`en-US`, then flips to browser locale after hydration (the flip already exists via `useHasPageLoaded`). If the flash matters, render published timestamps date-only in a locale-insensitive format server-side, or move them fully client-side behind the existing loaded gate.

**What Phase 1 buys:** TTFB is a CDN hit (notably for non-US readers — the app pins `preferredRegion: ["sfo1"]`), the giant identity join is off the critical path entirely, custom domains share one cache entry per pub since they all rewrite to the same `/lish/...` URL, and page HTML is byte-identical for every viewer. Cost: identity arrives one server-action roundtrip after hydration, so subscribe/edit affordances settle ~100–300 ms later than today.

### Phase 2 — Cache Components: stream identity in the same response

Enable `cacheComponents: true` (Next 16). This gives PPR semantics: a prerendered static shell served immediately, with dynamic holes streamed in the same response.

**1. Stream identity instead of round-tripping.** The layout passes the *un-awaited* promise to the client provider — the children stay in the static shell because the layout itself never awaits request data:

```tsx
// app/(app)/layout.tsx — server component, no await of cookies/headers
export default function AppLayout({ children }) {
  return (
    <IdentityContextProvider identityPromise={getIdentityData()}>
      ...
    </IdentityContextProvider>
  );
}
```

The provider must not `use()` the promise at its top level (that would suspend the whole tree back into the hole). Instead it keeps its SWR state and resolves the promise in a leaf:

```tsx
function IdentityContextProvider({ children, identityPromise }) {
  // swr state as today, fallbackData: null
  return (
    <IdentityContext.Provider value={{ identity, mutate }}>
      {children}
      <Suspense fallback={null}>
        <IdentityResolver promise={identityPromise} onResolve={(d) => mutate(d, { revalidate: false })} />
      </Suspense>
    </IdentityContext.Provider>
  );
}
```

The prerendered shell has all identity consumers in their logged-out placeholder state; the resolved identity arrives inside the initial HTTP response's RSC stream — no second request, no route-group split needed (this restores a single shared layout). `headers()` can be threaded the same way if first-paint date locale is worth it.

**2. Cache the data layer explicitly.** Mark the read-path data functions with `"use cache"` + tags:

```ts
export async function getPostPageData(did: string, rkey: string) {
  "use cache";
  cacheLife("hours");
  // after resolving the document:
  cacheTag(`doc:${document.uri}`, `pub:${publicationUri}`);
  ...
}
```

Same for `fetchPublicationForPage` and the `generateMetadata` queries. Comments/recommend counts can be pulled out of `getPostPageData` into their own cached function with `cacheLife("minutes")`. Invalidation becomes `revalidateTag(...)` from the server actions and the appview's revalidate endpoint — precise per-document/per-publication instead of path-shaped.

**3. The migration cost — why this is Phase 2.** `cacheComponents` is app-wide, not per-route. Every route in the app must then satisfy "dynamic data access happens inside Suspense or cached functions": the editor (`[leaflet_id]`), home, reader, notifications, dashboards all read cookies via their layouts/pages today. The identity-promise pattern in the shared layout fixes the biggest offender, but each remaining dynamic page needs an audit (mostly: wrap page bodies in Suspense or add `Suspense`-boundaried loading states). That's a mechanical but broad change, which is why Phase 1 — which needs none of it — ships first and Phase 2 lands as its own effort.

## Invariants to preserve (and verify in review)

- **Nothing host-dependent renders in the published tree.** Custom domains share the `/lish/...` cache entry. Today this holds — canonical URLs and feed links come from the publication record's stored `url`, not the request host. Any future feature reading `host` on these pages breaks domain-shared caching.
- **Nothing cookie-dependent renders in the published tree.** Cached responses are cookie-blind by design. The cross-site auth flow (`external_auth_token` set by the middleware callback) still works: the cookie is read by the client-side `getIdentityData` action call / streamed promise, not by the page render.
- **Server actions keep re-deriving identity.** They already do; the cached page never carries authority.
- **Middleware still runs in front of cached responses** (domain rewrite, root redirect), and its own domain lookup is already edge-cached with `ttl: 60`.

## Rollout

1. Route-group split + provider `initialValue={null}` + client fetch, behind no flag — verify published pages render identically logged-out, and subscribe/edit state fills in.
2. Add `revalidate`/`generateStaticParams` to one route (`[rkey]` post page) first; watch cache-hit ratio and staleness reports; then extend to pub homepage, `/p/`, quote pages.
3. Appview → revalidate endpoint.
4. Phase 2 (`cacheComponents`) as a separate project once the rest of the app's dynamic pages are audited.
