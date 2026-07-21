# Cached profile resolver — replacing `bsky_profiles` reads

## Overview

- Page-level render paths currently read profile/handle data from Postgres via `bsky_profiles` joins, even though reader routes already have a cached identity resolver pattern; this plan swaps those reads to a cached resolver hydrated from the Bluesky appview.
- Two caches, two purposes: keep the existing DID→handle `idResolver` (Redis-backed `RedisDidCache`); add a **separate** Redis-backed profile cache for `displayName`/`avatar`/`description`, sourced from `app.bsky.actor.getProfile` on `public.api.bsky.app`. Within a single server render, wrap the batched fetch in `react/cache()` so overlapping callers (e.g. notifications + comments) de-dupe Redis hits for free.
- Comments are not on the post-page critical path — restructure so only `commentsCount` blocks render; the comments list (and its batched profile hydration) streams in via Suspense.
- Invalidation is firehose-driven: the appview process gets a Redis client and the currently commented-out `app.bsky.actor.profile` handler clears the cache key on every profile write. Long TTL (7d stale / 30d max) since the firehose keeps it fresh; TTL is just GC.
- Scope is the page-level read paths only — `getProfilePosts`, `getProfileComments`, `getPostPageData`, `get_document_interactions`, `src/notifications.ts`. `getIdentityData` and `get_profile_data` are untouched; the `bsky_profiles` table itself stays for now (removal is a separate follow-up).

## Expected behavior

**Profile pages (`/p/[didOrHandle]`)**
- Header (avatar, displayName, handle) renders blocking as today via `get_profile_data` — viewer-relationship data (`knownFollowers`, `viewer.following`) preserved.
- Posts list renders blocking; the author chip's `@handle` is sourced from `idResolver.did.resolve()` (the existing handle resolver — same pattern as `enrichPost.ts`), not the new profile cache. The profile cache is only consulted at call sites that actually need displayName/avatar.
- Comments tab: page shell renders immediately; the comments list streams in via Suspense, with a few grey skeleton comment cards in the fallback. The whole list appears at once after all author profiles batch-hydrate.

**Post page (`/lish/<did>/<pub>/<rkey>`)**
- Main page content (document body, header, `<Interactions />` badge with `commentsCount`) renders blocking.
- The to-the-side comments sidebar streams in via Suspense, in both linear and canvas render modes.
- If the comments fetch fails, the comments slot renders empty; the page itself still works.

**Notifications page**
- Stays blocking (no new Suspense boundary).
- `hydrateNotifications` drops Supabase `bsky_profiles` joins, gathers all author DIDs, and batch-fetches profiles via the cached resolver.
- Notifications attach profiles in a flat `{ did, displayName, avatar, handle }` shape — no synthetic `bsky_profiles: { record, handle }` shim. The seven notification components (Comment, Reply, CommentMention, Recommend, Follow, etc.) migrate to read `profile.avatar` (flat CDN URL string) and `profile.displayName` directly, dropping all `blobRefToSrc(profile.record.avatar.ref, did)` calls.

**Identity / appview interaction**
- Cached profile is shared across all readers; uncached cold reads batch-fetch ≤25 DIDs per appview round-trip.
- When a user updates their Bluesky profile, the firehose hits the appview process and the cache key is deleted; the next render fetches fresh from the appview.
- Deleted accounts / missing profiles render the DID literally (e.g. `did:plc:abc…`) as the author label; the null result is itself cached for the full TTL (firehose re-invalidates if the user reappears).

**Dev environment**
- Without `REDIS_URL`, the profile resolver falls back to no caching (every render fetches from the appview), matching `idResolver`'s existing behavior.

## Changes

**New `src/identity/` module**
- Move `idResolver` here from `app/(app)/(home-pages)/reader/idResolver.ts`; update all import sites.
- Add a Redis-backed profile cache: `bsky-profile:` key prefix, 7d stale / 30d max, negative results cached at the same TTL.
- Export only the batched `getProfiles(dids[])` form — no single-DID convenience method (callers always batch).
- `Profile` type is a `Pick<AppBskyActorDefs.ProfileViewDetailed, "did" | "handle" | "displayName" | "avatar" | "description">` (or similar narrow shape) — only the fields consumers actually use.
- HTTP calls go through the existing shared bsky agent helper at `app/api/bsky/agent.ts`.
- Wrap `getProfiles` in `react/cache()` so concurrent server-component fetches within a single render coalesce before hitting Redis.

**Page-level read sites stop selecting `bsky_profiles`**
- `getProfilePosts` (`p/[didOrHandle]/getProfilePosts.ts`): drop the parallel `bsky_profiles` query entirely. The handle was the only field used; source it from `idResolver.did.resolve(did)` and read `alsoKnownAs?.[0]?.slice(5)` — exact same pattern as `enrichPost.ts`. No call to the new profile cache from this site.
- `getProfileComments` (`p/[didOrHandle]/comments/getProfileComments.ts`): drop both `bsky_profiles` joins (main comments + parent comments); collect all DIDs across both layers into one set and batch-hydrate in a single resolver call.
- `getPostPageData` (`lish/[did]/[publication]/[rkey]/getPostPageData.ts`): drop the `comments_on_documents(*, bsky_profiles(*))` join entirely; keep a count-only aggregate (`comments_on_documents(count)`) so the `<Interactions />` header badge still has `commentsCount`.
- `get_document_interactions` (`app/api/rpc/[command]/get_document_interactions.ts`): same `comments_on_documents(*, bsky_profiles(*))` join shape as `getPostPageData` — drop the `bsky_profiles(*)` part; the comments are returned to the client and hydrated through the same shared `CommentsSection` path. Migrate together so the `Comment` type stays consistent across both entry points.
- `src/notifications.ts`: drop the four `bsky_profiles` joins; in `hydrateNotifications`, gather DIDs from the result set, batch-fetch profiles, and attach them to each notification as a flat `{ did, displayName, avatar, handle }` shape (no `bsky_profiles: { record, handle }` shim).

**Post page comments streaming**
- New server component (e.g. `CommentsSection.tsx`) that owns the comments fetch + batched profile hydration, renders the existing `"use client"` `Comments/index.tsx` as a child, and passes the augmented comment list as props.
- Mounted in both the linear and canvas post-page paths, wrapped in `<Suspense fallback={<grey skeleton comment cards />}>`.
- Skeleton fallback is inline (no shared skeleton component).

**Profile comments page streaming**
- Wrap the comments list in Suspense with the same inline skeleton fallback; the top-level author header stays blocking.

**Consumer shape migration (all surfaces)**
- The shared `Comment` type in `app/(app)/lish/[did]/[publication]/[rkey]/Interactions/Comments/index.tsx` changes from `bsky_profiles: { record: Json; did: string } | null` to `profile: { did, displayName, avatar, handle } | null`. Consumers read `profile.avatar` as a flat CDN URL string and `profile.displayName` directly.
- `p/[didOrHandle]/comments/CommentsContent.tsx`: replace `blobRefToSrc(profile.record.avatar.ref, did)` with the flat `avatar` string; replace `comment.bsky_profiles?.record.displayName` reads with `comment.profile?.displayName`.
- Notification components (`CommentNotication.tsx`, `ReplyNotification.tsx`, `CommentMentionNotification.tsx`, `RecommendNotification.tsx`, `FollowNotification.tsx`, and any others under `app/(app)/(home-pages)/(writer)/notifications/`) drop their `blobRefToSrc(profileRecord?.avatar?.ref, ...)` calls and read `profile.avatar` and `profile.displayName` off the flat shape attached by `hydrateNotifications`. Each touched component should also drop the now-unused `blobRefToSrc` import.

**Appview firehose invalidation**
- Add an `ioredis` client to the appview process, configured from the same `REDIS_URL` env var the web app uses.
- Add a `RedisProfileCache` sibling to `RedisDidCache` (different key prefix), exposing a `clearEntry(did)` method.
- Uncomment and wire up the `AppBskyActorProfile` handler at `appview/index.ts:404` to call `clearEntry(did)` on every profile write — delete only, no opportunistic SET.

**Rollout**
- Straight migration on one branch — no feature flag.
- No special deploy ordering: first deploy means the cache is cold anyway, and by the time invalidations matter, both processes are live.

**Testing**
- No new dedicated tests. Verification is manual: exercise affected routes (profile posts page, profile comments page, post page comments, notifications) in dev with Redis on and off, then ship and watch.

**Explicitly out of scope**
- The `bsky_profiles` table itself, and its write-side population in `subscribeToPublication.ts` etc. — these stay; removal is a separate follow-up.
- Opportunistic cache warming from the firehose (SET-on-write instead of DEL-on-write).
- `getIdentityData` (viewer's own auth context) and `get_profile_data` (the authed profile fetch used by the profile-page header for viewer-relationship data).
- `enrichPost.ts` in the reader feed — already on the cached pattern; only its `idResolver` import path moves.
