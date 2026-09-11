# Cache and slim the server identity path

You are implementing a performance change in the Leaflet repo (Next.js 16.3 App Router on Vercel, Supabase via PostgREST, Redis via ioredis). Read `CLAUDE.md` first. This is Tier 1, item 2 of the PWA load audit (`plans/pwa/README.md`).

## Context

Every page in the `(identity)` route group renders per request and cannot stream its shell until identity resolves:

- `app/(app)/(identity)/layout.tsx` mounts `components/IdentityProviderServer.tsx`, which calls `getIdentityData()` without awaiting and hands the promise to the client provider. The client provider calls `use(identityPromise)` (`components/IdentityProvider.tsx:107`), so the entire shell HTML waits on it. The fallback meanwhile is a full-screen spinner.
- `actions/getIdentityData.ts:20-62` is one PostgREST select on `email_auth_tokens` embedding ~28 relations, including `documents(uri, indexed_at, data)` four times. `data` is the full published-record JSON for every leaflet on the homepage and every contributor draft, and it is the largest contributor to the `/home` RSC payload.
- `actions/getIdentityData.ts:90` then awaits `getProfiles([atp_did])` serially. That is a Redis read (`src/identity/profileCache.ts`) or, on a miss, a Bluesky AppView round trip. Nothing above the fold needs the avatar.
- The function is wrapped in React `cache()`, which only dedupes within one request. There is no cross-request cache anywhere on this path: no `unstable_cache`, no `"use cache"`, no Redis. `plans/performance.md` Phase 4 designed a 30-second per-token cache and it was never built.
- Three different query shapes hit the same token row: `getIdentityData`, `getHomeLeaflet` (`src/homeLeaflet.ts`), and `getAuthIdentity` (`src/auth.ts:79`). `/reader` runs both the first and third.
- Every eager `SpeedyLink` prefetch in the shell (home, reader, notifications tabs, and the first six publications in `components/ActionBar/Publications.tsx:106`) is a full dynamic render of a sibling route that re-runs the same uncached query.

Constraints that shape the design:

- Next 16's `"use cache"` is per-instance on serverless and does not persist across function instances; `unstable_cache` is marked replaced. Redis is already used for profiles, DID docs, CVRs, and the hot feed, and is the right layer here. Existing modules each construct their own `ioredis` client gated on `process.env.REDIS_URL && NODE_ENV === "production"` (see `src/identity/profileCache.ts:17-20`).
- The client provider's SWR fetcher (`components/IdentityProvider.tsx:110`) calls `getIdentityData()` directly as a server action after mutations, expecting fresh data. Several components call `mutate("identity")` and `router.refresh()` right after subscribe, membership, and leaflet mutations (see the sites listed under Invalidation). A cache that serves stale data to those refetches would break visible state.
- `fetched_at` on the payload drives a staleness guard in the client provider (`IdentityProvider.tsx:118-131`): a newer client snapshot wins over an older server seed. Keep it as the time the DB was actually queried.

## Goal

- Cross-request cache of the identity payload keyed by auth token, TTL 30 s, in Redis, so navigations and prefetches within that window do not hit Postgres.
- Client-initiated refetches and post-mutation refreshes always see fresh data.
- Profile lookup off the critical path where possible.
- `documents.data` removed from the identity select unless a consumer truly needs it.
- `/reader`'s layout uses the cheapest query that answers its one question.

## Non-goals

- Do not cache `getHomeLeaflet` in this pass. Its facts seed Replicache and a stale seed has already caused a document revert once (see `src/replicache/cachedServerMutationContext.ts` and the memory in `plans/`); leave it parallel and uncached.
- Do not cache `getAuthIdentity`; it is the authorization gate for server actions.
- Do not enable `cacheComponents`.

## Steps

### 1. Shared Redis client

Create `src/redis.ts` exporting a lazily constructed singleton with the same gating as `profileCache.ts` (`REDIS_URL` set and production), plus a null-safe helper shape so callers can no-op when Redis is absent. Do not refactor the other modules to use it in this pass unless it is a one-line swap; the goal is a single place to get a client for new code.

### 2. Split and cache `getIdentityData`

In `actions/getIdentityData.ts`:

1. Move the query body into `fetchIdentityByToken(auth_token: string)` with no request-context reads. Keep `fetched_at: Date.now()` inside it.
2. Add a Redis wrapper: key `identity:v1:<sha256(auth_token)>` (hash the token; do not put the raw session token in Redis keys), value JSON, TTL 30 s. Add an in-flight promise map per instance so concurrent misses for the same token share one fetch.
3. `getIdentityData()` (the existing export, still `cache()`d) reads cookies, then the Redis wrapper.
4. Add `getFreshIdentityData()` in the same `"use server"` file: same cookie read, fetches from Postgres, writes the cache, returns. Switch the SWR fetcher in `components/IdentityProvider.tsx:110` to call it. That makes every client-initiated revalidation authoritative and also warms the cache for the next server render.
5. Add `invalidateIdentityCache(auth_token)` in a plain (non-`"use server"`) module, for example `src/identityCache.ts`, and export the hashing helper from there. Note the `"use server"` rule in `CLAUDE.md`: exported async functions in such files become client-callable endpoints; the invalidation helper must not be one.

Bump the key version if the payload shape changes later.

### 3. Invalidation

Server-rendered routes read the cache, so any server action that changes identity-visible state must invalidate before it returns, or a `router.refresh()` right after the action renders stale data. Audit for writes to the tables embedded in the select: `identities`, `notifications`, `publication_subscriptions`, `publication_email_subscribers`, `publication_memberships`, `custom_domains`, `custom_domain_routes`, `permission_token_on_homepage`, `permission_tokens` (title/description), `user_subscriptions`, `user_entitlements`, `stripe_connected_accounts`, `publications`, `leaflet_contributors`, `publication_contributors`.

Start from these known post-mutation refresh sites, each of which implies a server action that must invalidate:

- `components/Subscribe/SubscribeButton.tsx:151,301,349`, `ManageSubscribe.tsx:245,252,302`, `EmailSubscribe.tsx:186`, `LinkIdentityModal.tsx:50`, `SubscribeConfirmationModal.tsx:70-82`
- `components/Memberships/JoinMembershipFlow.tsx:201-231,428-447`, `ChangePlanModal.tsx:163`, `CancelMembershipModal.tsx:66`, `ResumeMembershipModal.tsx:66`
- `app/(app)/(identity)/(home-pages)/(writer)/home/LeafletList/LeafletOptions.tsx:374,443,473,514` (create, archive, delete, move leaflets)
- `app/(app)/(identity)/(home-pages)/(writer)/settings/BillingTab.tsx:62,117`, `settings/domains/DeleteDomainButton.tsx`
- `app/(app)/(identity)/admin/AdminEntitlements.tsx` (all `router.refresh()` calls)
- Login, logout, account switch (`app/api/auth/*`, `actions/login.ts`): logout must delete the key for the token being ended.
- Stripe and Postmark webhooks (`app/api/webhooks/**`) write subscription and membership rows without a session token. They can't invalidate by token; accept up to 30 s of staleness there, and say so in a comment on the wrapper.

Then grep `actions/` and `app/api/` for `.insert(`, `.update(`, `.upsert(`, `.delete(` on those tables to catch anything the list above misses. Each such action calls `invalidateIdentityCache(auth_token)` for the acting token after its write. Notification rows are written for other users by their actions; the client's realtime broadcast already triggers a fresh refetch, so no invalidation is needed there.

### 4. Profile lookup off the critical path

With the cache, the serial `getProfiles` call is paid once per 30 s per user, which is usually acceptable. Still make the miss path cheap: give `getProfiles` (or a thin wrapper) a `cacheOnly` option that returns whatever Redis has and never calls the AppView, and use it in `fetchIdentityByToken`. When it returns null, the client already has `useRecordFromDid` (`src/utils/useRecordFromDid.ts`) to fill the avatar in; check `components/ActionBar/ProfileButton/ProfileButton.tsx:36` handles a null `bsky_profiles` gracefully. Trigger a background AppView fetch on a miss (fire-and-forget with `after()` or `waitUntil`) so the next render has it.

### 5. Drop `documents.data` from the identity select

Find every reader of `leaflets_in_publications[*].documents.data` and `leaflets_to_documents[*].documents.data` reachable from the identity payload: `home/HomeLayout.tsx` (the `StaticLeafletDataContext` casts around line 43 and 200-236 hide embed readers from tsc, so grep, don't trust the compiler), `LeafletList/*`, `components/Pages/PublicationMetadata.tsx`, `LeafletOptions.tsx`, and anything else under `app/(app)/(identity)`. If no reader needs fields from `data`, select `documents(uri, indexed_at)` only. If some reader needs one or two fields (for example a published title or date), select just those JSON paths with PostgREST's `data->field` syntax rather than the whole record. Measure the RSC payload size of `/home` before and after (DevTools network, the document response) and put both numbers in the commit.

### 6. `/reader` layout

`app/(app)/(identity)/(home-pages)/reader/layout.tsx:26` awaits the full identity payload to decide whether to show the Inbox tab. Use `getSessionDid()` from `src/identityPayload.ts:23` instead (a one-column query), and leave `reader/page.tsx` as is; with the cache in place its `getIdentityData()` call is cheap.

### 7. Eager prefetch

Do not change prefetch behavior in this plan. With the cache, each eager prefetch costs a Redis read. The client-side bandwidth question is handled in `plans/pwa/05-wasted-mount-requests.md`.

## Verification

- `rm -rf .next/dev/types && npx tsc`; `npm run test:unit`; `npm run check-published-purity`; `npm run check-query-plans`; `npm run format:changed`.
- Add a vitest unit test for the cache wrapper with an injected in-memory key-value store (the wrapper should accept the client as a parameter or via a small interface so the test does not need Redis): hit, miss, TTL expiry, in-flight dedupe, and invalidation.
- Local Redis is off in development (the gate is production-only). To exercise the real path, run `NODE_ENV=production REDIS_URL=redis://localhost:6379 npx next build && npx next start` against a local Redis (`docker run -p 6379:6379 redis` or the system package), log in, load `/home` twice within 30 s, and confirm via Postgres logs or a temporary `console.time` that the second load did not run the identity query. Then subscribe to a publication from a published page and confirm the dashboard reflects it immediately after the redirect.
- Report which mutation sites you instrumented for invalidation and which you deliberately left to TTL expiry.

## Working rules

- Follow `CLAUDE.md` comment rules. The one comment worth writing is on the wrapper: why 30 s, why hashing the token, and which writers cannot invalidate.
- Branch off `main`. Commit after each numbered step. Do not push or open a PR.
- Do not edit generated files.
- Final report: what changed, the measurement (query count and `/home` RSC bytes before and after), the invalidation site list, and anything you could not verify.
