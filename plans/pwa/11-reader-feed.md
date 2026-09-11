# Cheaper reader feeds

You are implementing a server performance change in the Leaflet repo (Next.js 16.3, Supabase, Redis, AT Protocol). Read `CLAUDE.md` first. This is Tier 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

- `/reader` (inbox) calls `getReaderFeed` (`actions/reader/getReaderFeed.ts:17-79`): `getAuthIdentity()`, then `supabase.rpc("get_reader_feed", { p_limit: 25 })`, then `Promise.all(feed.map(enrichDocumentToPost))`.
- `enrichDocumentToPost` (`src/utils/enrichPost.ts:33-90`) per post: `idResolver.did.resolve(host)` (Redis-cached DID doc, `src/identity/idResolver.ts`), `getAccurateMentionsCount` → `getConstellationBacklinks` (`src/utils/getPostPageData.ts` ~line 330), which is four parallel `fetch`es to `constellation.microcosm.blue` with `next: { revalidate: 3600 }`, plus a `document_mentions_in_bsky` query when any backlink exists; then `resolveBylineProfiles` → `getProfiles` (Redis). So a cold inbox is up to 25 × (1 + 4 + 1) outbound calls, bounded only by Redis and the one-hour fetch cache. Nothing caches the assembled feed.
- `/reader/new` (`actions/reader/getNewFeed.ts`) is the same enrichment over a public newest-25 query with no cache at all.
- `/reader/trending` is the good example: `actions/reader/getHotFeed.ts:17-27` reads Redis `hot_feed_v1` (300 s) and the client refetches via the CDN-cached `GET /api/hot_feed`.
- `resolveBylineProfiles.ts:41` exports `withBylineProfiles`, a batched form that resolves profiles for many posts in one `getProfiles` call; the feeds use the per-post form.
- The reader layout awaits the full identity payload only to decide whether to show the Inbox tab (`reader/layout.tsx:26`); plan 02 step 6 switches that to `getSessionDid()`. Do it here if plan 02 has not landed.
- The feed is passed as a promise and streams behind `FeedSkeleton`, and the client's `useSWRInfinite` does not refetch on mount (`reader/InboxContent.tsx:37-44`). Keep both.

## Goal

A cold inbox or new-feed render does at most a handful of outbound calls beyond the feed query itself, and the new feed's first page is served from Redis.

## Steps

1. **Batch profiles across posts.** Replace the per-post `resolveBylineProfiles` inside the feed paths with one `withBylineProfiles` call over the whole page (read its signature and how `getHotFeed` or the publication pages use it). Keep `enrichDocumentToPost`'s shape for single-post callers.
2. **Cache accurate mention counts.** Wrap `getAccurateMentionsCount` in a Redis cache keyed `mentions:v1:<docUri>` with a one-hour TTL (use the shared client from plan 02 if it exists, else the `profileCache.ts` pattern). On a miss, compute as today. Read the counts for the whole page with one `mget` before enrichment so the common case is zero constellation fetches. Cap concurrent misses with a small limiter (the existing `@yornaath/batshit` or a simple semaphore) so a fully cold page does not fire 100 fetches at once.
3. **DID resolution.** `idResolver` already caches in Redis. Check it uses a pipeline or `mget` when many resolve calls run concurrently; if each is a separate round trip, add a page-level pre-warm using `mget` on the DID keys, or accept it and note the cost.
4. **New feed first page in Redis.** In `getNewFeed`, when `cursor` is null, read `new_feed_v1` from Redis (TTL 60 s) and fall through to the query on a miss, mirroring `getHotFeed`. Do not cache cursor pages.
5. **Inbox first page (optional).** Per-DID caching (`reader_feed_v1:<did>`, 60 s) is safe only if it is busted when the user's subscriptions change. If `src/subscriptions/` has a single write path, bust there and enable it; if not, skip and say so.
6. **Reader layout.** If plan 02 has not landed, switch `reader/layout.tsx:26` to `getSessionDid()`.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit`; `npm run check-query-plans`; `npm run format:changed`. There are feed and post fixtures under `.agents/skills/tests-posts/`; read that skill and run what it prescribes.
- Add `console.time` around `getReaderFeed` and `getNewFeed` temporarily and report cold and warm timings before and after, along with the number of outbound `fetch` calls (count them with a temporary wrapper). Remove the instrumentation before committing.
- Confirm the rendered `Post` shape is unchanged: the inbox, new, and trending tabs render identically, with correct bylines, mention counts, and cover images.

## Working rules

- Follow `CLAUDE.md` comment rules.
- Branch off `main`. One commit per numbered step. Do not push or open a PR.
- Final report: timings and call counts before and after, which optional steps you took, and anything you could not verify.
