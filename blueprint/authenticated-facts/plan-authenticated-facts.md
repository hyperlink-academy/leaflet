# Authenticated Facts (DID-bound facts)

Add an optional DID binding to any fact, enforced on the server push action, so that only the identity that owns a fact's ATProto DID can create, update, or delete it. This is the authorization primitive that a future in-editor commenting feature will be built on — commenting itself is **out of scope** here.

## Overview

- Facts are `(entity, attribute, data)` triples whose only authorization today is **entity-set permission tokens** — anyone with write access to an entity set can write any fact in it. There is no per-fact ownership.
- Add an optional **`author_did`** binding to a fact, stored as a new top-level nullable column on the `facts` table (sibling to `entity`/`attribute`/`id`), so a fact can be "authenticated" to a specific DID.
- Enforce ownership on the **server push action** as an **additional gate on top of** the existing entity-set permission check: to write an authenticated fact you must both have entity-set write permission **and** own the fact's DID.
- Ownership is resolved cheaply — the push handler resolves the session cookie → `identities.atp_did` (one lookup per push) and compares it to the fact's DID. No per-write OAuth round-trip.
- The DID is set by the calling mutation, validated against the session DID on create, **immutable** thereafter, and **write-gated only** (authenticated facts are still readable by anyone who can read the doc).
- Motivation: gives us a trustworthy "this fact was authored by DID X" guarantee — the foundation for comments, replies, threads, statuses, and resolve, where each participant's contributions must be attributable and only mutable by their author.

## Expected behavior

- A fact may carry an optional `author_did`. A fact without one behaves exactly as today (entity-set permission only).
- **Creating** an authenticated fact: the mutation supplies a DID; the server drops the write unless the writer's session DID equals that DID. You can only ever create facts authenticated as yourself.
- **Updating** an authenticated fact: the server drops the write unless the session DID equals the fact's stored `author_did`. The stored `author_did` is preserved regardless of what the client sends (immutable — cannot be changed, cleared, or transferred).
- **Retracting** an authenticated fact: same rule — only the owning DID can delete it.
- **No resolvable session DID** (anonymous / email-only sessions with no `atp_did`): authenticated-fact writes are silently dropped; unauthenticated facts continue to work exactly as today.
- A failed ownership check **silently drops the individual fact write** (consistent with how `checkPermission` failures behave today) — it does not abort the whole push.
- `deleteEntity` is unchanged: governed by entity-set permission alone. It does **not** inspect per-fact DIDs, so deleting an entity can still remove authenticated facts owned by other DIDs (entity ownership is treated as separate from fact authentication).
- Authentication gates writes only — `author_did` is synced to clients for authorship/display, and any reader of the doc can read authenticated facts.
- Optimistic client writes are not blocked locally; a write the server rejects is simply rolled back on the next pull (enforcement is server-only).

## Changes

- **Database**: add a nullable `author_did` column to the `facts` table (new `supabase/migrations/` migration; reflect it in `drizzle/schema.ts` and regenerate Supabase types).
- **Fact type**: add optional `author_did` to the `Fact` type in `src/replicache/index.tsx` (it flows into the `FactInput` shape automatically, since `FactInput` is derived from `Fact`).
- **Pull (sync to client)**: no RPC change needed. `pull_data` builds its facts array via `json_agg(row_to_json(f)) FROM get_facts(...)`, and `get_facts` is `RETURNS SETOF facts` with `SELECT *`, so the new column propagates to the client automatically once it exists on the table. The pull route (`app/api/rpc/[command]/pull.ts`) spreads each fact through `FactWithIndexes` (`{...f, indexes}`), so `author_did` reaches the client at runtime regardless — add `author_did` to the inline `facts` type literal there so the type matches the data being sent.
- **Push session identity**: in the push route (`app/api/rpc/[command]/push.ts`), the handler does not receive the raw `Request` (`makeRouter` passes only the parsed body + `Env`), so read the session cookie with `cookies()` from `next/headers` (handling both `auth_token` and `external_auth_token`, mirroring `getIdentityData.ts`). Resolve it once per push: `email_auth_tokens.id` (cookie value) → `identities.atp_did`, and pass the resolved DID into the mutation context. (Push is same-origin so the cookie is sent; if no DID resolves, authenticated-fact writes are dropped per the rules below.)
- **Read the stored `author_did`**: enforcement on update/retract compares against the fact's *existing* DID, but none of the current read paths select it — extend them all first:
  - `scanIndex.eav` in `cachedServerMutationContext.ts` currently selects only `{id, data, entity, attribute}`; add `author_did` so cardinality-`one` updates can read the stored DID.
  - `retractFact` currently selects only `{entity}` for the by-id lookup; add `author_did`.
  - `assertFact` only fetches an existing row for cardinality-`one` (via the `eav` scan). For cardinality-`many` asserts with an explicit `f.id` (an update), it fetches nothing today — add a lookup of the existing fact's `author_did`, checking `writeCache` first (mirroring how `retractFact` resolves the cached fact before hitting the DB) and falling back to a by-id DB select, so ownership/immutability is enforceable on those updates.
- **Mutation context**: thread the resolved session DID into `cachedServerMutationContext`, and centralize enforcement in its `assertFact` and `retractFact` (using the stored `author_did` read above):
  - `assertFact` creating a fact with a new `author_did` (no existing row): require session DID to equal it, else drop.
  - `assertFact` on an existing authenticated fact: require session DID to equal the stored `author_did`; preserve the stored `author_did` regardless of what the client sends (immutable).
  - `retractFact` on an authenticated fact: require session DID to equal the stored `author_did`, else drop.
- **Flush**: persist `author_did` when inserting/updating facts (and ensure the immutable DID is not overwritten on conflict update).
- **Client mutation context** (`src/replicache/clientMutationContext.ts`): store `author_did` on the optimistic fact so the local store matches what pull returns. `FactWithIndexes` spreads the fact, so passing `author_did` through is enough — no separate index change. No client-side enforcement.
- **Out of scope (noted for the future commenting feature)**: comment/thread/reply data model, statuses and resolve, editor anchoring/UI, and any read-gating — none are part of this change.
