# Paste Performance Plan: Bulk-Paste Mutator with Pre-Encoded Yjs Content

## Context

`components/Blocks/TextBlock/useHandlePaste.ts` is the paste handler for ProseMirror text blocks. Large pastes (long Google Docs, long articles, Leaflet cards with many embedded facts) are visibly slow and have several correctness footguns:

1. **Per-block fact fanout.** Each pasted block fires up to ~6 separate `rep.mutate.*` calls (`addBlock`, then individual `assertFact` calls for `heading-level`, `text-alignment`, `text-size`, `is-list`, `check-list`, `list-style`). Each is its own Replicache transaction and IDB commit. A 100-block paste produces ~500 transactions.
2. **`setTimeout(..., 10)` mount race.** The handler creates a block via `addBlock`, then schedules a 10ms timer to inject content into the not-yet-mounted ProseMirror view. If mount takes longer than 10ms (likely with 200 blocks committing in one React commit), content is silently dropped.
3. **Editor-state storm.** Each timer fires its own `setEditorState`, which triggers the unkeyed `useEditorStates.subscribe` listener in `mountProsemirror.ts:214` for every mounted block on the page.
4. **Per-block undo entries.** Pasting 200 blocks requires 200 Cmd-Z presses to undo. `undoManager.withUndoGroup` cannot fix this because the per-block undo adds happen inside `setTimeout` bodies, well after the synchronous group has closed.
5. **300ms Yjs persistence debounce.** Pasted content reaches Replicache only after the `useYJSValue` `observeDeep` callback fires; a tab close within 300ms of paste loses everything.

The fix is architectural: stop driving paste through the live editor view. Instead, encode each pasted block's content as a Yjs binary update on the client, then write all entities + facts (including `block/text`) in a **single Replicache mutator transaction**. When the new blocks subsequently mount, `useYJSValue` reads the `block/text` fact via the standard load path and ProseMirror initializes with content already present.

## Architecture

A Replicache mutator runs inside one `WriteTransaction` (see `src/replicache/index.tsx:111-129`). All `ctx.assertFact`, `ctx.createEntity`, and `tx.set` calls inside a single mutator are one IDB commit and produce one subscriber-batched re-fire. This is the same buffer-and-flush pattern as `cachedServerMutationContext` on the server, just expressed through Replicache's existing transaction model.

`block/text` (`src/replicache/attributes.ts:66-69`) is stored as a base64-encoded Yjs update. `useYJSValue` (`mountProsemirror.ts:328-369`) reads it and `Y.applyUpdate`s into a fresh Y.Doc with fragment name `"prosemirror"` (line 332); `ySyncPlugin` then binds ProseMirror to that doc. `y-prosemirror` exports `prosemirrorToYDoc(node, fragmentName)` which produces the same Yjs state structure from a ProseMirror Node offline — confirmed at `node_modules/y-prosemirror/dist/src/lib.d.ts:12`. The offline encoding uses the same single-block `schema` (`schema.ts`) that the live editor mounts with; `multiBlockSchema` / `multilineParser` are unused in this file and should be deleted as part of phase 1.

`parser.parse(child)` returns a doc `Node` (prosemirror-model `parse(): Node`, not `parseSlice`), so it can be passed to `prosemirrorToYDoc` directly with no wrapping step.

## Phase 1: Rewrite `useHandlePaste.ts` to build the payload offline

**File: `components/Blocks/TextBlock/useHandlePaste.ts`**

The existing generic mutators are already sufficient — no new mutator needed.

- `assertFact` (mutations.ts:366-373) accepts `FactInput | Array<FactInput>` and writes all facts in one Replicache transaction / one IDB commit.
- `createEntity` (mutations.ts:483-489) accepts `Array<{ entityID, permission_set }>` and creates all entities in one transaction.
- Both honor `ignoreUndo`, which the wrapper at `index.tsx:122` reads as `args.ignoreUndo` (works for either an object or a tagged-array). This suppresses the per-`ctx.assertFact` undo registrations in `clientMutationContext.ts:78-98`. **Call signature:** the mutator takes one argument; `ignoreUndo` must be set as a property on the array, mirroring `clientMutationContext.ts:139-152`. There is no second-arg overload.

Replace `createBlockFromHTML`'s per-block mutation calls with offline payload construction, then two bulk mutator calls:

```ts
import { prosemirrorToYDoc } from "y-prosemirror";
import * as Y from "yjs";
import * as base64 from "base64-js";
import { generateNKeysBetween } from "fractional-indexing";
import type { FactInput } from "src/replicache/mutations";

type BuiltBlock = {
  entityID: string;
  parent: string;
  type: Fact<"block/type">["data"]["value"];
  facts: FactInput[];        // block/type, block/text, heading-level, alignment, ...
};

// inside the paste handler, after the existing HTML parse:
const built: BuiltBlock[] = [];
const extraEntities: Array<{ entityID: string; permission_set: string }> = [];

for (const child of children) {
  const items = buildBlockFromHTML(child, {
    parentType: propsRef.current.pageType,
    permission_set: entity_set.set,
    parent: pasteParent,
    /* no rep — pure data shaping */
  });
  if (items) {
    built.push(...items.blocks);
    if (items.extraEntities) extraEntities.push(...items.extraEntities);
  }
}

// Empty paste — bail before registering any undo entry.
if (built.length === 0) return true;

// Allocate positions for all top-level pasted blocks in one call. Nested
// recursion (lists, cards) generates its own keyspace under its own parent.
const topLevel = built.filter((b) => b.parent === pasteParent);
const positions = generateNKeysBetween(
  propsRef.current.position || null,
  propsRef.current.nextPosition || null,
  topLevel.length,
);
const positionByEntity = new Map(topLevel.map((b, i) => [b.entityID, positions[i]]));

const entities: Array<{ entityID: string; permission_set: string }> & { ignoreUndo?: true } = [
  ...built.map((b) => ({ entityID: b.entityID, permission_set: entity_set.set })),
  ...extraEntities,
];
const allFacts: FactInput[] & { ignoreUndo?: true } = [];
for (const b of built) {
  allFacts.push(...b.facts);
  // Parent reference fact — note: canvas needs a different shape, see the
  // "Canvas carve-out" below; canvas pastes do NOT go through the bulk path.
  const position = positionByEntity.get(b.entityID);
  if (position !== undefined) {
    allFacts.push({
      entity: b.parent,
      attribute: "card/block",
      data: { type: "ordered-reference", value: b.entityID, position },
    });
  } else {
    // Nested (list child, card sub-entity) — buildBlockFromHTML emitted the
    // parent reference fact itself with its own keyspace.
  }
}

entities.ignoreUndo = true;
await rep.mutate.createEntity(entities);
allFacts.ignoreUndo = true;
await rep.mutate.assertFact(allFacts);
```

`buildBlockFromHTML` is a pure function — no `rep.mutate` calls, no `undoManager.add`, no `setTimeout`. For each HTML element:
- Determine `type`, `headingLevel`, `alignment`, `textSize`, list attributes (same switch logic as today, lines 214-326), and emit them as `FactInput` entries in `facts`.
- **For `text` / `heading` / `blockquote` only**: call `parser.parse(child)` (returns a doc Node from the single-block `schema`), then `prosemirrorToYDoc(doc, "prosemirror")`, then `Y.encodeStateAsUpdate(ydoc)`, then `base64.fromByteArray(...)`. Emit as a `block/text` `FactInput`. Do **not** Yjs-encode the other types below — they store content in different facts:
  - `code` → string in `block/code` (+ `block/code-language` for the language tag)
  - `math` → string in `block/math`
  - `bluesky-post` → string in `block/bluesky-post`
  - `link` → handled by `addLinkBlock` semantics; no `block/text`
  - `button` → `button/text` + `button/url`
  - `image` → no inline content; see phase 4 below
  - `horizontal-rule` → only `block/type`, no other facts
- For link/code/math/bluesky-post/button: emit the specialized `block/type` and supporting facts (same logic as lines 327-429).
- For `IMG`: emit a block of type `image` (with `block/type`) plus a placeholder `block/image` local fact mirroring `addImage.ts:58-69`. The async upload runs after the bulk mutator resolves (phase 4) — the block must exist with at least a local-URL fact so the renderer is not blank.
- For `HR`: emit `block/type = "horizontal-rule"`. No other facts.
- For `UL`/`OL`: recurse. The nested list's children are siblings under the LI's `entityID` (different parent scope), so they generate their own position keyspace via a local `generateNKeysBetween` call. The outer top-level keyspace is unaffected. `block/is-list`, `block/check-list`, `block/list-style` are emitted per-LI (current logic at lines 498-543).
- For `data-entityid` (Leaflet card paste): see "Card paste" sub-spec below.

**Card paste sub-spec.** Current logic at `useHandlePaste.ts:431-496` does more than the original sketch suggested. `buildBlockFromHTML` must reproduce all of it as pure data:
1. Parse `data-facts` JSON.
2. Collect every unique `f.entity` in the parsed facts; mint a fresh `v7()` per old ID into an `oldEntityIDToNewID` map.
3. Walk the facts; for `data.type ∈ {"ordered-reference", "spatial-reference", "reference"}`, remap `data.value` through the map. Image facts (`data.type === "image"`) are kept aside for the async refetch path (see below).
4. Emit one `card`-typed wrapper block. Emit a `block/card` reference fact from the wrapper to `oldEntityIDToNewID[rootCardEntity]` — without this the wrapper is orphaned in the renderer.
5. Push every remapped (non-image) fact into the top-level `allFacts` array, and every minted entity into `extraEntities`.
6. Image facts: append to a shared async-upload queue, processed after both bulk mutator calls resolve. Each entry refetches `image.data.src`, calls `addImage(blob, rep, { attribute, entityID: oldEntityIDToNewID[oldEntity] })`. This consolidates with the `<IMG>` async path in phase 4.

**Canvas carve-out.** `addBlock` and the bulk path emit `card/block` + `ordered-reference` with a string position. Canvas requires `canvas/block` + `spatial-reference` with `{x,y}` (`attributes.ts:19-22, 306-310`, `mutations.ts:42-69` `addCanvasBlock`, `Canvas.tsx:144-150`). Canvas paste also has a pre-existing bug at `useHandlePaste.ts:276-283`: when `parentType === "canvas"`, every child reuses the active block via `setTimeout`, with last-write-wins clobbering, and the `else` branch never calls `addBlock` for canvas.

This plan **does not address canvas paste**. The bulk path is gated to `parentType === "doc"`. Canvas paste keeps the existing live-view path unchanged. Fixing canvas paste (whether to consolidate into one block via offline Yjs merge, or to lay out N blocks with `{x,y}` offsets) is tracked separately.

**Active-block reuse path (doc only).** Keep the existing live-view branch for the first block when the active block's type is `heading`, `blockquote`, or matches the new block's type (`useHandlePaste.ts:276-283`, doc branch only). Yjs `mergeUpdates` semantics don't represent selection-replacement, so re-using the live editor for the single block that already exists is the pragmatic choice. The N-1 remaining blocks go through the bulk path. When this branch fires, `built[0]` is dropped from the bulk emission and its content is applied via the existing `replaceSelectionWith` path.

**Active-block deletion of selected range**: when the user has a selection in the active block at paste time, today we `tr.delete(selection.from, selection.to)` before `replaceSelectionWith`. Today this runs inside the per-block `setTimeout` for every block — harmless for new blocks (empty), but unnecessary. Move it to a single pre-loop step on the live-view branch, before the first block is applied.

Delete `createBlockFromHTML` (lines 162-604) entirely after the rewrite. `flattenHTMLToTextBlocks` (lines 606-655) stays — `buildBlockFromHTML` uses it. Move `flattenHTMLToTextBlocks`'s tag whitelist to a module-level `Set` to avoid re-allocating on each call. Also delete the unused `multilineParser` + `multiBlockSchema` imports at lines 6, 21-22.

## Phase 2: Single undo entry per paste

After both bulk mutator calls resolve, register one undo entry at the paste-handler level. Note the `ignoreUndo` array-property pattern (mirrors `clientMutationContext.ts:139-152`):

```ts
const newEntityIDs = entities.map((e) => e.entityID);
undoManager.add({
  undo: async () => {
    // deleteEntity already handles facts + reference cleanup
    // (clientMutationContext.ts:121-135 scans both eav and vae).
    for (const id of newEntityIDs) {
      await rep.mutate.deleteEntity({ entity: id, ignoreUndo: true });
    }
  },
  redo: async () => {
    entities.ignoreUndo = true;
    await rep.mutate.createEntity(entities);
    allFacts.ignoreUndo = true;
    await rep.mutate.assertFact(allFacts);
  },
});
```

`ignoreUndo: true` on the bulk mutator calls is what makes this work — without it, each `ctx.assertFact` invocation inside the `assertFact` mutator body registers its own undo entry (clientMutationContext.ts:78-98), and the user would still need N Cmd-Z presses. Skip the `undoManager.add` registration entirely if `built.length === 0` (handled by the early return in phase 1).

A future optimization (not in this phase): add a bulk `deleteEntities` mutator so the undo callback is one transaction instead of N. Not needed for correctness — undo of paste is rare, and N `deleteEntity` calls are still far better than the status quo.

## Phase 3: Cursor placement after paste

Move the `focusBlock` call out of the per-block path. After both bulk mutator calls resolve, call once:

```ts
focusBlock({ value: lastBlock.entityID, type: lastBlock.type, parent: lastBlock.parent }, { type: "end" });
```

`focusBlock` (`src/utils/focusBlock.ts:72`) currently bails with a bare `if (!nextBlock || !nextBlock.view) return;` — no polling, no retry. Since the bulk path resolves before the new blocks have mounted, this call would silently no-op. **This is unspecified work the phase must implement**: add a retry loop subscribing to `useEditorStates` (or polling with `requestAnimationFrame`) that resolves when `editorStates[entityID].view` becomes defined, with a max-attempts cap (e.g., 30 frames / 500ms) to avoid infinite loops if the block fails to mount (off-screen virtualization, error boundary).

`focusBlock` also calls `flushSync` at line 16. The new call site is after `await rep.mutate.assertFact(...)`, i.e., a microtask outside the original paste event. React permits `flushSync` there but will warn if a render happens to be in flight. Verify during implementation; if warnings appear, wrap the focus call in `queueMicrotask` or move the cursor placement into the retry callback (which runs after React has committed the new block).

## Phase 4: Image upload pipeline (independent of phases 1-3)

`addImage` does fetch → `createImageBitmap` × 2 → canvas re-encode → upload. Unbounded concurrent calls during a 30-image paste pin the main thread for CPU work (decode/encode/thumbhash) and saturate network for upload — both matter.

- Add a shared concurrency limiter wrapping the whole `addImage` pipeline. Both main-thread fairness (multiple `createImageBitmap` + canvas operations) and upload-bandwidth fairness benefit from serializing the entire pipeline, not just `fetch`.
- Share the bitmap between `normalizeOrientation` and `getThumbHash` to eliminate one full decode per image (`src/utils/addImage.ts:86-138`).
- Fix `isAnimatedFormat` to also match `image/webp` containers that are animated (currently only matches gif/apng despite the comment claiming otherwise).
- Add `.catch()` on the two `fetch` sites (`useHandlePaste.ts:386-394, 484-494`) so failed image fetches don't leave silent empty `image`-typed blocks. The block currently renders as `return null` for readers without write permission (`components/Blocks/ImageBlock.tsx:90-91`) — i.e., the image disappears entirely. Surface the failure (toast or fallback to link block).

The phase 1 bulk path emits `image`-typed blocks with a placeholder `block/image` local-URL fact (matching `addImage.ts:58-69`) so the renderer is not blank between the bulk commit and the upload completing. The actual upload is queued and fires after both bulk mutator calls resolve. The card-paste image-refetch path (formerly `useHandlePaste.ts:484-494`) shares the same queue.

## Phase 5: Keyed `useEditorStates.subscribe` in `mountProsemirror` (independent)

`mountProsemirror.ts:214-219` subscribes every block to every `useEditorStates` change. With N blocks on the page, every editor transaction fires N × N callback invocations. This degrades typing performance independently of paste.

Zustand 5 (`^5.0.11`, see `package.json`) only supports the 2-arg `subscribe(selector, listener)` form when the store is wrapped in the `subscribeWithSelector` middleware at create-time. `useEditorStates` is currently created without middleware (`src/state/useEditorState.ts:4-16`), so the call signature change must be paired with a one-line middleware addition:

```ts
// src/state/useEditorState.ts
import { subscribeWithSelector } from "zustand/middleware";
export const useEditorStates = create(subscribeWithSelector(() => ({ /* ... */ })));
```

Existing single-arg subscribers (`mountProsemirror.ts:214`, `FootnoteEditor.tsx:149`) continue to work — the middleware extends the API, it doesn't replace it. Then in `mountProsemirror.ts`:

```ts
const unsubscribe = useEditorStates.subscribe(
  (s) => s.editorStates[entityID],
  (editorState) => {
    if (editorState?.initial) return;
    if (editorState?.editor) editorState.view?.updateState(editorState.editor);
  }
);
```

This is independent of the paste rewrite but compounds the win.

## Phase 1b: `isNewEntity` shortcut in `assertFact` (measurement-gated)

`clientMutationContext.ts:50-51` calls `scanIndex(tx).eav(f.entity, f.attribute)` for every cardinality-one fact. In today's per-block model this scan touches a small tx view. In the bulk path it runs ~400-1000 times in a single transaction (e.g., 200 blocks × ~3 cardinality-one facts each), with no scan memoization (each call is an async btree walk on a unique prefix). Realistic cost: 100-500ms inside one transaction — exactly the interval we are trying to eliminate.

Fix: add an `isNewEntity?: true` flag on `FactInput`. When set, `assertFact` skips the eav scan and the `Y.mergeUpdates` branch (the entity is by construction empty for these attributes). The phase 1 payload-construction code sets this flag on every fact whose entity is in the freshly minted set (`built[].entityID` ∪ `extraEntities[].entityID`). Facts targeting pre-existing entities (e.g., the parent `card/block` reference) leave it unset.

This phase is **measurement-gated**: ship phase 1 first, instrument with `performance.mark` (validation step 2 below), and add the shortcut if the eav scans dominate. The fix is one if-statement in `clientMutationContext.ts` and one field on `FactInput`. It does break the phase-1 claim that no changes are needed in `clientMutationContext.ts`, but the change is local and the alternative — measured 100-500ms inside one transaction — would make the "order of magnitude" win disappoint.

## Risks and behavior preservation

| Risk | Mitigation |
|---|---|
| `prosemirrorToYDoc` produces different Yjs `clientID` than the live editor would | Yjs is CRDT — different clientIDs merge cleanly. Paste-author identity is the same human regardless. No code in the repo compares Yjs `clientID`s. |
| `createEntity` commits in one tx, `assertFact` in the next — block mounts between them and `useYJSValue` reads no `block/text` | Both the parent `card/block` reference fact AND the `block/type` fact live in the second transaction, so `getBlocksWithType` (`src/replicache/getBlocks.ts:25-44`) filters the in-between-state blocks out entirely. The two `useSubscribe` callbacks fire after each tx, but the first fires with no visible blocks (no parent ref yet); the second fires with the complete set. If a render-of-empty-set turns out to be problematic, merge to one mutator (see Future work). |
| Active-block reuse path remains as legacy code | Kept intentionally small (doc-only, first block only on matching active type). Document the split. |
| Canvas paste regression | Bulk path is gated to `parentType === "doc"`. Canvas paste keeps the existing live-view branch. Tracked as a separate plan. |
| Server-side execution | The two generic mutators (`createEntity`, `assertFact`) already run on the server via `cachedServerMutationContext`. The Yjs binary value is opaque to the server — stored as a fact and replayed. No special server work. |
| `undoManager.add` registered at handler level captures stale closures | The undo callback references `entities` and `allFacts` arrays, both captured at paste time. Re-running paste from redo is equivalent — no view state needed. The `ignoreUndo` property persists on the arrays across redo invocations (idempotent). |
| Width/height on pasted images | Out of scope for paste itself; `addImage` already handles dimension extraction via `createImageBitmap`. |
| Rollout — no feature-flag infrastructure in repo | Keep `createBlockFromHTML` alive behind a localStorage kill-switch (e.g., `localStorage.getItem("legacyPaste") === "1"` falls through to the old path) for one release. Delete in a follow-up after the new path bakes. |

## Validation

After implementation:

1. **Manual:** paste a 200-paragraph Google Doc into a leaflet. Observe (a) UI does not freeze, (b) all content appears, (c) Cmd-Z removes everything in one press, (d) closing the tab within 1 second of paste preserves content on reload.
2. **Performance:** instrument with `performance.mark`/`measure` around the paste handler. Compare total wall time before/after on the same 200-block payload. Expect order-of-magnitude improvement.
3. **Replicache transaction count:** add a temporary counter in `clientMutationContext`. Expect 2 (createEntity + assertFact) + N (async images) after fix, vs. ~500+ before.
4. **Undo correctness:** paste, type more, paste again, Cmd-Z three times. Expect "undo paste 2" → "undo typing" → "undo paste 1".
5. **Selection / cursor:** paste at end of empty block, paste at end of block with text, paste mid-paragraph. Cursor lands at end of last pasted content in all three cases.
6. **Card paste:** copy a Leaflet card with nested entities and images. Paste into another doc. Verify all sub-entities are created (Replicache local data inspector) and images upload correctly.
7. **Edge cases:**
   - Plain-text paste (no HTML): markdown conversion still runs (no path change).
   - URL-only paste: link-mark insertion still works (live-view path, unchanged).
   - Empty clipboard: no-op (existing guards still apply).
   - Paste into canvas vs. doc: parent attribute resolution correct in both.

## Implementation order

1. Phase 1 (rewrite paste handler to build payload + call generic mutators; canvas gated out; legacy path retained behind kill-switch).
2. Phase 2 (single undo entry) — depends on phase 1.
3. Phase 3 (cursor placement, including the `focusBlock` retry loop) — small, follow-up to phase 1.
4. Instrument with `performance.mark` (validation step 2). Decide on Phase 1b.
5. Phase 1b (`isNewEntity` shortcut in `clientMutationContext`) — only if the measurements show the eav scans dominating.
6. Phase 4 (image pipeline) — independent, parallel work.
7. Phase 5 (keyed subscribe + `subscribeWithSelector` middleware) — independent, parallel work. Compounds the win.

Phases 1-3 (and 1b if needed) ship as one feature; phases 4 and 5 are separate PRs. Canvas paste is tracked as a separate plan.

## Future work (not in this plan)

- **Single-transaction bulk primitive.** If the two-transaction split (createEntity + assertFact) ever shows up in profiles, or if the in-between-mount risk in the table above actually bites, add a generic `bulkAssert: Mutation<{ entities, facts }>` to `mutations.ts` and switch the paste handler to one call. The handler-side payload construction doesn't change.
- **Bulk `deleteEntities` mutator.** Replace the N `deleteEntity` calls in the undo callback with one transaction.
- **Canvas paste.** Either consolidate all pasted children into the active block via offline Yjs merge, or lay out N blocks with `{x,y}` offsets and `addCanvasBlock`-shape facts. Separate plan.

## Files touched

- `components/Blocks/TextBlock/useHandlePaste.ts` — full rewrite of paste flow; keep `flattenHTMLToTextBlocks`. Delete unused `multilineParser` / `multiBlockSchema` imports.
- `src/utils/addImage.ts` — share bitmap between decode passes; fix `isAnimatedFormat`.
- New file: `src/utils/uploadQueue.ts` (or inline limiter in `addImage.ts`) — shared concurrency cap.
- `components/Blocks/TextBlock/mountProsemirror.ts` — keyed subscribe (phase 5).
- `src/state/useEditorState.ts` — wrap `create()` in `subscribeWithSelector` (phase 5 prereq).
- `src/utils/focusBlock.ts` — add retry-on-mount loop (phase 3); no current code path polls for an unmounted view.
- `src/replicache/clientMutationContext.ts` + `src/replicache/mutations.ts` (or the `FactInput` type definition) — only if Phase 1b is needed: add `isNewEntity` flag and the scan-skip branch.
