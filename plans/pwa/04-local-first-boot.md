# Boot `/home` from local data before the server answers

You are implementing an architectural change in the Leaflet repo (Next.js 16.3 App Router, React 19, Replicache with IndexedDB persistence, Supabase). Read `CLAUDE.md` first. This is Tier 1, item 4 of the PWA load audit (`plans/pwa/README.md`). It depends on plans 01, 02, 03, and 05 having landed. It is staged, and stages 3 and 4 need the user's sign-off before you start them.

## Context

Today a cold launch of the installed app cannot show any app UI until the server has resolved identity and rendered the shell, because:

- `components/IdentityProvider.tsx:107` calls `use(identityPromise)`; the identity comes only from the server.
- `app/(app)/(identity)/(home-pages)/layout.tsx:30` awaits `getHomeLeaflet()` and mounts `ReplicacheProvider` with the token and `initialFacts` from that server response. The client has no way to know which Replicache store to open without the server telling it.
- The dashboard theme comes from home-leaflet facts. `plans/dynamic-static-split.md` records the reason the dashboard stayed dynamic: "Dashboard must keep server-side identity or logged-in users get a default-theme flash."

What already exists in our favor:

- Replicache persists to IndexedDB by default (`src/replicache/index.tsx:148` passes no `kvStore`), named by the home leaflet's `root_entity`, and initializes from persisted state before its first pull.
- `fetched_at` on the identity payload lets the client keep a newer snapshot over an older server seed (`IdentityProvider.tsx:118-131`).
- The yjs flush-time merge in `src/replicache/cachedServerMutationContext.ts` protects text against a stale `initialFacts` seed.
- After plan 03, the worker serves `/home` navigations network-first with a 3 s timeout and a cached fallback, so a cached copy of the last `/home` HTML and RSC payload exists on the device.
- The Next 16 docs describe the pre-paint inline-script pattern for cookie or storage-driven theming (`node_modules/next/dist/docs/01-app/02-guides/preventing-flash-before-hydration.md`), which removes the default-theme-flash reason for keeping the shell dynamic.

Two end states are possible and the choice is the user's:

- **A. Cached-shell boot.** Keep `/home` a dynamic server route. Persist a slim identity and theme snapshot client-side; apply the theme before paint from an inline script; let the worker serve `/home` from cache when a snapshot exists (StaleWhileRevalidate for that one navigation) so the page renders from the cached RSC payload plus IndexedDB, then reconciles with the fresh response and the Replicache pull. Incremental, builds on plan 03, no framework flag.
- **B. Cache Components.** Enable `cacheComponents` so the CDN serves a static shell and identity streams into a Suspense hole, with partial prefetching for instant navs. Framework-native, but it is a whole-app migration: every `dynamic`, `revalidate`, and `fetchCache` export errors, every `generateStaticParams` returning `[]` errors, the `edge` runtime route (`app/api/auth/logout/route.ts`) must move to Node, and every sync IO during prerender must move behind `connection()`. See `node_modules/next/dist/docs/01-app/02-guides/migrating-to-cache-components.md`.

Recommendation: do A now. B is a separate project and A's stages 1 and 2 are prerequisites for B anyway.

## Goal

An installed-app launch of `/home` on a warm device paints the real dashboard (correct theme, sidebar, the user's leaflets from IndexedDB) within a few hundred milliseconds, before any server response, then updates in place when the server responds. A launch with no network still shows the dashboard.

## Stage 1: instrumentation (do first, ship independently)

Without field numbers this work cannot be judged. Add launch marks and a beacon:

1. Add `instrumentation-client.ts` at the repo root (see `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md`). In it, `performance.mark("leaflet:doc-start")` and record `matchMedia("(display-mode: standalone)").matches` and `navigator.serviceWorker?.controller != null`.
2. In the dashboard shell, mark `leaflet:shell-paint` on first commit of `DashboardShell`, `leaflet:local-render` when the first leaflet card renders from Replicache data, and `leaflet:identity-ready` when the identity provider has a value.
3. Send one `launch` event to Tinybird through the existing `trackUserEvent` path (`src/activeUserAnalytics.ts`) with: the three durations from navigation start, `standalone`, `sw_controlled`, `launch_type` (`cold` when `performance.getEntriesByType("navigation")[0].type === "navigate"` and no SW controller, `warm` when controlled, `soft` for client transitions via `onRouterTransitionStart`), and the route. Keep the property names stable; they become a Tinybird pipe.
4. Verify rows land in `user_events` (the memory notes the append token works for `page_view`).

## Stage 2: client-side identity and theme snapshot

1. In `IdentityContextProvider`, whenever `identity` changes to a non-null value, write a snapshot to `localStorage` under `leaflet:identity-snapshot:v1`: `id`, `atp_did`, `email` (optional), the home leaflet token id and `root_entity`, `fetched_at`. Clear it on logout and on identity change (`useReloadOnIdentityChange`, `src/identityBroadcast.ts`). Never store the auth token.
2. In `ThemeProvider` (read `components/ThemeManager/ThemeProvider.tsx` to find where the CSS variables are applied; if they land on a wrapper element rather than `:root`, move the dashboard's to `:root` or mirror them there), whenever the home leaflet's theme resolves, write the resolved CSS variable map to `localStorage` under `leaflet:dashboard-theme:v1`.
3. In `app/layout.tsx`, next to the existing inline viewport script, add an inline script that, only on main-site hosts and only for dashboard paths (`/home`, `/reader`, `/notifications`, `/looseleafs`, `/settings`, `/subscriptions`, `/memberships`), reads `leaflet:dashboard-theme:v1` and sets those variables on `:root` before first paint. Guard every storage access with try/catch. Add `suppressHydrationWarning` only on the element whose attributes the script mutates (the docs require it; the memory note "never suppressHydrationWarning" is about dates, not this).
4. Verify: with a non-default dashboard theme, throttle the network and reload `/home`. The spinner or skeleton must already be in the user's theme colors. Then confirm no hydration warning in the console.

This stage alone removes the stated reason for the dashboard being dynamic, and is a prerequisite for either end state.

## Stage 3 (sign-off required): render from local state before the server answers

Implement end state A unless the user chose B.

1. **Identity from the snapshot.** Make `IdentityContextProvider` non-blocking when a snapshot exists: seed SWR's `fallbackData` from the snapshot (marked `partial: true`) instead of suspending on `use(identityPromise)`; resolve the server promise in an effect and `mutate` into place, respecting the `fetched_at` guard. Consumers that need full identity fields (entitlements, subscriptions, notifications count) must tolerate `partial` by rendering their loading state; audit `useIdentityData` callers under `components/ActionBar`, `components/PageLayouts`, and `home/`.
2. **Replicache from the snapshot.** In `(home-pages)/layout.tsx`, the server still provides `initialFacts` when it answers. Add a client path: when the snapshot has a home `root_entity` and IndexedDB has a store for it (`new Replicache({ name })` then `await rep.query(tx => tx.get("initialized"))`), mount `ReplicacheProvider` immediately with `initialFacts: []` and let the persisted state render; when the server's facts arrive, they are already fallback-only (`useEntity` prefers live data once `initialized`). Do not seed IndexedDB from `initialFacts` (that would fight the pull's CVR cookie).
3. **Shell from cache.** In the worker (plan 03), switch the `/home` navigation to StaleWhileRevalidate only when the request comes from a controlled client that has a snapshot: the page sets a cookie-free signal the worker can read (for example a `Cache Storage` marker written by the page, or a `postMessage` on load that toggles a flag in the worker's IndexedDB). Keep every other navigation NetworkFirst. The cached `/home` HTML embeds the RSC payload it was rendered with, so hydration matches it; the live identity and Replicache data then update in place.
4. **Stale-shell guards.** A cached shell can be from an older deploy: `deploymentId` (plan 03 or 12) handles chunk mismatch by hard navigation. A cached shell can be for a different user: the inline script compares the snapshot's `id` against the identity id embedded in the cached HTML (add a `data-identity` attribute on the body) and, on mismatch, `location.reload()` with cache bypass before React mounts. Logout must clear the `pages-v1` cache entry for `/home` (post a message to the worker).
5. **Double-fetch on first ever launch.** Optional: on a first-ever launch Replicache pulls a full snapshot even though `initialFacts` just arrived. Investigate returning the CVR cookie alongside `initialFacts` from `getHomeLeaflet` and seeding the store with it, so the first pull is incremental. Skip if it needs changes to `src/replicache/serverPullData.ts` beyond a day's work.

Verify with Stage 1's numbers: `leaflet:local-render` on a warm launch must precede the document's server response time. Test: throttle to Slow 3G, launch from the home screen, dashboard visible with correct theme and cards within ~500 ms; go offline, launch again, same result; log out and back in as a different account, launch, no cross-account shell; deploy a new build, launch, the update toast appears and Refresh works.

## Stage 4 (sign-off required): Cache Components (end state B)

Only if the user chooses B after Stage 2. Follow `migrating-to-cache-components.md` exactly: run the `cache-components-instant-false` codemod so every route is initially allowed to block, then convert `/home` first: remove its segment configs, wrap `headers()`/`cookies()` reads in Suspense (the `(identity)` layout already has this shape), replace the published group's `revalidate` exports with `"use cache"` + `cacheLife("hours")`, give every `generateStaticParams` at least one param, move the edge logout route to Node, enable `partialPrefetching`. Verify with `next build` that `/home` produces a non-empty App Shell and that published pages still get ISR-equivalent caching via `incremental-static-regeneration-cache-components.md`. This is a large change; plan it as its own PR series.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. Stage 1 and Stage 2 are separate PR-sized commits. Stop after Stage 2 and report; do not begin Stage 3 or 4 without the user's explicit go-ahead.
- Do not edit generated files.
- Final report per stage: what changed, the launch numbers before and after (from Stage 1), the test results listed, and anything you could not verify.
