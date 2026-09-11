# 02b — Split the identity payload and its cache into independent slices

## Problem

Plan 02 landed a single Redis entry per session token holding the whole
`getIdentityData()` payload. That payload is one Supabase query embedding nine
unrelated slices off the `identities` row:

1. the identity row itself (email, atp_did, interface state)
2. subscription state embeds (email + atproto publication subscriptions)
3. custom domains, their publication/route assignments and the leaflet titles behind routes
4. homepage leaflets (`permission_token_on_homepage` → tokens → documents → publications)
5. user entitlements (Pro)
6. owned publications
7. contributor leaflets (`leaflet_contributors` → tokens → documents)
8. contributor publications
9. Stripe connected account, user_subscriptions, unread notification count

Because it is one blob, ~30 writers across subscriptions, memberships,
leaflets, publishing, domains, publications, contributors, checkout, OAuth
and Stripe Connect all call `invalidateSessionIdentityCache()`, and any of
them busts everything. Webhooks and admin grants cannot invalidate at all
because keys are per-token, so the cache needs a 30 s TTL. This is hard to
reason about and couples every feature to the identity cache.

## Goal

Make identity data simple, fast and locally reasoned about:

- Split the payload into slices grouped by **ownership and change frequency**
  (e.g. session/identity row; home leaflets + contributor leaflets; owned +
  contributor publications; domains; billing = entitlements + subscription +
  connected account; subscriptions). Pick the grouping from the actual
  consumers — read every reader of `useIdentityData()` / `getIdentityData()`
  / `Identity` and note which fields each surface needs.
- Each slice is fetched by its own small query (or several in `Promise.all`)
  and, **only where it earns it**, cached on its own key with its own
  invalidation. A slice that is cheap to query fresh (single-row PK lookups)
  should not be cached at all. Prefer keys by identity id / DID over keys by
  token hash so webhooks, admin grants and the edge logout can invalidate by
  id; keep the token→identity-id resolution as the only per-token step.
- Each writer invalidates **only the slice it changed**. The blanket
  `invalidateSessionIdentityCache()` should disappear or shrink to the
  session slice. Enumerate the writers plan 02 instrumented (see
  `_ws/tasks/02/report.md`, "Instrumented" table) and reassign each.
- The consumer-facing `Identity` shape may stay as an assembled object so
  most readers don't change, or readers can move to slice-specific hooks
  where that removes over-fetching (e.g. the editor chrome's own SWR key
  should not pull home leaflets). Choose whichever yields the smaller,
  clearer diff; explain the choice in the report.
- Preserve plan 02's wins and guarantees: ≤1 Postgres round-trip per slice
  per `/home` load inside the cache window, the narrowed document select
  (`DOCUMENT_URL_FIELDS`), the profile-cache `after()` warm, Redis errors
  degrade to uncached reads, `getFreshIdentityData()` semantics for the
  client SWR fetchers, and the `fetched_at` staleness guard in
  `IdentityProvider`. The `HomeLayout` tripwire and the RSC-size reduction
  must survive.
- Plan 05 (`plans/pwa/05-wasted-mount-requests.md`) and plan 11 will build on
  your helpers next; keep the slice fetchers and invalidators exported from
  one module with a short README-style comment at the top of that module.

## Steps

1. Inventory: list every field of the current `Identity` and which component
   or action reads it (grep `useIdentityData`, `getIdentityData`,
   `identity.` in `app/`, `components/`, `actions/`, `src/`). Put the table
   in the report.
2. Design the slices and their cache policy (key, TTL or none, invalidators).
   Write it down in the report before coding.
3. Implement: slice fetchers, assembly, cache module changes, writer
   invalidation reassignment, tests (extend `src/identityCache.test.ts` or
   add per-slice tests).
4. Delete what is no longer needed (the blanket invalidator if unused, dead
   embeds in the old select).
5. Verify: `verify.sh`; then a production build against local Supabase +
   local Redis with a real session cookie, counting queries per `/home` load
   before/after (plan 02's method), and confirm a subscribe / new draft /
   domain change each invalidates only its own key (`redis-cli --scan`).

## Verification the user does

Same manual checklist as plan 02 plus: after subscribing to a publication,
the home-leaflets key is untouched; after creating a draft, the
subscriptions key is untouched.
