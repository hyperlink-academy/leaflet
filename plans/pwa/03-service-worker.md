# Replace the dead service worker with real runtime caching

You are implementing a PWA change in the Leaflet repo (Next.js 16.3 App Router, Turbopack, deployed on Vercel; installed as a standalone PWA with `start_url` `/home`). Read `CLAUDE.md` first. This is Tier 1, item 3 of the PWA load audit (`plans/pwa/README.md`).

## Context

- `public/worker.js` is registered on every page by `components/ServiceWorker.tsx` (`navigator.serviceWorker.register("/worker.js")`, no options). Its only `fetch` handler intercepts URLs containing `?local` and reads a Cache API bucket named `minilink-user-assets`. Nothing in `app/`, `components/`, or `src/` produces such URLs or writes to the Cache API anymore, so the worker does nothing. It calls `skipWaiting()` on every install and `clients.claim()` on activate.
- Result: every launch of the installed app is a full network round trip before any app UI, and a flaky connection shows the browser error page, even though Replicache keeps the home leaflet in IndexedDB.
- `next.config.js` `headers()` has one rule (robots on OG images). `/worker.js` is served with Vercel's default static caching, and registration does not pass `updateViaCache`.
- `/_next/static/**` chunks are content-hashed and already served `public, max-age=31536000, immutable` by Next.
- The root layout is shared by custom-domain publication sites (middleware rewrites them to `/lish/...`). The service worker is per origin, so a worker registered from the root layout would install on every reader's custom domain too.
- RSC requests carry an `RSC: 1` header and a `_rsc` query param whose value varies with router state. Dynamic pages are `private, no-cache, no-store`. Server actions are POSTs to the page URL.
- The Next 16 docs (`node_modules/next/dist/docs/01-app/02-guides/progressive-web-apps.md` and `offline-support.md`) recommend Serwist for offline caching, `updateViaCache: "none"` on registration, and serving the worker file with `Cache-Control: no-cache, no-store, must-revalidate`. Serwist's webpack plugin does not work under Turbopack; its Turbopack integration compiles the worker through a route handler. Read https://serwist.pages.dev/docs/next/getting-started and the Turbopack guide linked from it before choosing.

## Goal

- A warm launch downloads zero JavaScript, CSS, or fonts: everything under `/_next/static` and the app's own static assets is served from the worker's cache.
- Navigations and RSC fetches go network-first with a short timeout and fall back to the last cached response, so slow or flaky networks degrade to "slightly stale" instead of "error page".
- Updates are safe: a new deploy never yanks chunks out from under an open editor, and the user gets the existing "Leaflet has been updated, refresh" toast.
- No caching of anything that could leak between users or bypass server-action semantics.

## Non-goals

- No precache manifest and no app-shell serving in this pass; that is `plans/pwa/04-local-first-boot.md`.
- No push notifications.
- Do not cache `/api/**`, any POST, or any cross-origin response.

## Steps

### 1. Choose the build integration

Check whether `@serwist/turbopack` (or the current name of Serwist's Turbopack integration) installs and builds cleanly with Next 16.3 and Turbopack: `npm view` the package, read its README, and try a minimal build. If it works, use it for the strategy and expiration primitives. If it does not, write the worker by hand in `public/worker.js` with the Cache API and the same strategies; the runtime rules below are small enough that a hand-written worker is acceptable. Record the decision and why in the commit message, not in a code comment.

Keep the registered path `/worker.js` so existing registrations update in place rather than leaving a stale worker beside a new one.

### 2. Runtime caching rules

Apply in this order; the first match wins. Every handler is GET-only and same-origin unless stated. Never call `respondWith` for anything else.

| Match                                                                                                               | Strategy                                 | Cache       | Limits                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/_next/static/**`                                                                                                  | CacheFirst                               | `static-v1` | 300 entries, 1 year                                                                                                                               |
| `/_next/image/**`                                                                                                   | none (not used; custom loader)           |             |                                                                                                                                                   |
| same-origin `/fonts/**`, `/illustrations/**`, `/logos/**`, `/templates/**`, `/*.png`, `/*.svg`, `/*.webp`, `/*.ico` | StaleWhileRevalidate                     | `assets-v1` | 100 entries, 30 days                                                                                                                              |
| `request.mode === "navigate"` on main-site hosts                                                                    | NetworkFirst, `networkTimeoutSeconds: 3` | `pages-v1`  | 50 entries, 7 days; only cache status 200; skip URLs containing `token=` and the auth callback route in `src/crossSiteAuth.ts`                    |
| `RSC: 1` header, GET, main-site host                                                                                | NetworkFirst, timeout 3 s                | `rsc-v1`    | 100 entries, 1 day; only status 200; skip `Next-Router-Prefetch: 1` requests (prefetches must not populate the fallback cache with partial trees) |
| everything else                                                                                                     | passthrough                              |             |                                                                                                                                                   |

Notes for the implementer:

- Do not use StaleWhileRevalidate for navigations or RSC. Stale RSC bypasses Next's router-cache invalidation after server actions, and the `_rsc` key varies with router state, so cached entries would multiply.
- Do not cache cross-origin responses to `<img>` requests (they are opaque and count against quota at a padded size). Supabase image bytes stay on the Supabase CDN.
- The `pages-v1` fallback is what makes "open the app on the subway" show the last-seen `/home` instead of an error. The page then hydrates and Replicache serves local data. That is the intended behavior.
- On Vercel a redeploy can make old `/_next/static` chunks 404. CacheFirst covers the common case; the update flow in step 4 covers the rest.

### 3. Navigation preload

Enable `registration.navigationPreload` in `activate` and consume `event.preloadResponse` in the navigation NetworkFirst handler. Serwist does this with `enableNavigationPreload()`; by hand, await `preloadResponse` before falling back to `fetch`.

### 4. Lifecycle and updates

- Remove the unconditional `skipWaiting()`. The new worker waits until the page posts `{ type: "SKIP_WAITING" }`.
- On the page side (`components/ServiceWorker.tsx`): listen for `registration.updatefound`; when the new worker reaches `installed` and `navigator.serviceWorker.controller` exists, show the existing stale-client toast (`markClientStale` in `components/Blocks/TextBlock/schemaVersion.tsx`, or its new home if `plans/pwa/01-bundle-cuts.md` has landed). The toast's Refresh button already reloads; before reloading, post `SKIP_WAITING` to `registration.waiting` and reload on `controllerchange`.
- `clients.claim()` on activate stays.
- On activate, delete caches whose names don't match the current `-v1` set.
- Register only on main-site hosts (`isMainSiteHost` in `src/utils/customDomain.ts`) so reader-facing custom domains do not get a worker. Register after the `load` event or in `requestIdleCallback` so it does not compete with hydration on a cold load.
- Pass `{ scope: "/", updateViaCache: "none" }` to `register`.
- After registration succeeds, call `navigator.storage.persist()` once (guarded, ignore rejection) so Safari does not evict the caches and IndexedDB under storage pressure.

### 5. Headers

Add a `headers()` rule in `next.config.js` for `/worker.js`: `Cache-Control: no-cache, no-store, must-revalidate`, `Content-Type: application/javascript; charset=utf-8`. If Serwist serves the worker from a route handler instead, set the same headers there.

### 6. Version and deploy skew

Add `deploymentId` to `next.config.js` if `plans/pwa/12-config-hygiene.md` has not already: `deploymentId: process.env.VERCEL_DEPLOYMENT_ID` (verify the env var name in Vercel's docs). With it, a client whose cached page references an old deployment hard-navigates instead of failing chunk loads. Read `node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/deploymentId.md` for the exact behavior, including how server actions from a stale page are handled.

## Verification

- `npx next build && npx next start`. In Chrome DevTools, Application → Service Workers: worker active, no errors. Application → Cache Storage: after loading `/home` twice, `static-v1` holds the route's chunks and the second load's `_next/static` requests show "(ServiceWorker)" in the Network panel's Size column.
- Offline test: load `/home`, then set Network to Offline and navigate to `/reader` (previously visited) and back. Both should render from cache. Navigate to a never-visited route: should fail cleanly (browser offline page), not hang.
- Server action test: while online, create a leaflet from `/home` and subscribe to a publication from a published page. Both must work unchanged (POSTs are never intercepted).
- Update test: change any client file, rebuild, restart; with the old tab open, reload once. The toast should appear; Refresh must load the new build with no console errors about missing chunks.
- Custom domain test: on a preview deploy (or by adding a host alias locally), confirm a custom-domain publication page does not register the worker (`navigator.serviceWorker.getRegistrations()` is empty).
- iOS: install on a device from a preview deploy, launch twice, and confirm the second launch's chunk requests are served by the worker in Safari Web Inspector. If no device is available, say so.
- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit`; `npm run check-published-purity`; `npm run format:changed`.

## Working rules

- Follow `CLAUDE.md` comment rules. Comments in the worker should explain only the non-obvious: why navigations are NetworkFirst not SWR, why prefetches are skipped, why opaque responses are not cached.
- Branch off `main`. Commit after steps 2, 4, and 6. Do not push or open a PR.
- Final report: integration chosen and why, the cache rule table as implemented, test results per item above, and anything you could not verify.
