# Make viewer-independent RPC reads CDN-cacheable

You are implementing an API caching change in the Leaflet repo (Next.js 16.3 route handlers on Vercel). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

- All RPC commands go through `POST /api/rpc/<command>` (`app/api/rpc/[command]/route.ts:67`, router in `app/api/rpc/lib.ts:31-91`). The router rejects non-POST with 404 "Only POST Supported". Responses set `Access-Control-Allow-Origin: *` and no `Cache-Control`. The client is `callRPC = makeAPIClient<Routes>("/api/rpc")` (`app/api/rpc/client.ts`), which always POSTs JSON.
- Several commands are read-only and viewer-independent, called from published pages by every reader, and each call is an uncacheable function invocation: `get_profiles` (Redis-backed, `[command]/get_profiles.ts`), `get_standard_site_posts`, `get_standard_site_publications`, `get_document_recommends`, `get_publication_recommendations`, `search_publication_names`, `get_document_interactions` (verify), and `get_hot_feed`, which duplicates `GET /api/hot_feed` (`app/api/hot_feed/route.ts`) that already returns `public, max-age=60, s-maxage=300, stale-while-revalidate=3600`.
- Vercel's CDN caches responses that carry `s-maxage` or `stale-while-revalidate` and no `Set-Cookie`, per region, keyed by URL.

## Goal

The viewer-independent reads are `GET` requests with `Cache-Control` and `CDN-Cache-Control` so repeated calls across readers collapse to roughly one origin hit per TTL per region, without changing any call site's return type.

## Steps

1. **Route metadata.** Extend `makeRoute` in `lib.ts` with an optional `cache?: { sMaxAge: number; staleWhileRevalidate: number; maxAge?: number }`. Routes that set it are GET-capable. Read the handler files for each candidate and confirm none reads cookies, headers, or identity (grep for `cookies(`, `getAuthIdentity`, `getIdentityData`, `getSessionDid`, `getValidAuthToken`) before marking it. Suggested values: `get_profiles` 300/3600; `get_standard_site_posts`, `get_standard_site_publications` 300/3600; `get_document_recommends`, `get_publication_recommendations`, `get_document_interactions` 60/600; `search_publication_names` 60/600. Delete `get_hot_feed` and point its one caller at `GET /api/hot_feed`.
2. **Router.** In `makeRouter`, accept `GET` for routes with `cache`: read the input from a single `?input=` query param holding base64url-encoded JSON, validate with the same zod schema, and respond with `Cache-Control: public, max-age=<maxAge ?? 0>, s-maxage=<sMaxAge>, stale-while-revalidate=<swr>` and `CDN-Cache-Control` with the same s-maxage/swr. Errors (400/404/500) must be `no-store`. Keep POST working for every route so nothing breaks during rollout.
3. **Client.** `makeAPIClient` has only types at runtime. Add a tiny shared module `app/api/rpc/cacheableRoutes.ts` that exports the `Set` of GET-capable route names and is imported by both the router (to assert consistency at startup) and the client. In the client, when the route is in the set, canonicalize the input (sort object keys; sort arrays of DIDs) so equal requests produce equal URLs, and issue `GET` with `?input=`. If the encoded URL exceeds ~2,000 characters, fall back to POST.
4. **Batching.** `get_profiles` is called with DID arrays; `src/identity/profileCache.ts` batches at 25. Sorting the DIDs keeps cache keys stable across callers that ask for the same set in a different order.
5. **Response hygiene.** Confirm no GET response sets a cookie or varies on one. Keep `Access-Control-Allow-Origin: *`.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit` (add a unit test for the input encoding round-trip and canonicalization); `npm run check-published-purity`; `npm run format:changed`.
- `npx next build && npx next start`: `curl -i "http://localhost:3000/api/rpc/get_profiles?input=<encoded>"` returns 200 with the cache headers; a malformed input returns 400 with `no-store`; POST to the same route still works.
- On a preview deploy, load a published post twice and check the `x-vercel-cache` header on the GET calls goes `MISS` then `HIT`.
- Grep for every `callRPC("get_hot_feed"` and confirm none remain.

## Working rules

- Follow `CLAUDE.md` comment rules. The comment worth writing is on `cacheableRoutes.ts`: why the set exists separately from the route definitions.
- Branch off `main`. Commit router, client, then the route flags. Do not push or open a PR.
- Final report: the routes marked cacheable with TTLs, any candidate you rejected and why, the curl output, and anything you could not verify.
