# Data Model & Mutation Invariants

Scope: the Replicache mutation layer + the entity-attribute-value "fact" model that
backs the block-based editor. This documents the *intended* structural invariants the
code assumes/enforces when blocks are created, deleted, moved, indented/outdented, and
reparented, plus suspected violations. Nothing here is a fix.

## Foundational facts about the model (read these first)

- A **fact** is `{ id, entity, attribute, data, author_did? }`
  (`src/replicache/index.tsx:31-37`). `data` carries a `type` tag and the value(s).
- Structure is encoded as **reference facts** on the *parent* entity:
  - `card/block` (`ordered-reference`, cardinality **many**) — parent->child edge for
    doc/list children, value = child entity, `position` = fractional-index string
    (`src/replicache/attributes.ts:11-14`).
  - `canvas/block` (`spatial-reference`, cardinality **many**) — parent->child edge for
    canvas children, value = child entity, `position` = `{x,y}`
    (`src/replicache/attributes.ts:33-36`).
  - `block/card` (`reference`, cardinality **one**) — a card block -> the page entity it
    embeds (`src/replicache/attributes.ts:96-99`).
- The child does **not** store a back-pointer fact. "Parent" is recomputed at read time
  from the `card/block` fact's `entity` (`getBlocks.ts:76,95`) or via the `vae` reverse
  index `${value}-${attribute}` (`utils.ts:16-22`).
- **No DB uniqueness constraint** exists on `(entity, attribute)` or on reference values.
  The `facts` table has only a PK on `id` plus a non-unique reference index
  (`supabase/migrations/20240519231512_init.sql:9-47`). Therefore **all cardinality and
  structural invariants are application-enforced**, in the two `assertFact`
  implementations, not by the database.
- Cardinality-one "assert replaces" is implemented by looking up the existing
  `(entity, attribute)` fact and **reusing its id** so the upsert overwrites it
  (client `clientMutationContext.ts:50-69,99`; server
  `cachedServerMutationContext.ts:163-168,189-199`, flushed via `onConflictDoUpdate` on
  `facts.id` at `:246-254`). Cardinality-many asserts mint a fresh `id` (so they append).

## Inventory of structural mutations

| Mutation | Writes (assert) | Retracts / deletes | Location |
|---|---|---|---|
| `addCanvasBlock` | `canvas/block` (spatial-reference, pos `{x,y}`) on parent; `block/type` on child; createEntity(child) | — | `mutations.ts:42-69` |
| `addBlock` | `card/block` (ordered-reference, pos string) on parent; `block/type` on child; createEntity(child) | — | `mutations.ts:71-98` |
| `addLastBlock` | `card/block` on parent at `generateKeyBetween(lastPos, null)` for an **existing** entity (no createEntity, no type) | — | `mutations.ts:100-119` |
| `moveBlock` | re-assert the *same* `card/block` fact id under `newParent` with recomputed pos | retract old `card/block` fact (same id) | `mutations.ts:121-174` |
| `moveChildren` | re-assert each child `card/block` (same id) under `newParent`, sequential positions after an anchor | retract each old fact (same id) | `mutations.ts:175-208` |
| `outdentBlock` | re-parent following siblings under `block`; re-assert `block`'s `card/block` under `newParent` | retract block's old fact + each trailing sibling's old fact | `mutations.ts:210-271` |
| `moveBlockUp` | re-assert `card/block` (same id) with pos between neighbors above | retract old fact (same id) | `mutations.ts:513-538` |
| `moveBlockDown` | re-assert `card/block` (same id) with pos between neighbors below; **or** if last, `addBlock` a new empty text block | retract old fact (same id) | `mutations.ts:539-589` |
| `removeBlock` | (server: clears cover_image; client: cache delete) | `deleteEntity(blockEntity)` — cascades all eav facts + all vae references | `mutations.ts:420-465` |
| `deleteEntity` | — | `deleteEntity(entity)` | `mutations.ts:467-469` |
| `assertFact` | arbitrary fact(s) (generic) | — | `mutations.ts:474-481` |
| `retractFact` | — | retract one fact id | `mutations.ts:308-310` |
| `retractAttribute` | — | retract the (single) eav fact for a cardinality-one attribute | `mutations.ts:697-707` |
| `toggleTodoState` | `block/check-list` false -> true | retract `block/check-list` when already true (3-state cycle) | `mutations.ts:709-726` |
| `increaseHeadingLevel` | `block/type`=heading and/or `block/heading-level` (1..3) | — | `mutations.ts:483-511` |
| `addPageLinkBlock` | `block/card` ref; `page/type`; seeds first heading via `addBlock` | — | `mutations.ts:273-306` |
| `archiveDraft` | `block/type`=card, `block/card` ref, `card/block` on archive (prepend) | retract `mailbox/draft` | `mutations.ts:633-695` |
| `createFootnote`/`deleteFootnote` | `block/footnote` (ordered-reference, many) | retract fact + deleteEntity | `mutations.ts:914-943` |
| `createComment`/etc. | `block/comment`/`comment/reply` (ordered-reference, many) | retract + deleteEntity | `mutations.ts:984-1062` |

Client-only structural writes (NOT mutations — done directly via `assertFact`/`retractAttribute` from UI code):

| Operation | Effect | Location |
|---|---|---|
| `indent` | `retractFact(block.factID)` + `addLastBlock` under the previous block's same-depth ancestor | `src/utils/list-operations.ts:30-56` |
| `outdent` (depth 1) | assert `block/is-list=false`; `moveChildren` to page | `list-operations.ts:104-115` |
| `outdent` (depth >1) | `outdentBlock` to grandparent (or page if depth 2) | `list-operations.ts:116-143` |
| `outdentFull` | assert `block/is-list=false`; `moveBlock` after the depth-1 root; `moveChildren` to page | `list-operations.ts:58-88` |
| Enter in a list | `addBlock` sibling/child + assert `block/is-list=true` (+ copy list-style, check-list) | `useBlockKeyboardHandlers.ts:236-257`; `keymap.ts:491-583` |
| Backspace at start of first list item | `retractAttribute(block/is-list)` | `keymap.ts:287-294` |
| Backspace mid-list | `moveChildren` to previous block / parent | `keymap.ts:262-285` |
| Make-list commands / input rules / paste | assert `block/is-list=true` | `BlockCommands.tsx:167-188`, `inputRules.ts:155-200`, `useHandlePaste.ts:519-521`, `SelectionManager/index.tsx:82-84`, `ListToolbar.tsx:46-48` |
| order/unorder list | assert/retract `block/list-style` | `list-operations.ts:6-28` |

> Key structural observation: **there is no `indentBlock` mutation and no mutation that
> sets `block/is-list`.** Indentation = (client) retract the child's old `card/block` +
> `addLastBlock` under a new parent. `block/is-list` is a flag written exclusively from UI
> code. Both facts are required to be set together for a valid nested item, but they are
> written by *different layers* and are not transactionally coupled (see violations).

---

## Invariants

### I1 — Sibling order is a fractional-index total order, tie-broken by fact id
- **Rule:** Children of a parent are ordered by their `card/block` `position` string
  (lexicographic). Positions are *not* guaranteed unique; when two siblings share a
  position the read layer breaks the tie by fact `id`.
- **Trigger/Context:** every read of a child list.
- **Enforced at:** sort with id tiebreak only in `getBlocks.ts:37-40` and
  `getBlocks.ts:116-119` (`a.data.position === b.data.position ? a.id > b.id`). The
  recursive `getChildren` sorts and the `toSorted` calls inside mutations
  (e.g. `mutations.ts:106-108,131-135`) and `useEntity` (`index.tsx:251-261`) do **not**
  apply the id tiebreak.
- **Notes:** Total order is only *deterministic* in the two top-level read functions.
  Everywhere else equal positions sort arbitrarily/unstably. Uniqueness is never enforced.

### I2 — New positions are generated strictly between the two intended neighbors
- **Rule:** Insertion position = `generateKeyBetween(prevPos | null, nextPos | null)` using
  the immediate neighbors in the *target* parent's sorted child list.
- **Trigger/Context:** add/move/indent/outdent/Enter.
- **Enforced at:** `addLastBlock` `mutations.ts:116`; `moveBlock` `:143-162`;
  `moveChildren` `:187-190,203-206`; `outdentBlock` `:242,257-260`; `moveBlockUp`
  `:531-534`; `moveBlockDown` `:556-559,581-585`; Enter `keymap.ts:512-526`,
  `useBlockKeyboardHandlers.ts:240-243`.
- **Notes:** `generateKeyBetween(a, b)` **throws** if `a >= b`. Callers assume neighbors are
  strictly ordered; if I1's uniqueness is already violated (two equal positions) a later
  insert "between" them throws and the mutation is dropped server-side (see V1/V5).

### I3 — A child has exactly one parent edge at a time (move = retract-then-assert same id)
- **Rule:** Moving a block preserves the **single** `card/block` fact identity: the old
  edge is retracted and a new edge re-asserted **reusing the same fact id**, so a block is
  never simultaneously present under two parents.
- **Trigger/Context:** `moveBlock`, `moveChildren`, `moveBlockUp/Down`, `outdentBlock`.
- **Enforced at:** `moveBlock.ts:138` (retract) + `:164-173` (assert same `block.id`);
  `moveChildren:192-202`; `moveBlockUp:524-537`; `moveBlockDown:575-588`;
  `outdentBlock:239,261-270`.
- **Notes:** Relies on retract+assert of the same id landing in one server transaction
  (they do — one mutation runs to completion inside the push tx,
  `push.ts:142-174,195-198`). `indent` is the exception: it uses **two separate
  mutations** (`retractFact` then `addLastBlock`) with a *new* fact id
  (`list-operations.ts:48-53`), so the edge identity changes and the two are not atomic
  relative to other clients (see V2).

### I4 — `card/block` value uniqueness across the whole document is assumed but not enforced
- **Rule (assumed):** Each block entity is referenced by at most one `card/block` fact
  anywhere in the tree, so the tree is a forest (each node one parent) with no shared
  subtrees.
- **Enforced at:** Nothing enforces this. It emerges only because every structural op uses
  retract-then-assert (I3). No mutation checks for or removes a pre-existing edge to the
  same value before asserting a new one.
- **Notes:** `addLastBlock` (`mutations.ts:100-119`) asserts a `card/block` edge to an
  arbitrary `entity` **without** first checking whether that entity already has a parent
  edge. `indent` retracts the old edge first (`list-operations.ts:48`), but if that
  `retractFact` is dropped (permissions/ordering) the block gets a *second* parent. See V2.

### I5 — Cycle prevention is positional/UI-only, not validated
- **Rule (assumed):** A block is never made a descendant of itself.
- **Enforced at:** No structural check. `indent` only moves a block under a sibling that
  precedes it (`previousBlock`) at the same depth (`list-operations.ts:42-53`), and
  `outdent`/`outdentBlock` move strictly toward the root using the block's own ancestor
  `path` (`list-operations.ts:116-143`). Cycles are avoided only because these chosen
  parents are, by construction, not in the moved block's subtree.
- **Notes:** `moveBlock`/`moveChildren` take an arbitrary `newParent` argument and do **no**
  ancestor check; a caller passing a descendant as `newParent` would create a cycle, which
  the recursive reader `getChildren` (`getBlocks.ts:47-89`) would follow until stack
  overflow. The reader has no visited-set guard. See V6.

### I6 — Deletion removes the whole subtree and all inbound references (no orphan promotion)
- **Rule:** Removing a block deletes the block entity and, via `deleteEntity`, **all** facts
  with that entity (eav) **and** all facts referencing it (vae) — including its `card/block`
  edges to its own children. Children are therefore deleted transitively, not promoted.
- **Trigger/Context:** `removeBlock` / `deleteBlock`.
- **Enforced at:** client `deleteEntity` scans eav prefix `${entity}` + vae prefix `entity`
  and `tx.del`s all (`clientMutationContext.ts:121-135`); server deletes the entity row
  (FK `ON DELETE CASCADE` removes its facts, `init.sql:45`) and explicitly deletes facts
  whose `data->>'value'` is in the delete set (`cachedServerMutationContext.ts:144-153,
  260-287`).
- **Notes:** Cascade is **one level via SQL**: deleting block B removes B's row -> cascades
  B's own facts (including B's `card/block` edges to children C). But **C's entity rows are
  not deleted by SQL cascade** — only B's edge facts are. The *recursive* deletion of an
  entire subtree depends on the **caller** enumerating descendants. `deleteBlock`
  (`utils/deleteBlock.ts:129-135`) only calls `removeBlock` for the **explicitly passed
  `entities`**, not their list children. So deleting a list item with nested children
  **orphans the descendants' entities** (their `card/block` edge to the now-deleted parent
  is gone, so they vanish from the tree, but the entity + its facts persist). See V3.

### I7 — `removeBlock` / `deleteEntity` are idempotent
- **Rule:** Deleting an already-deleted entity is a no-op.
- **Enforced at:** server `deleteEntity` just pushes to `deleteEntitiesCache`
  (`cachedServerMutationContext.ts:144-153`); the final `DELETE ... WHERE id IN (...)` is
  naturally idempotent (`:260-263`). `retractFact` on a missing id no-ops because
  `scanIndex.id` returns undefined and it early-returns (`:201-203`).
- **Notes:** Safe to replay. `removeBlock` accepts a single arg or an array
  (`mutations.ts:420-423`) and loops; replay is harmless.

### I8 — A list item's depth and path are derived purely from read-time recursion (never stored)
- **Rule:** `listData.depth`, `listData.path` (ancestor chain of `{entity, depth}`), and
  `listData.parent` are **computed** by walking `card/block` edges top-down; depth starts at
  1 for a `is-list` root and increments per level. They are not persisted facts.
- **Trigger/Context:** `getBlocksWithType` / `getBlocksWithTypeLocal`.
- **Enforced at:** `getBlocks.ts:46-89` (recursion seeds `depth=1, path=[]` at the root that
  has `block/is-list=true`, then `depth+1` and `path=[...path,{entity,depth}]` per child);
  mirror in `getBlocks.ts:125-160`.
- **Notes:** Because depth/path are derived, indent/outdent only need to rewire `card/block`
  edges; they never write depth. Correctness of depth therefore depends entirely on the edge
  graph being a proper tree (I4/I5).

### I9 — `block/is-list` is set only on the depth-1 root; nesting is followed regardless of children's flag
- **Rule (de facto):** The recursive reader keys list rendering on the **top-level** block's
  `block/is-list` only. Once a top-level block is a list root, *all* its `card/block`
  descendants are treated as list items regardless of whether they individually carry
  `block/is-list`.
- **Enforced at:** `getBlocks.ts:44-90` — `isList` is read for the top-level block `b`
  (`:43`); if true, `getChildren` recurses and emits `listData` for every descendant
  **without** checking each descendant's own `block/is-list` (`:46-89`). The descendant's
  `block/is-list` fact is never read inside `getChildren`.
- **Notes:** This makes the per-item `block/is-list` flag **load-bearing only for depth-1
  blocks** when read through the tree. But it is still written on every new nested item
  (`keymap.ts:551-555`, `useBlockKeyboardHandlers.ts:252-256`) and is required when a nested
  item is later *promoted* to depth 1 (e.g. via outdent) so it stays a list. The invariant
  "every list item has `block/is-list=true`" is *intended* (everything that creates a list
  item asserts it) but *not required* by the reader for non-root items — a latent
  inconsistency (V4).

### I10 — A block has exactly one type, one heading level, one alignment, ... (cardinality-one attrs)
- **Rule:** All `block/*` scalar attributes are cardinality **one**: `block/type`,
  `block/is-list`, `block/check-list`, `block/heading-level`, `block/list-style`,
  `block/text`, `block/image`, `block/card`, etc.
  (`attributes.ts:55-144`). Asserting one replaces the prior value (same fact id reused).
- **Enforced at:** cardinality lookup-and-reuse-id in both contexts
  (`clientMutationContext.ts:50-69`, `cachedServerMutationContext.ts:163-168`).
- **Notes:** This is the mechanism guaranteeing "one parent page per card" (`block/card`),
  "one type per block", etc. It is **not** DB-enforced (V5): if two equal-id-less asserts
  for the same cardinality-one (entity, attribute) race across two clients, two facts with
  *different* ids can both land, and the reader will then pick one arbitrarily
  (`useEntity` takes `d[0]`, `index.tsx:264`).

### I11 — `card/block` (doc) and `canvas/block` are mutually exclusive parent-edge types
- **Rule (assumed):** A block is reached either through a `card/block` edge (doc/list) or a
  `canvas/block` edge (canvas), based on the page's `page/type` ("doc" vs "canvas"). The two
  are produced by different add paths and never both for the same child.
- **Enforced at:** `addBlock` writes `card/block` (`mutations.ts:83-92`); `addCanvasBlock`
  writes `canvas/block` (`:54-63`). The Enter handler branches on `pageType`
  (`useBlockKeyboardHandlers.ts:207-233` vs `:236-270`; `keymap.ts:445-490` vs `:491-583`).
- **Notes:** Nothing prevents both edge types pointing at the same child. A canvas block can
  *also* be a list (canvas Enter asserts `block/is-list=true`, `keymap.ts:468-488`); on
  canvas, nested children still hang off `card/block`, so a canvas list item has a
  `canvas/block` edge from the page *and* `card/block` edges to its own children. So "is a
  list item" and "is a canvas block" are **not** mutually exclusive — only the *page-level*
  edge type differs.

### I12 — Server processes each mutation idempotently by client mutation id (replay-safe ordering)
- **Rule:** Each mutation is applied at most once per client: the server skips any mutation
  whose `id <= lastMutationID` for that client.
- **Enforced at:** `push.ts:142-146` (`if (mutation.id <= lastMutationID) continue;`), under
  a per-token advisory lock `push.ts:100` serializing pushes for the same document.
- **Notes:** A *failing* mutation still advances `lastMutationID` (the id is recorded at
  `push.ts:146` before the try, and `lastMutations.set` at `:173` runs after a caught
  error, `:161-172`) — so a mutation that throws is **never retried** and its intended
  writes are silently lost. This is the engine behind several violations below.

### I13 — Mutation handlers are written to "find-then-act" and early-return on missing targets
- **Rule:** Structural mutations locate their target in the current child list and bail
  (no-op) if absent, rather than creating dangling state.
- **Enforced at:** `moveBlock` `if (!block) return` (`:136-137`); `outdentBlock`
  `if (currentFactIndex === -1) return` / `if (index === -1) return` (`:228,256`);
  `moveBlockUp/Down` `if (index === -1) return` (`:521,547`); `retractAttribute`,
  `deleteFootnote`, `deleteComment` all guard `if (fact) ...`.
- **Notes:** Good for idempotency/concurrency (a move whose target a peer already moved
  no-ops). But combined with I12 it means a *partially* valid op (target found, neighbor
  not) can still produce a bad position (see V1).

---

## Suspected inconsistencies / violations

### V1 — `generateKeyBetween` can throw on equal/inverted neighbors, silently dropping the move
- `generateKeyBetween` throws if `lower >= upper`. Multiple mutations compute positions
  from neighbor pairs that are only valid if I1's (unenforced) uniqueness holds:
  `moveBlock:158-161`, `outdentBlock:257-260`, `moveBlockUp:531-534`, `moveBlockDown`
  `:556-559`. If two siblings already share a position (allowed — see I1) and you insert
  "between" them, the call throws.
- On the server the throw is caught (`push.ts:161-172`) and the mutation is abandoned **but
  its mutation id is still committed** (I12), so the structural change is permanently lost
  on the server while the optimistic client state diverges until the next pull overwrites
  it. Why it matters: silent data loss / client-server divergence with no error surfaced.

### V2 — `indent` can create a block with two parents (non-atomic, new fact id)
- `indent` (`list-operations.ts:48-53`) fires **two independent mutations**:
  `retractFact({factID: block.factID})` then `addLastBlock({parent: newParent, factID: v7(), entity: block.value})`.
  Unlike every other move (I3), it does not reuse the fact id and the two ops are separate.
- `addLastBlock` (`mutations.ts:100-119`) asserts the new `card/block` edge **without
  checking** whether `entity` already has a parent edge. If the `retractFact` is dropped or
  reordered relative to `addLastBlock` (e.g. retract hits a permission/ownership guard at
  `cachedServerMutationContext.ts:201-205`, or the two land in different push batches — the
  pusher batches 250 mutations, `index.tsx:135-150`), the block ends up referenced by **two**
  `card/block` facts -> two parents (violates I4) -> appears twice in the tree / ambiguous
  depth. Why it matters: structural corruption from a routine Tab press.

### V3 — Deleting a list item with descendants orphans the descendant entities
- `deleteBlock` enumerates only the explicitly selected `entities` and calls `removeBlock`
  on each (`utils/deleteBlock.ts:117-135`); it does **not** collect nested `card/block`
  descendants. `removeBlock`/`deleteEntity` cascades only the deleted block's own facts
  (including its edges to children), **not** the children's entities/facts
  (`cachedServerMutationContext.ts:144-153,260-287`; SQL cascade is one level, `init.sql:45`).
- Result: descendants lose their inbound edge and disappear from the tree (no longer reached
  by `getChildren`), but their entity rows and `block/text`/`block/type`/etc. facts remain in
  the DB forever as unreferenced garbage. Contrast `deleteComment` which *does* explicitly
  loop replies (`mutations.ts:1047-1051`) and `deleteBlock` which loops footnotes
  (`utils/deleteBlock.ts:117-127`) — nested list children have no equivalent cleanup. Why it
  matters: orphaned/leaked entities; depending on how a parent is deleted, descendants may be
  unexpectedly lost rather than promoted.

### V4 — Nested list items are not required to carry `block/is-list`; promotion can silently de-list them
- The reader emits `listData` for descendants without reading their `block/is-list`
  (`getBlocks.ts:46-89`, I9), but promotion code assumes the flag is present. When a depth-1
  item is converted to text, `outdent`/`outdentFull` *explicitly set* `block/is-list=false`
  and move children to the page (`list-operations.ts:104-115,58-88`). Those promoted children
  become depth-1 and now **must** have `block/is-list=true` to still render as a list — which
  they only do if it was asserted when they were created (Enter path does assert it,
  `keymap.ts:551-555`). But items created by other paths (e.g. dragged in, or any path that
  rewires `card/block` without asserting `is-list`) can be valid nested items that, once
  promoted to depth 1, **lose list-ness** because their own `block/is-list` was never set.
  Why it matters: inconsistent invariant — "list item ⇒ `block/is-list=true`" is assumed by
  promotion but not guaranteed by nesting.

### V5 — Cardinality-one is not DB-enforced; concurrent asserts can create duplicate scalar facts
- "Assert replaces" works by reusing the existing fact's id (`clientMutationContext.ts:50-69`,
  `cachedServerMutationContext.ts:163-168`). If **two clients** both assert the same
  cardinality-one `(entity, attribute)` for the *first* time concurrently (neither sees the
  other's fact yet), each mints a different `id` (`:158`), and the flush `onConflictDoUpdate`
  is keyed on `facts.id` (`:246`), so **both rows persist**. There is no unique index on
  `(entity, attribute)` to collapse them (`init.sql:35-41`). The reader then arbitrarily picks
  `d[0]` (`index.tsx:262-264`). Affected structural attrs: `block/type`, `block/is-list`,
  `block/check-list`, `block/heading-level`, `block/list-style`, `block/card`. Why it matters:
  a block can transiently have two types / two `block/card` parents / two list-styles, with
  arbitrary read resolution and a leaked duplicate fact.

### V6 — `moveBlock`/`moveChildren` accept an arbitrary `newParent` with no ancestor/cycle check
- Neither mutation verifies `newParent` is outside the moved block's subtree
  (`mutations.ts:121-208`). All current callers pass safe parents derived from `listData.path`
  (`list-operations.ts`), so this is latent, but a future/buggy caller (or a stale `path` in a
  concurrent edit) could set a block's parent to one of its own descendants, creating a cycle.
  The recursive readers `getChildren` (`getBlocks.ts:47-89,126-160`) have **no visited set**
  and would recurse until stack overflow / hang. Why it matters: no defense-in-depth against
  cycles; the read path is non-terminating on a cyclic edge graph.

### V7 — `outdentBlock` re-parents *all* trailing siblings under the outdented block (intended, but lossy under multiselect)
- `outdentBlock` moves every sibling after the target *into* the target block as new children
  (`mutations.ts:231-253`) so they stay nested under it after it moves up a level. It filters
  `excludeFromSiblings` for multiselect (`:230-233`). If the `excludeFromSiblings` set passed
  by `multiSelectOutdent` (`list-operations.ts:146-189`) is incomplete or stale relative to
  what the server sees, trailing siblings can be re-nested under the wrong block. This is a
  correctness-under-concurrency concern rather than a hard invariant break, but it depends on
  client-computed sets matching server state, which I12/I13 do not guarantee.

### V8 — A failed structural mutation is never retried but its id is committed (compounds V1/V2)
- Per I12, `push.ts` advances `lastMutationID` even for a thrown mutation
  (`push.ts:146,161-173`). Replicache will not resend it. Any invariant that depends on a pair
  of mutations both succeeding (e.g. V2's retract+add, or any optimistic client edit whose
  server replay throws via V1) ends with the client and server **permanently** disagreeing
  until a full reset, because the lost write is never reattempted. Why it matters: turns
  transient throws into durable divergence.

---

## Open questions / ambiguities

1. **Is `block/is-list` meant to be on every list item or only roots?** The reader only needs
   it on roots (I9), but creation paths set it everywhere. Which is the intended invariant?
   (Affects whether V4 is a bug or by-design.)
2. **Who is responsible for recursively deleting list descendants?** No code collects nested
   `card/block` children before `removeBlock` (V3). Is leaking descendant entities acceptable
   (they're just unreachable), or is subtree promotion the intended behavior on delete?
3. **Are equal `position` values expected to occur in practice?** I1 tolerates them but I2's
   `generateKeyBetween` cannot insert between them. Is there an assumed guarantee (e.g. v7
   uuids + per-client generation) that makes collisions impossible, or is this a real hazard?
4. **`addLastBlock` accepting an entity that may already have a parent** — is the contract that
   callers always retract the old edge first (as `indent` does), and is the non-atomicity of
   that pair (V2) considered acceptable given the advisory lock serializes a single client's
   pushes but not cross-client interleaving?
5. **Canvas + list combination** (I11): is a canvas block that is also a list root an intended
   state, and is the page-level `canvas/block` edge plus internal `card/block` child edges the
   designed representation? No invalidation prevents a child entity from having both a
   `canvas/block` and a `card/block` inbound edge.
6. **Server vs client `assertFact` divergence:** the client merges Yjs `block/text` updates on
   cardinality-one assert (`clientMutationContext.ts:54-68`) but the server does **not** merge
   — it overwrites `data` wholesale (`cachedServerMutationContext.ts:189-199,246-254`). For
   `block/text` this is mediated by Yjs realtime, but is there any structural attribute where
   client-side merge vs server-side overwrite could diverge? (Out of strict scope but relevant
   to "assert replaces" semantics for structure.)
