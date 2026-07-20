# Permission model simplification: evaluation

An assessment of replacing the `entity_sets` / `permission_token_rights`
indirection with per-document scoping, and of adding identity-based access
control alongside (or instead of) bearer tokens.

## TL;DR

- The diagnosis is correct: the set indirection is vestigial. Every creation
  path mints exactly one entity set per document and one rights row per token,
  `change_entity_set` is written but never read, and the client already
  hard-codes the single-set assumption (`permission_token_rights[0]`).
- But the proposed "doc_id" concept **already exists in the schema twice**:
  `entity_sets.id` is 1:1 with documents, and `permission_tokens.id` (the edit
  token) is the de facto document id that everything else FKs to
  (`leaflets_to_documents.leaflet`, `leaflets_in_publications.leaflet`,
  `leaflet_contributors.leaflet`, `publications.draft_leaflet`,
  `identities.home_page`, `custom_domain_routes.*`). The real problem is not
  the extra join — it's that **the document's identity and the write
  capability are the same value**, which makes tokens unrevocable and makes
  identity-based access control impossible to express.
- Recommended target: repurpose `entity_sets` as the `docs` table (same ids,
  so no fact/entity rewrites), collapse `permission_token_rights` into a
  `doc + role` on the token itself, re-key document associations from the edit
  token to the doc id, and add a `doc_access(doc, identity, role)` table for
  non-bearer grants. This is a moderate, phaseable migration — roughly 15
  code files, 4–5 SQL functions, and a handful of column-level backfills, with
  no rewrite of the facts data or the sync machinery.

## 1. What exists today

```
permission_tokens (id, root_entity)          -- id doubles as the URL and as the doc handle
  └─ permission_token_rights (token, entity_set, read, write, create_token, change_entity_set)
       └─ entity_sets (id)
            └─ entities (id, set)            -- one set per document, ever
                 └─ facts (id, entity, attribute, data, author_did)
```

Write authorization (`src/replicache/cachedServerMutationContext.ts`,
`checkPermission`): look up `entities.set` for the touched entity, then check
the token has a rights row with `write=true` on that set.

Read authorization: **none**. The pull RPC (`pull_data`, defined in
`supabase/migrations/20250305223244_add_pull_rpc_function.sql` and updated
since) resolves `token_id → root_entity` and returns the full fact graph via
`get_facts(root_entity)` — the `read` flag is never consulted. "Read-only" is
enforced by the UI (`components/EntitySetProvider.tsx` returns
`permissions.write=false`) plus the server silently dropping writes.

Token/set creation sites (exhaustive):

| Path | What it creates |
|---|---|
| `src/utils/createLeaflet.ts` | 1 set, 1 token, 1 rights row (all four flags true) |
| `actions/createNewLeafletFromTemplate.ts` | same |
| `create_identity_homepage()` (SQL default on `identities.home_page`) | same |
| `app/(app)/[leaflet_id]/actions/ShareOptions/getShareLink.ts` | **view token**: 2nd token on the *same* set, `read=true write=false` |

So the only 1:N relationship the model ever uses is *N tokens over one set*
(edit token + view token(s) for the same doc) — never one token over N sets,
and never one set spanning N docs.

### Where the set indirection is actually load-bearing

Only three places would notice if `entity_set` disappeared:

1. **View-token → edit-token sibling hop** —
   `app/api/rpc/[command]/get_leaflet_data.ts` walks
   `token → rights → entity_set → all sibling tokens → leaflets_in_publications /
   leaflets_to_documents / publications`. A view token can only discover "what
   document/publication am I?" through the shared set, because those
   associations are keyed on the **edit token's id**.
2. **View-token dedupe** — `getShareLink.ts` finds "the existing view token
   for this doc" by querying rights rows with the same `entity_set`.
3. **Poll reads** — `actions/pollActions.ts` queries
   `poll_votes_on_entity ... .in("entities.set", entity_sets)`.

Everything else — the entire `get_facts*` family, pull, server page loads,
templates, publishing, the client Replicache store (indexed `eav`/`vae` by
entity, never by set), appview, feeds — is set-agnostic: reads walk the
reference graph from `root_entity`.

### Incidental findings

- `change_entity_set` is written `true` everywhere and read nowhere. Dead.
- `create_token` is only read to decide whether the share-view-link UI is
  offered; view tokens have it false.
- `get_leaflet_page_data` (migration `20260325000000`) references entity_sets
  for sibling discovery but has **no callers** — dead code.
- **`entity_sets` rows leak**: `actions/deleteLeaflet.ts` deletes entities by
  set and the token, but nothing ever deletes the set row (the FK cascade
  points the wrong way). Every deleted leaflet leaves an orphan row.
- `push.ts` never verifies the client-supplied `rootEntity` belongs to the
  token — it's only used for the advisory-lock key and the poke channel name.
  Not exploitable for writes (those are gated per-entity), but it means any
  bearer of any token can broadcast pokes on any document's channel.
- Deleting an edit token today cascades into
  `leaflets_to_documents` / `leaflets_in_publications` /
  `permission_token_on_homepage` rows — i.e. **revoking the edit capability
  destroys the document's associations**. This is the concrete cost of
  "token id = doc id".

## 2. Architecture options

### Option A — user's proposal: `doc_id` on facts, tokens grant access to a doc

Put `doc_id` directly on `facts`. Works, but facts don't currently carry a
scope column at all — scope is derived via `facts.entity → entities.set`. A
`facts.doc_id` column means backfilling ~the largest table in the database and
keeping a denormalized invariant (`facts.doc_id` must equal the entity's
doc) forever. The mutation context would need to stamp it on every write.
There's no read path that would benefit: no query selects facts by set today
(reads walk from `root_entity`), so the column would exist purely for the
write-permission check, which is already answered by the (indexed, cached)
one-row lookup on `entities`. **Not recommended** — pay the entity-level
rename instead, it's strictly less data.

### Option B — minimal collapse: keep tables, drop the join (recommended core)

`entity_sets` is already the doc table; it's just anemic and badly named.

```
docs (id, created_at, owner uuid null → identities.id, visibility text default 'link')
  -- physically the existing entity_sets table: rename + add columns; ids unchanged
entities (id, doc)                        -- rename of entities.set; no data movement
permission_tokens (id, root_entity, doc → docs.id, role text)  -- role: 'editor' | 'viewer'
  -- permission_token_rights folded in and dropped; root_entity kept (pull uses it)
doc_access (doc → docs.id, identity → identities.id, role, added_by, created_at)
  -- the new, non-bearer grant table
```

Because `entity_sets.id` values are preserved, **no rows in `entities` or
`facts` change**. The backfill is: add `docs` columns; copy each token's
single rights row into `permission_tokens.doc/role`
(`role = write ? 'editor' : 'viewer'`); done.

Re-key the document associations from edit-token id to doc id:
`leaflets_to_documents`, `leaflets_in_publications`, `leaflet_contributors`,
`publications.draft_leaflet`, `permission_token_on_homepage`,
`custom_domain_routes` (the edit/view token pair becomes `doc` + optional
explicit tokens). Each is a single-statement backfill
(`join permission_tokens on <table>.leaflet = permission_tokens.id`, set
`doc = permission_tokens.doc`). This is what fixes the three load-bearing
uses of the set indirection: the sibling hop becomes `token.doc` directly,
view-token dedupe becomes `where doc = $1 and role = 'viewer'`, and the poll
query becomes `.in("entities.doc", [doc])`.

URLs keep working untouched: `/[leaflet_id]` remains a token id, resolved to
`{doc, role, root_entity}` in one query.

### Option C — full principal/ACL rewrite

Model every accessor (bearer link, identity, publication-contributor group) as
a principal with an ACL entry, drop `root_entity` in favor of `docs.root`,
rename routes to doc ids, mint per-user tokens, etc. Strictly more capable,
but nothing in the product roadmap described needs it, and it turns a
column-level migration into a URL-breaking one (every share link ever sent is
a token id). **Not worth it now**; Option B leaves the door open (doc_access
*is* the ACL table, it just starts with one principal type).

## 3. Access control: from bearer-only to bearer + identity

With Option B in place, the pieces for "control who can access a document"
fall out naturally:

- **Roles on tokens** (`editor`/`viewer`) replace the four boolean flags.
  `create_token`/`change_entity_set` are dropped; "may mint a view link" is
  simply `role = 'editor'`.
- **Identity grants** live in `doc_access`. Push already resolves the session
  cookie to an identity/DID (for `author_did` stamping) — the same resolution
  extends the write gate to
  `token.role = 'editor' OR doc_access(doc, session_identity).role = 'editor'`.
  `leaflet_contributors` migrates into `doc_access` rows (today contributors
  merely *discover* the shared bearer token; they'd become first-class
  grantees who don't need the secret at all).
- **Visibility on docs** (`link` = today's behavior, `private` = doc_access
  members only; later `public`). This is where the currently missing **read
  gate on pull** gets added: `pull`, `get_leaflet_data`, and the server page
  load check visibility before returning facts. That check must be added
  regardless of architecture if private docs are wanted — today every token,
  including view tokens, receives the full fact snapshot, and nothing gates on
  `read`.
- **Revocation and rotation** become possible: a token is now just a
  capability row pointing at a doc, so deleting one (or adding
  `revoked_at`) kills a leaked link without touching the doc or its
  associations. Today revoking the edit token is impossible without cascading
  away the document's publication/homepage links.
- Per-person share links ("invite alice@ as editor") are one insert into
  `doc_access` + the existing email/atproto auth flow — no new auth machinery.

## 4. Migration plan and feasibility

### Pre-flight invariant checks (run against prod before anything)

```sql
-- tokens with ≠1 rights rows (expected: none)
select token from permission_token_rights group by token having count(*) <> 1;
-- sets with >1 write token (expected: none; getShareLink only mints read-only)
select entity_set from permission_token_rights where write group by entity_set having count(*) > 1;
-- orphan entity_sets (the leak; cleanup candidates)
select id from entity_sets es where not exists (select 1 from entities e where e.set = es.id)
  and not exists (select 1 from permission_token_rights r where r.entity_set = es.id);
```

### Phasing

1. **Additive schema** (no behavior change): add `docs` columns to
   `entity_sets`; add `permission_tokens.doc`/`role`, backfilled from
   `permission_token_rights`; add `doc` columns to the six association tables,
   backfilled; create `doc_access`, seeded from `leaflet_contributors`.
   Dual-write in the four token-creation sites.
2. **Code cutover**: switch `checkPermission`/`createEntity` to
   `entities.set = token.doc && role = 'editor'` (the client-supplied
   `permission_set` argument threaded through ~20 mutation signatures and
   `defaultEntitySet` can be deleted — the server knows the doc from the
   token, which also removes a client-trust surface); switch
   `get_leaflet_data`, `getShareLink`, `pollActions`, the AI routes
   (`app/api/ai/lib.tsx`, `blocks/*`), `EntitySetProvider` (becomes a
   trivial `role` check), `deleteLeaflet` (and have it delete the doc row,
   fixing the leak).
3. **Identity access**: extend the push gate and pull/read paths with
   `doc_access` + visibility; migrate contributor UI onto it.
4. **Drop**: `permission_token_rights`, the `change_entity_set`/`create_token`
   flags, the dead `get_leaflet_page_data`, and (optionally, cosmetically)
   rename `entity_sets`→`docs`, `entities.set`→`entities.doc` in a
   coordinated deploy. PostgREST string-embeds (`get_leaflet_data.ts`,
   `getIdentityData.ts`, `pollActions.ts`) reference table names literally,
   so renames must ship atomically with code — which is why they're last and
   optional.

### Blast radius

SQL: `pull_data`, `create_identity_homepage`, `get_leaflet_page_data`
(delete), plus new migration files. The `get_facts*` functions are untouched.
TS (~15 files): `cachedServerMutationContext.ts`, `mutations.ts`,
`clientMutationContext.ts`, `replicache/index.tsx`, `createLeaflet.ts`,
`createNewLeafletFromTemplate.ts`, `deleteLeaflet.ts`, `pollActions.ts`,
`getShareLink.ts` + `ShareOptions/index.tsx`, `get_leaflet_data.ts`,
`push.ts`/`pull.ts` (lightly), `EntitySetProvider.tsx`, AI routes,
`getIdentityData.ts`, `middleware.ts` (custom domains), plus regenerated
`database.types.ts`/drizzle schema.

Untouched: fact storage and ids, the recursive fact-graph readers, client
Replicache indexes/undo, yjs sync, appview, feeds, publishing to ATProto.

### Risks

- The association re-key (token id → doc id) touches production FKs with
  cascades; do it additively (new column alongside old) and cut reads over
  before dropping.
- `leaflets_in_publications`/`leaflets_to_documents` PKs embed the `leaflet`
  token id; re-keying changes PKs — needs care with any code doing upserts on
  those PKs.
- Replicache clients in the field send `permission_set` args in queued
  mutations; the server must keep *accepting* (and ignoring) the argument
  through the transition.
- Adding a read gate to pull changes behavior for any integration relying on
  view tokens fetching full data (none known in-repo, but the AI bearer API
  and custom-domain middleware should be regression-tested).

### Verdict

Feasible and worthwhile. The 1:1 invariants the migration depends on are
enforced by construction in all four creation paths (verify with the
pre-flight queries). Because the doc id already exists as `entity_sets.id`,
the migration is column renames, one join-table collapse, and six
single-statement backfills — not a data rewrite. The genuinely new work
(roles, `doc_access`, visibility, read gating) is exactly the feature work
wanted anyway; the simplification mostly *removes* code (rights join,
`permission_set` plumbing, EntitySetProvider logic, dead flags).
