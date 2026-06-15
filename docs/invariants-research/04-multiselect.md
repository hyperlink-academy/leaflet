# Multi-block Selection Invariants

Scope: multi-block selection and bulk operations — keyboard, copy/cut/paste, bulk
delete, indent/outdent of multiple blocks, and how multi-select interacts with
single-block editing. All citations are `file:line`. No source was modified.

Primary files:
- `components/SelectionManager/index.tsx`
- `components/SelectionManager/selectionState.ts`
- `src/useUIState.ts`
- `src/utils/list-operations.ts`
- `components/Blocks/TextBlock/keymap.ts`
- `components/Blocks/useBlockKeyboardHandlers.ts`
- `components/Blocks/useBlockMouseHandlers.ts`
- `components/Blocks/index.tsx`
- `src/utils/copySelection.ts` / `src/utils/getBlocksAsHTML.tsx` / `src/utils/parseBlocksToList.ts`
- `components/Blocks/TextBlock/useHandlePaste.ts`
- `src/utils/deleteBlock.ts`, `src/utils/moveBlock.ts`
- `src/replicache/mutations.ts` (removeBlock / moveChildren / outdentBlock / moveBlock)
- `src/replicache/getBlocks.ts`

---

## Selection state model

State lives in a single zustand store: `useUIState` (`src/useUIState.ts:20`).

- `selectedBlocks: SelectedBlock[]` (`src/useUIState.ts:27`), where
  `SelectedBlock = Pick<Block, "value" | "parent">` (`src/useUIState.ts:5`). So
  each entry carries only `{ value, parent }` — **not** `listData`, not `type`,
  not `position`. (Note: `useBlockMouseHandlers` range-selection stuffs an extra
  `position` field in, `components/Blocks/useBlockMouseHandlers.ts:93-97`, but it
  is not part of the declared type and nothing reads it back.)
- `focusedEntity: FocusedEntity` (`src/useUIState.ts:8-12,27`), a tagged union of
  `page | block | footnote | comment | null`, each carrying `entityID` and (for
  non-page) a `parent`. This is the "cursor lives here" pointer; `selectedBlocks`
  is the "these whole blocks are highlighted" set. They are **independent fields**
  and can both be non-empty simultaneously (see hand-off section).
- `foldedBlocks: string[]` (`src/useUIState.ts:26`) — entity IDs whose list
  children are collapsed. `toggleFold` flips membership (`src/useUIState.ts:34-42`).

Mutators (`src/useUIState.ts:65-88`):
- `setSelectedBlock(block)` → replaces selection with `[block]` (single).
- `setSelectedBlocks(blocks)` → replaces with the given array verbatim.
- `addBlockToSelection(block)` → appends unless `value` already present
  (de-dupes by `value`, `:74-79`).
- `removeBlockFromSelection({value})` → filters by `value` (`:80-88`).
- `setFocusedBlock(b)` → sets `focusedEntity` (`:65`).

**Parent uniformity:** `selectedBlocks[0].parent` is treated as *the* parent for
the entire selection — `getSortedSelection` only ever queries siblings of
`selectedBlocks[0].parent` (`components/SelectionManager/selectionState.ts:17-20`),
and the meta-ArrowUp/Down shortcuts read `selectedBlocks[0].parent`
(`components/SelectionManager/index.tsx:42,57`). For list items, `parent` is the
**page/container entity** (`b.entity`), not the list parent — `getBlocksWithType`
sets `parent: b.entity` for every block including nested list items
(`src/replicache/getBlocks.ts:75,93`); the list parent is in `listData.parent`
(`src/replicache/getBlocks.ts:76-79`). So all list items at any depth in the same
page share the same `parent` and live in one flat `getBlocksWithType` array.

**Sorting / contiguity:** `selectedBlocks` is **not** kept sorted in the store —
`addBlockToSelection` appends, range-select assigns a slice. Document order is
re-derived on demand by `getSortedSelection`, which filters the
`getBlocksWithType` sibling list (already in document/position order) down to the
selected set (`selectionState.ts:21-24`). Range mouse-selection produces a
**contiguous** slice (`useBlockMouseHandlers.ts:91-98`), and shift-arrow grows by
one adjacent sibling at a time, so in practice selection is normally a contiguous
range in document order — but the store imposes **no contiguity invariant**;
Cmd-A and shift+click can in principle produce a set that is non-contiguous w.r.t.
folded/hidden rows, and nothing normalizes it.

`getSortedSelection` returns a 3-tuple
(`components/SelectionManager/selectionState.ts:37-47`):
1. `sortedBlocks` — selected blocks in document order.
2. `siblings` — the full sibling list with **folded descendants filtered out**
   (`:39-45`), i.e. the visible-rows list used for prev/next navigation and
   indent neighbor lookups.
3. `sortedBlocksWithChildren` — `sortedBlocks` **plus** the hidden children of any
   selected, folded list block (`:25-36`), used so copy/cut grabs collapsed
   subtrees.

---

## Single-vs-multi hand-off rules

The pervasive guard is `useUIState.getState().selectedBlocks.length > 1`. When
more than one block is selected, per-block ProseMirror keymap commands and the
per-block keyboard handlers become inert and the central `SelectionManager`
window-level listener takes over. Note the asymmetry: the *text keymap* checks
`> 1` (so it stays active for exactly-1 selection), while *SelectionManager*'s
bulk branches typically early-return when `length <= 1`.

| Handler (file:line) | Behavior at selection length 0/1 | Behavior at length > 1 |
|---|---|---|
| TextBlock keymap `Backspace` (`keymap.ts:133-136,243-258`) | runs per-block delete/merge logic | `:254` returns false → no-op; SelectionManager deletes |
| TextBlock keymap `moveCursorDown`/`moveCursorUp` (`keymap.ts:198,227`) | normal cursor / block jump | returns `true` (swallows key) → SelectionManager arrow logic runs |
| TextBlock keymap `Tab`/`shifttab` (`keymap.ts:402`) | per-block indent/outdent | `:402` returns false → SelectionManager Tab runs |
| `useBlockKeyboardHandlers.Tab` (`useBlockKeyboardHandlers.ts:91-104`) | indent/outdent single block | `:93` returns false → SelectionManager Tab runs |
| `useBlockKeyboardHandlers.ArrowDown`/`ArrowUp` (`:109-133`) | focuses next/prev block | `:112,:126` guard `<= 1`; skips focus move |
| `useBlockMouseHandlers.onMouseDown` shift-click (`useBlockMouseHandlers.ts:46-53`) | first shift-click adds 2nd block | keeps adding to selection |
| `Blocks` container onClick (`components/Blocks/index.tsx:110`) | may append a trailing text block | `:110` returns → empty-area click does nothing |
| `Toolbar` (`components/Toolbar/index.tsx:69-72`) | text/image/etc toolbar | forces `multiselect` toolbar |
| `Block` delete options / NonTextBlockOptions (`Block.tsx:470-473`) | shows per-block options | hidden when multiselected |
| SelectionManager mark/heading/size shortcuts (`index.tsx:33-268`) | **registered for length ≥ 1** (operate via getSortedSelection) | same — apply to all selected |
| SelectionManager bold/italic/underline/highlight/strike (`index.tsx:269-329`) | **not registered** (gated on `moreThanOneSelected`) | registered; toggles mark across all selected text blocks |
| SelectionManager Backspace/Delete, Tab, arrows, copy/cut (`index.tsx:336-613`) | bulk branches early-return on `length <= 1` | active |

**Intended invariant (mostly holds):** *When more than one block is selected, the
per-block ProseMirror text keymap is effectively inert for editing keys
(Backspace/Tab/Arrows) and the SelectionManager window listener owns those keys.*
See suspected inconsistencies for the gaps (mark/heading shortcuts, alpha keys,
Enter, Escape).

The SelectionManager window listener itself is **only mounted when
`entity_set.permissions.write && rep`** (`index.tsx:31`) and is re-created when
`moreThanOneSelected` / `rep` / write-permission change (`index.tsx:620`). The
non-`moreThanOneSelected` shortcut block (`index.tsx:33-268`) is registered on
every run of that effect, so those shortcuts are live even for a single selected
block (and even with zero, but their handlers no-op via `getSortedSelection`
returning `[[],[]]`, `selectionState.ts:16`).

---

## Invariants

### I1. Single selection store shape
- **Rule:** A non-shift block click replaces the selection with exactly one block
  and sets `focusedEntity` to that block; `setSelectedBlock` always yields a
  length-1 array.
- **Trigger/Context:** plain mouse-down on a block; programmatic single-select.
- **Enforced at:** `components/Blocks/useBlockMouseHandlers.ts:54-61`;
  `src/useUIState.ts:66-69`.
- **Notes:** focus and selection are set together here, so length-1 selection
  normally coexists with a focused block / live text cursor.

### I2. Uniform parent for a selection
- **Rule:** All blocks in a selection are assumed to share one parent; only
  `selectedBlocks[0].parent` is consulted to fetch siblings and to compute
  sorting, siblings, and folded-children.
- **Trigger/Context:** every bulk op via `getSortedSelection`.
- **Enforced at:** `components/SelectionManager/selectionState.ts:14-20`;
  `index.tsx:42,57`.
- **Notes:** For list items `parent` = page entity, so an entire nested list on one
  page satisfies this (`src/replicache/getBlocks.ts:75,93`). Cross-page / cross-
  container selections are **not supported** and would silently use the wrong
  sibling set.

### I3. Document order is derived, not stored
- **Rule:** Selection order is recomputed by intersecting the position-sorted
  sibling list with the selected set; the store order is irrelevant to behavior.
- **Trigger/Context:** any bulk op.
- **Enforced at:** `selectionState.ts:21-24`; sibling ordering at
  `src/replicache/getBlocks.ts:37-40,117-119`.
- **Notes:** `sortedBlocks[0]` is "first in doc order",
  `sortedBlocks[length-1]` is "last".

### I4. Text keymap defers editing keys when >1 selected
- **Rule:** With >1 selected, the per-block ProseMirror Backspace/Tab/Up/Down
  commands do not mutate; they return so SelectionManager handles them.
- **Trigger/Context:** Backspace, Tab/Shift-Tab, Arrow Up/Down while focus is in a
  text block but multiple blocks are selected.
- **Enforced at:** `components/Blocks/TextBlock/keymap.ts:198,227,254,402`.
- **Notes:** Backspace/shifttab/Tab return `false` (pass-through); moveCursorUp/Down
  return `true` (swallow), relying on SelectionManager's own Arrow handlers.

### I5. Per-block keyboard handler defers when >1 selected
- **Rule:** The block-level (non-ProseMirror) keyboard handler's Tab and
  Arrow Up/Down no-op when >1 selected.
- **Trigger/Context:** non-text blocks (image/card/etc.) selected in a multi-select.
- **Enforced at:** `components/Blocks/useBlockKeyboardHandlers.ts:93,112,126`.
- **Notes:** This handler is attached per selected block (`:32-33,75`), so with N
  selected there are N listeners; the `> 1` / `<= 1` guards prevent N-fold action.

### I6. Bulk delete removes the whole selection set and closes their pages
- **Rule:** Backspace/Delete with >1 selected removes every selected block via a
  single batched `removeBlock`, and closes any open editor pages keyed by those
  entities.
- **Trigger/Context:** `keydown` Backspace/Delete while `moreThanOneSelected`.
- **Enforced at:** `components/SelectionManager/index.tsx:339-378` (delete at
  `:347-350`); batched mutation `src/replicache/mutations.ts:420-465`.
- **Notes:** `removeBlock` accepts an array (`mutations.ts:421-423`) and deletes
  each entity (`ctx.deleteEntity`, `:463`). Guarded by write permission
  (`:340`) and `moreThanOneSelected` (`:341`). Whole op wrapped in one undo group
  (`index.tsx:336-337`).

### I7. Bulk delete focus lands on the sibling *before* the first deleted block
- **Rule:** After bulk delete, selection+focus move to the visible sibling
  immediately preceding the first (doc-order) deleted block; if it is text/heading,
  the cursor is placed at its end.
- **Trigger/Context:** bulk delete completion.
- **Enforced at:** `components/SelectionManager/index.tsx:352-377`.
- **Notes:** Uses `siblings` (folded-filtered list); `findIndex(firstBlock) - 1`
  (`:353-355`). If `firstBlock` was the first sibling, `index-1` is `-1` →
  `nextBlock` is `undefined` → no new selection/focus is set (selection becomes
  empty). Contrast with `deleteBlock` util (the *single/non-multiselect* path),
  which falls back to the *next* block when there is no previous
  (`src/utils/deleteBlock.ts:65-109`).

### I8. Children of selected list blocks are NOT independently deleted
- **Rule:** Bulk delete passes exactly `selectedBlocks` to `removeBlock`; it does
  not expand to descendants. Children survive unless they were themselves selected
  or are orphaned by entity deletion.
- **Trigger/Context:** deleting a selected parent list item whose children are not
  selected.
- **Enforced at:** `components/SelectionManager/index.tsx:347-349` (maps
  `selectedBlocks`, no child expansion); `removeBlock` only deletes the named
  entities (`mutations.ts:422-464`).
- **Notes:** `removeBlock` deletes the entity but does **not** retract the parent's
  `card/block` edge to children or re-home them, so a deleted parent can leave
  dangling child references. See suspected inconsistencies. (Copy *does* expand to
  folded children via `sortedBlocksWithChildren`, but delete uses raw
  `selectedBlocks`.)

### I9. Bulk indent requires a non-selected list predecessor
- **Rule:** Shift-less Tab on a multi-selection indents each selected list block
  under the nearest preceding sibling that is itself a list and **not** part of the
  selection; blocks whose `listData.parent` is selected are skipped (the parent
  carries them).
- **Trigger/Context:** Tab with `sortedSelection.length > 1`.
- **Enforced at:** `components/SelectionManager/index.tsx:485-516` (skip-if-parent-
  selected `:498-501`; walk back past selected predecessors `:503-510`; require both
  list `:511`); `indent` at `src/utils/list-operations.ts:30-56`.
- **Notes:** `indent` reparents via `retractFact`+`addLastBlock` and unfolds the new
  parent (`list-operations.ts:46-53`). Non-list selected blocks are skipped
  (`:511`).

### I10. Bulk outdent: all-at-depth-1 → convert to text
- **Rule:** If every selected list block is at depth 1, outdent converts them to
  plain (non-list) text blocks rather than moving them.
- **Trigger/Context:** Shift-Tab on multi-selection where all are depth 1.
- **Enforced at:** `src/utils/list-operations.ts:159-170` (`allAtDepth1` check at
  `:159-161`; loop `:165-169`); per-block depth-1 path in `outdent`
  (`:104-115`, asserts `block/is-list=false` and re-homes children).
- **Notes:** Iterates siblings **backwards** (`:165`) so position bookkeeping for
  later siblings stays valid.

### I11. Bulk outdent: skip child when its parent is also selected (depth > 1)
- **Rule:** In the normal (not-all-depth-1) outdent, a selected block is skipped if
  its `listData.parent` is selected **and** that parent has depth > 1 — outdenting
  the parent already carries the child up one level, so outdenting the child too
  would over-promote it.
- **Trigger/Context:** Shift-Tab on a selection containing a parent and its child,
  both depth > 1.
- **Enforced at:** `src/utils/list-operations.ts:171-187` (depth-1 skip `:177`;
  parent-selected skip `:180-184`).
- **Notes:** When the parent is depth 1 (so the child is depth 2), the child is
  **not** skipped and is outdented directly — this is deliberate because the depth-1
  parent becomes text and cannot carry list children. Backwards iteration again
  (`:173`).

### I12. Outdent uses the block's own path, and excludes co-selected siblings from re-homing
- **Rule:** `outdent` computes the new parent / "after" anchor from
  `block.listData.path` (always correct) rather than a possibly-stale
  `previousBlock`, and passes the full selected-entity list as `excludeFromSiblings`
  so the `outdentBlock` mutation does not drag co-selected siblings under the
  outdented block.
- **Trigger/Context:** every per-block outdent inside `multiSelectOutdent`.
- **Enforced at:** `src/utils/list-operations.ts:117-140` (path lookups `:119-130`;
  `excludeFromSiblings` `:139`); consumed in `outdentBlock`
  (`src/replicache/mutations.ts:230-233`).
- **Notes:** `multiSelectOutdent` passes `selectedEntities = sortedSelection.map(value)`
  as the exclude set (`list-operations.ts:156,169,186`).

### I13. Indent/outdent auto-unfold the destination parent
- **Rule:** When (out)denting moves a block under a folded parent, that parent is
  unfolded so the moved block stays visible.
- **Trigger/Context:** indent/outdent where the new parent is in `foldedBlocks`.
- **Enforced at:** `indent` `src/utils/list-operations.ts:46-47`; `outdent`
  `:132-133`; `foldState` threaded from `useUIState.getState()` at the call sites
  (`SelectionManager/index.tsx:491-492,512-514`).

### I14. Plain Arrow (no shift) collapses multi-selection to an edge cursor
- **Rule:** With >1 selected and no shift/ctrl, ArrowUp/Left collapses to a cursor
  at the **start of the first** selected block; ArrowDown/Right collapses to the
  **end of the last** selected block.
- **Trigger/Context:** Arrow keys, `moreThanOneSelected`, no modifiers.
- **Enforced at:** `components/SelectionManager/index.tsx:383-399` (Up),
  `:455-468` (Left), `:518-534` (Down, no-shift), `:470-483` (Right).
- **Notes:** Each sets `setSelectedBlock(edgeBlock)` (length-1) then `focusBlock`
  with `{type:"start"|"end"}` using the block's queried `block/type`.

### I15. Shift+Arrow extends/shrinks selection by one visible sibling, tracking a focus end
- **Rule:** Shift+ArrowUp/Down grow or shrink the selection one sibling at a time;
  `focusedEntity` is the moving "active end". If the focused end is at the boundary
  of the current selection, the next/prev **visible** sibling is added and becomes
  focused; otherwise the current focused end is removed (shrink) and focus steps
  inward.
- **Trigger/Context:** Shift+ArrowUp (`index.tsx:400-453`), Shift+ArrowDown
  (`index.tsx:535-588`); also the *initiation* from inside a text block
  (`keymap.ts:61-104`).
- **Enforced at:**
  - Grow up: focused is first → add `siblings[index-1]`, set focus
    (`index.tsx:412-430`).
  - Shrink up: focused not first → set focus to `sortedBlocks[length-2]`, remove
    current focused (`index.tsx:431-452`); if selection drops to 2, re-focus the
    remaining block's editor view (`:444-448`).
  - Grow/shrink down symmetric (`index.tsx:547-587`).
- **Notes:** "next sibling" uses the folded-filtered `siblings` list, so extension
  walks **visible** rows and skips collapsed descendants. Anchor is implicit (the
  far, non-focused edge); only `focusedEntity` is tracked explicitly. Extension can
  cross nesting levels freely because `siblings` is the flat visible list
  regardless of depth. Initiation (keymap) only fires at the text block's
  top/bottom edge (`keymap.ts:62-65,84`) and seeds a 2-block selection
  (`keymap.ts:67-69,87-91`).

### I16. Cmd/Ctrl+A two-stage escalation
- **Rule:** First Cmd-A selects all text within the focused block (ProseMirror
  default). A second Cmd-A, when the block is already fully text-selected, clears
  the text selection, blurs, and selects **all sibling blocks** of the block's
  parent.
- **Trigger/Context:** Cmd-A / Ctrl-A while editing a text block.
- **Enforced at:** `components/Blocks/TextBlock/keymap.ts:47-48` (binding),
  `metaA` `:691-726` (full-select test `:703`; on second press blur + populate
  `selectedBlocks` from `getBlocksWithType(parent)` `:710-723`).
- **Notes:** The "select all blocks" set is every block under
  `propsRef.current.parent` (the page), mapped to `{value, parent}`
  (`keymap.ts:718-722`). No third stage. Escalation only happens from inside a text
  block; there is no document-level Cmd-A when focus is on the page (see open
  questions).

### I17. Block copy/cut serializes a subtree to HTML+Markdown on the clipboard
- **Rule:** Copy/Cut of a (multi)selection serializes the selected blocks (plus
  hidden children of folded selected list blocks) to HTML (and a Markdown plain-text
  fallback) and writes them to the system clipboard; Cut additionally bulk-deletes.
- **Trigger/Context:** Cmd/Ctrl+C or +X with a block selection
  (`index.tsx:590-613`).
- **Enforced at:** copy entry `components/SelectionManager/index.tsx:590-612`;
  `copySelection` `src/utils/copySelection.ts:7-21`; HTML build
  `src/utils/getBlocksAsHTML.tsx:12-38`; tree shaping `parseBlocksToList`
  (`src/utils/parseBlocksToList.ts:3-60`).
- **Notes:** Uses `sortedBlocksWithChildren` (the 3rd tuple element) so collapsed
  subtrees are included (`selectionState.ts:25-36`; consumed `index.tsx:593-594`).
  Lists are reconstructed as nested `<ul>/<ol><li>` with `data-checked`
  (`getBlocksAsHTML.tsx:40-57`). Cards are serialized as
  `<div data-type=card data-facts=… data-entityid=…>` with *all* recursively-
  referenced facts (`getBlocksAsHTML.tsx:189-199,59-79`). Some block types emit
  nothing on copy: datetime/rsvp/mailbox/poll/embed/signup/posts-list → `null`
  (`getBlocksAsHTML.tsx:88-93,216`).

### I18. Paste re-inserts blocks with fresh entity IDs and recomputed positions
- **Rule:** Pasted HTML is flattened into block-creating operations; each new block
  gets a fresh `v7()` entity ID and a `generateKeyBetween` fractional position after
  the active block, preserving list nesting (depth) and per-block attributes.
- **Trigger/Context:** ProseMirror paste handler in a text block.
- **Enforced at:** `components/Blocks/TextBlock/useHandlePaste.ts:78-118`
  (flatten+iterate); `createBlockFromHTML` `:167-610` (new id `:281-302`; position
  `:108-114,295-302`; list nesting via recursion + `block/is-list` `:199-217,
  504-548`).
- **Notes:**
  - **Card subtree paste remaps all entity IDs**: every old entity in
    `data-facts` is mapped to a new `v7()`, and reference/ordered-reference/
    spatial-reference values are rewritten to the new ids before `createEntity` +
    `assertFact` (`useHandlePaste.ts:437-485`). This is the only place block IDs are
    deliberately re-issued from a copied payload.
  - First pasted block may **reuse the active block's entity** instead of creating a
    new one when types match / it's a heading or blockquote, or on canvas
    (`useHandlePaste.ts:283-291`).
  - Paste parent for list context is `listData.parent` else `parent`
    (`useHandlePaste.ts:95-97`).
  - List depth is carried via the `depth` recursion parameter and nested
    `createBlockFromHTML` calls with `parent: entityID`
    (`useHandlePaste.ts:530-548`); the actual tree shape comes from re-parenting,
    so depth is *implied by parentage*, matching how `getBlocksWithType` derives
    `depth` from path length (`getBlocks.ts:64-79`).

### I19. Selection is cleared on blur, Escape, route change, and canvas/empty clicks
- **Rule:** Defined UI transitions reset `selectedBlocks` to `[]` (and usually set
  `focusedEntity`).
- **Trigger/Context / Enforced at:**
  - Route/path change → clears selection, focus, folds
    (`components/RouteUIStateManger.tsx:20-26`).
  - Escape in a text block → clears selection, focuses page
    (`components/Blocks/TextBlock/keymap.ts:49-58`).
  - Escape on a selected non-text block → clears selection, focuses page
    (`components/Blocks/useBlockKeyboardHandlers.ts:276-289`).
  - Click empty page bookend / `blurPage` (`components/Pages/index.tsx:110-115`).
  - Click empty canvas (`components/Canvas.tsx:90-98`).
  - `deleteBlock` util on canvas parent (`src/utils/deleteBlock.ts:51-55`).
- **Notes:** There is no single "clearSelection" mutator; each site sets the array
  literal directly (sometimes via `setState`, sometimes `setSelectedBlocks([])`).

### I20. Bulk formatting/heading/size shortcuts operate over the sorted selection
- **Rule:** Mark toggles (bold/italic/underline/highlight/strike) and heading/size/
  list shortcuts apply to all selected **text** blocks (marks filter to
  `type === "text"`); a mark is removed iff *every* targeted block already has it
  across its whole range, else added.
- **Trigger/Context:** Cmd-b/i/u, Cmd-Ctrl-h/x (marks, only when
  `moreThanOneSelected`); Cmd-Alt-{0,1,2,3,+,-,l} (heading/size/list, registered
  whenever the effect runs).
- **Enforced at:** mark shortcuts `components/SelectionManager/index.tsx:269-329`;
  `toggleMarkInBlocks` `:777-805` (all-have-mark reduce `:778-786`; per-block
  add/remove over `0..doc.content.size` `:787-804`); heading/size/list at
  `index.tsx:72-238`.
- **Notes:** Mark toggles act directly on each block's ProseMirror view
  (`useEditorStates`), marking `tr.setMeta("bulkOp", true)` (`:796`). Marks filter
  to `b.type === "text"` (`:278-279` etc.) — **blockquote/heading text are
  excluded** from bulk mark toggles even though they are text-bearing.

---

## Suspected inconsistencies / violations

1. **Bulk delete orphans children of selected list parents.** `removeBlock` deletes
   the entity but never re-homes or detaches its `card/block` children
   (`src/replicache/mutations.ts:420-464`), and bulk delete passes only the raw
   `selectedBlocks` with no child expansion (`SelectionManager/index.tsx:347-349`).
   The single-block backspace path *does* call `moveChildren` first
   (`keymap.ts:262-285`), but the multi-select path does not. Deleting a parent list
   item (children unselected) likely leaves dangling references / lost subtrees.

2. **Bulk delete at the top of the list leaves selection empty and focus stranded.**
   When the first selected block is the first sibling, `findIndex(...) - 1 === -1`
   so `nextBlock` is undefined and no focus/selection is restored
   (`SelectionManager/index.tsx:353-356`). The analogous single-delete util handles
   this by focusing the *next* block (`deleteBlock.ts:95-109`); the multiselect path
   does not, so focus is lost.

3. **Mark/heading/size shortcuts fire for length-1 selection too.** The heading/
   size/list shortcuts and `getSortedSelection`-based ops are registered on every
   run of the effect, not gated by `moreThanOneSelected`
   (`SelectionManager/index.tsx:33-268`). For a single selected block these run in
   parallel with the text keymap's own formatting (`formattingKeymap`,
   `keymap.ts:41`), so a single-selection Cmd-b path is ambiguous about which
   handler "wins" — though marks specifically are gated (`:269-329`), the
   underline/strike via keymap vs SelectionManager only diverge at >1. Worth
   confirming there's no double-application for length-1.

4. **"Text keymap inert when >1 selected" is not airtight.** The invariant covers
   Backspace/Tab/Arrows, but **Enter** and **Escape** in the keymap are *not*
   guarded by `selectedBlocks.length > 1`. `enter` (`keymap.ts:413-673`) and the
   keymap `Escape` (`keymap.ts:49-60`) will still run if a text block retains
   ProseMirror focus while multiple blocks are selected. SelectionManager only
   defines `Shift-Enter`(fold toggle, `index.tsx:258-267`) and has no plain-Enter
   bulk handler, so Enter behavior during multiselect depends on whether a view
   still has focus — likely inconsistent.

5. **Alpha movement keys (`j`/`k`, Cmd-`u`/`i`/`b`) bypass the `> 1` check in some
   handlers.** `useBlockKeyboardHandlers` wires `j`/`k` to Arrow handlers
   (`useBlockKeyboardHandlers.ts:106-121,46-48`) which *do* guard `<= 1`, but the
   guard is on focus movement only; the listener still runs per selected block.
   Low risk but N listeners all fire.

6. **`selectedBlocks` stores an undeclared `position` field from range select.**
   `useBlockMouseHandlers.ts:93-97` puts `{value, position, parent}` into the store,
   but `SelectedBlock` is `Pick<Block,"value"|"parent">` (`useUIState.ts:5`). Type
   unsoundness; harmless today because nothing reads `position` off selection, but
   it means selection entries are heterogeneous (mouse-range entries have `position`,
   keyboard/click entries do not).

7. **No contiguity normalization.** Nothing re-sorts or de-sparsifies
   `selectedBlocks`. Cmd-A populates from `getBlocksWithType` (which **includes
   folded/hidden descendants**, `keymap.ts:715-722`), whereas shift-arrow extension
   walks only **visible** siblings (`selectionState.ts:39-45`). So after Cmd-A,
   a subsequent shift-arrow shrink (which steps through visible rows) and the
   selected set (which contains hidden rows) can disagree. Mixed/sparse selections
   are possible and not reconciled.

8. **Bulk mark toggles silently skip blockquote/heading.** `toggleMarkInBlocks` is
   only called with `b.type === "text"` (`index.tsx:278-279,286-287,297-298,…`), so
   selecting a mix of headings/quotes + text and pressing Cmd-b only bolds the plain
   text blocks. May be intended, but it's an asymmetry vs single-block formatting
   (which works inside headings/quotes).

9. **`moveBlockUp`/`moveBlockDown` (Cmd+Shift+Arrow) only act on a single block.**
   They early-return when `sortedBlocks.length > 1`
   (`src/utils/moveBlock.ts:8,51`), yet they are registered in the SelectionManager
   shortcut set that's also active during multiselect (`index.tsx:239-256`). So
   Cmd+Shift+ArrowUp/Down is a **no-op during multi-select** — possibly surprising
   (the user might expect the whole selection to move).

10. **Copy guard for contentEditable vs selection size.** Copy bails if the active
    element is contentEditable **and** selection ≤ 1 (`index.tsx:605-609`), so block
    copy only overrides the browser when >1 blocks are selected or focus is outside
    an editor. A single selected non-text block with focus elsewhere copies fine, but
    a single selected *text* block (cursor inside) deliberately falls through to the
    browser's text copy — intended, but means "copy this one block as a block"
    isn't reachable via keyboard for a focused single text block.

---

## Open questions

- **Plain Enter during multiselect:** there is no SelectionManager handler for
  un-modified Enter while >1 selected. Is the intended behavior "replace selection
  with a new block" (like some editors) or "no-op"? Currently depends on residual
  ProseMirror focus (`keymap.ts:413` runs if a view is focused).

- **Document-level Cmd-A (focus on page, nothing selected):** Cmd-A escalation only
  exists inside the text keymap (`keymap.ts:691-726`). Is there an intended path to
  "select all blocks" when the page (not a block) is focused? None found.

- **Sparse-selection semantics:** if a non-contiguous selection arises (Cmd-A
  including folded rows, or future shift+click gaps), is bulk indent/outdent/delete
  meant to operate on the literal set or the contiguous hull? The code operates on
  the literal set, but several helpers assume contiguity (e.g. `moveBlock`
  neighbor logic).

- **`removeBlock` and list children:** is the lack of child re-homing in bulk delete
  a known gap or relied-upon elsewhere (e.g. a CVR/server reconciliation that prunes
  orphans)? `removeBlock` only `deleteEntity`s the named blocks
  (`mutations.ts:463`); confirm whether orphaned `card/block` edges are GC'd.

- **Heading/size shortcuts on a length-1 (or length-0) selection:** these run via
  the always-registered shortcut block. Is operating on a single selected block
  intended, and does it ever collide with the same shortcut handled inside the
  focused editor?

- **`focusedEntity` vs `selectedBlocks` during shift-extension of non-text blocks:**
  the extension code re-focuses an editor view only when the selection shrinks to 2
  (`index.tsx:444-448,582-586`). For non-text blocks that have no editor view, what
  is the intended focus target? Currently `focusedEntity` is set but no DOM focus
  occurs.
