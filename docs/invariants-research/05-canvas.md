# Canvas-mode Invariants

Scope: text-editing invariants specific to the freeform xy **canvas** page (`page/type === "canvas"`),
and how they diverge from the linear "doc" page. Read-only research; nothing here is a fix.

Key structural facts:
- A page's type is the `page/type` fact (`page-type-union`, cardinality one), default `"doc"`
  (`src/replicache/attributes.ts:15-18`; defaulted at `components/Pages/Page.tsx:51,191`).
- Linear doc blocks are children via `card/block` (`ordered-reference`, fractional `position`)
  (`src/replicache/attributes.ts` `card/block`; `addBlock` `src/replicache/mutations.ts:71-98`).
- Canvas blocks are children via `canvas/block` (`spatial-reference`, holds `{x,y}` position,
  cardinality many) (`src/replicache/attributes.ts:33-36`; `addCanvasBlock`
  `src/replicache/mutations.ts:42-69`). The reference fact lives on the **parent page** entity and
  carries the position; the block entity itself only gets `block/type`.
- Per-block canvas geometry lives in separate single-cardinality facts on the block entity:
  `canvas/block/width` (default 360) and `canvas/block/rotation` (default 0)
  (`src/replicache/attributes.ts:37-44`; read at `components/Canvas.tsx:283-286`).
- Page dispatch: `PageContent` renders `<Canvas>` when `pageType !== "doc"`
  (`components/Pages/Page.tsx:190-194`). Each canvas block is rendered by `CanvasBlock`, which sets
  `pageType: "canvas"` in `blockProps` and **hardcodes `nextBlock: null` and `previousBlock: null`**
  (`components/Canvas.tsx:394-408`).

---

## Doc-vs-Canvas divergence table

| Behavior | Doc rule | Canvas rule | file:line |
|---|---|---|---|
| Block storage / ordering | `card/block` ordered-reference, fractional `position` string | `canvas/block` spatial-reference with `{x,y}`; no order index; rendered sorted by `y` then `x` | `mutations.ts:71-98` vs `42-69`; sort at `Canvas.tsx:143-149`, `CanvasPage.tsx:125-131` |
| `nextBlock`/`previousBlock` props | Computed from sibling list (real neighbors) | Always `null` (every block is an island) | `Canvas.tsx:405-406` |
| Enter (keyboard handler, non-text block selected) | New block created between current & next via fractional `position` (`addBlock`) | New `addCanvasBlock` at `{x: same, y: y + box.height + 12}` below the source; offset measured from live DOM `getBoundingClientRect()` | `useBlockKeyboardHandlers.ts:235-274` vs `207-233` |
| Enter (TextBlock keymap, in a text block) | Splits block; trailing content moved to new fractional sibling; list/heading logic | `addCanvasBlock` at `{x: same, y: y + box.height}` (NOTE: no `+12` here, unlike the keyboard handler); trailing content moved into new block | `keymap.ts:445-490` vs `491-598` |
| Enter on empty list item | Outdent (shift-tab), do NOT create a block | Guard `pageType !== "canvas"` → does NOT outdent; falls through to canvas split/create | `keymap.ts:424-432` (guard at 427) |
| Backspace at start of first/only block | Removes prev block / merges / converts heading→text / outdents list; if no prev block and not list/heading → return (no delete) | If `!previousBlock` and not list/heading and `pageType === "canvas"` → `removeBlock` (deletes the whole canvas block) | `keymap.ts:287-325` (canvas at 319-323) |
| Backspace removing an empty *previous* block | Deletes previous empty block, merges | N/A — `previousBlock` is always null on canvas, so this path is unreachable | `keymap.ts:327-342` |
| Arrow Up/Down/Left/Right block-to-block nav | `focusBlock(nextBlock/previousBlock,...)` jumps between blocks | All neighbor refs null → arrows never leave the block; each block is an island | `keymap.ts:106-132,185-241`; `useBlockKeyboardHandlers.ts:109-133` |
| Shift-Arrow multi-select extend | Extends selection to prev/next block | Null neighbors → no cross-block selection extension via keyboard | `keymap.ts:61-104` |
| New text block on empty click | n/a (click on empty doc area not a create gesture) | Double-click / ctrl / meta-click on empty canvas creates a text block at cursor `{x,y}` (y offset −12) | `Canvas.tsx:90-124` |
| "Add a block" button | n/a | Adds text block at `{x: clientWidth+scrollLeft−468, y: 32+scrollTop}` (top-right area) | `Canvas.tsx:245-268` |
| Drag-and-drop images | Sequential fractional `addBlock` between position/nextPosition | Grid layout of `addCanvasBlock` from drop point; columns = `ceil(sqrt(n))`, spacing 0, width 360 | `useHandleDrop.ts:16-72` vs `useHandleCanvasDrop.ts:77-232` |
| Paste HTML → blocks | First node may reuse active block; subsequent nodes get new fractional `addBlock` | If `parentType === "canvas"` and there is an active block, paste reuses the active block entity; does NOT create new positioned blocks for extra nodes | `useHandlePaste.ts:283-303` |
| Slash `/` command new-block creation | `createBlockWithType` → `addBlock` (fractional) when no entityID | On canvas the source block always exists, so it hits the in-place `else` (convert type); the `addBlock` path is doc-shaped only — see Suspected Inconsistency #4 | `BlockCommands.tsx:51-83` |
| Delete-block focus fallback | Focus previous (else next) sibling block | Focus the **page** itself; clear selection (no neighbor to focus) | `deleteBlock.ts:46-111` (canvas at 51-55) |
| Block move up/down controls | `moveBlockUp`/`moveBlockDown` shown | Hidden: `NonTextBlockOptions` omits move buttons when focused page type is canvas | `Block.tsx:480-504` |
| Toolbar buttons (`hiddenOnCanvas`) | Shown | Hidden when focused page type is canvas | `Toolbar/index.tsx:181-182`; `ImageToolbar.tsx:37` |
| Footnote / comment interaction | Desktop side-column hover/expand | Canvas treated like mobile: opens popover/sheet directly | `mountProsemirror.ts:134-142,166-173` |
| Empty-block placeholder text | Only on the first block of the page | Shown for every canvas block when no text fact yet (`props.first || pageType === "canvas"`) | `TextBlock/index.tsx:155` |
| Selected text-block background | none | `bg-bg-page rounded-md` when selected on canvas | `TextBlock/index.tsx:261` |

---

## Invariants (numbered)

1. **Page-type tag is authoritative & defaults to doc**
   - **Rule:** A page is canvas iff its `page/type` fact equals `"canvas"`; absence defaults to `"doc"`.
     All text-editing branches key off `pageType`/`page/type`.
   - **Trigger/Context:** Page render, block prop construction, and every canvas branch.
   - **Enforced at:** `components/Pages/Page.tsx:51,191-194`; `src/replicache/attributes.ts:15-18`;
     `components/Canvas.tsx:396` (sets `pageType: "canvas"` for all its blocks).
   - **Notes:** The block never re-reads its own page type; it trusts the `pageType` prop threaded
     down from the renderer. Mismatch between the rendered container and the prop would silently
     mis-route behaviors.

2. **Canvas blocks are positioned, not ordered**
   - **Rule:** Each canvas block's location is the `{x,y}` on the parent's `canvas/block` reference
     fact. There is no fractional index and no canonical linear order; render order is purely a sort
     by `y` then `x` for display.
   - **Trigger/Context:** Block creation, drag-to-move, render.
   - **Enforced at:** `addCanvasBlock` `src/replicache/mutations.ts:54-63`; sort
     `Canvas.tsx:143-149`; published sort `CanvasPage.tsx:125-131`.
   - **Notes:** Because order is derived from position at render time only, two blocks at identical
     `{x,y}` are ordered by nothing deterministic beyond the stable sort; nothing prevents identical
     positions (see Invariant 9).

3. **Every canvas block is a navigation island (no neighbors)**
   - **Rule:** `nextBlock` and `previousBlock` are always `null` for canvas blocks. Therefore no
     arrow-key / Tab / Shift-arrow behavior can move focus or selection from one canvas block to
     another, and no "merge with previous/next" path is reachable.
   - **Trigger/Context:** Arrow keys, Shift-arrows, Backspace-merge, Tab indent/outdent target.
   - **Enforced at:** `components/Canvas.tsx:405-406`.
   - **Notes:** This single fact disables a large family of doc invariants on canvas: ArrowUp/Down
     (`keymap.ts:185-241`, `useBlockKeyboardHandlers.ts:109-133`), ArrowLeft/Right cross-block
     (`keymap.ts:109-132`), Shift-arrow selection (`keymap.ts:61-104`), and the empty-previous-block
     deletion (`keymap.ts:327-342`). `Tab`/`Shift-Tab` indent still runs but `outdent`/`indent` are
     handed `previousBlock = null` (`useBlockKeyboardHandlers.ts:91-104`) — see Suspected
     Inconsistency #3.

4. **Enter on canvas creates a new block offset *below* the source**
   - **Rule:** Pressing Enter on a canvas block creates a new block via `addCanvasBlock` at the same
     `x`, with `y` increased by the source block's rendered height (read live via
     `getBoundingClientRect()`), plus a margin. The new block is focused at its start.
   - **Trigger/Context:** Enter key while a canvas block is focused.
   - **Enforced at:** Non-text path `useBlockKeyboardHandlers.ts:207-233` (`y + box.height + 12`);
     text path `keymap.ts:445-490` (`y + box.height`, no `+12`).
   - **Notes:** The two Enter paths use **different** vertical offsets (margin `+12` vs `0`). The
     keymap text-path also re-reads the canvas position via `scanIndex(tx).vae(entity,"canvas/block")`
     and bails if the fact or DOM element is missing (`keymap.ts:449-453`,
     `useBlockKeyboardHandlers.ts:208-214`). See Suspected Inconsistency #1.

5. **Empty list item does NOT outdent on canvas**
   - **Rule:** In doc mode, Enter on an empty list item outdents instead of creating a block. On
     canvas this is explicitly disabled by the guard `pageType !== "canvas"`, so an empty list item on
     canvas falls through to the normal canvas split/create path.
   - **Trigger/Context:** Enter on an empty (`content.size <= 2`) list block.
   - **Enforced at:** `components/Blocks/TextBlock/keymap.ts:424-432` (guard on line 427).
   - **Notes:** Intent: on canvas there is no outer list to outdent into, so the outdent gesture is
     meaningless; Enter should just spawn a sibling card below.

6. **Backspace at the start of an empty first/only canvas block deletes the block**
   - **Rule:** In doc mode, Backspace at offset 0 of the first block with no previous block returns
     without deleting (unless it's a list → retract list, or heading → convert to text). On canvas,
     the same position instead calls `removeBlock` to delete the whole canvas block.
   - **Trigger/Context:** Backspace with `selection.anchor <= 1`, empty content, `!previousBlock`,
     not a list, not a heading, `pageType === "canvas"`.
   - **Enforced at:** `components/Blocks/TextBlock/keymap.ts:287-325` (canvas branch 319-323).
   - **Notes:** This is the canvas equivalent of "delete an empty block"; in doc mode an empty
     first block is kept (the page must retain a block), but a canvas may have zero blocks
     (the "Add a Block!" tooltip shows when `blocks.length === 0`, `Canvas.tsx:236-237`).
     The list/heading early-returns at 287-318 run *before* the canvas check, so an empty first
     canvas block that is a list only retracts `block/is-list` (does not delete) on the first
     Backspace.

7. **Lists are allowed on canvas but are single-level (no real hierarchy)**
   - **Rule:** A canvas block may carry `block/is-list` (and `block/list-style`). When rendered, its
     `listData` is synthesized as `{ path: [], parent: <page>, depth: 1 }` — a fixed depth-1 stub —
     regardless of any nesting. On canvas-Enter inside a list, the new block copies `block/is-list`
     and `block/list-style` from the source.
   - **Trigger/Context:** List rendering on canvas; Enter within a canvas list block.
   - **Enforced at:** `listData` stub `components/Canvas.tsx:412,440-444`; copy-on-Enter
     `keymap.ts:468-488`.
   - **Notes:** Because `depth` is hardcoded to 1 and `path` is empty, multi-level list semantics
     (child creation, `moveChildren`, depth-aware outdent) cannot apply on canvas. Indent/outdent via
     Tab is still *wired* (`useBlockKeyboardHandlers.ts:91-104`) but receives `previousBlock = null`,
     so `indent` is a no-op (guarded by `if (props.previousBlock)`) and `outdent` is called with a
     null previous block. Checklist toggle (`block/check-list`) is NOT copied on the canvas-Enter
     path (it is copied on the doc path at `keymap.ts:570-582`) — see Suspected Inconsistency #2.

8. **New blocks are created relative to a reference point, clamped to non-negative**
   - **Rule:** All canvas creation gestures clamp x/y to `>= 0` (no negative / off-top-left
     placement), but there is **no** clamp to a right/bottom bound and **no** overlap avoidance.
   - **Trigger/Context:** Empty-canvas click, drop, and (implicitly) Enter offset.
   - **Enforced at:** Empty-click `Canvas.tsx:111-114` (`Math.max(...,0)`, y additionally `−12`);
     drop `useHandleCanvasDrop.ts:95-96` (`Math.max(...,0)`); Enter just adds height to existing y
     (`keymap.ts:463-466`, `useBlockKeyboardHandlers.ts:223-226`) with no clamp at all.
   - **Notes:** Canvas height is reactive: the scroll container's `minHeight` is `max(y)+512`
     (`Canvas.tsx:85,137`), so blocks placed far down extend the canvas. Width is fixed at 1272px
     (`Canvas.tsx:140`); x is never clamped to that width, so blocks can be placed/dragged past the
     right edge.

9. **No overlap / no off-canvas invariant is enforced**
   - **Rule:** There is intentionally *no* invariant preventing two blocks from overlapping or being
     placed outside the visible canvas. Creation offsets are heuristic (height-below, grid, cursor).
   - **Trigger/Context:** All creation + drag paths.
   - **Enforced at:** (absence) — drag commits raw `position + delta` with no bounds check
     `Canvas.tsx:293-311`; Enter offset only shifts y by block height.
   - **Notes:** Enter twice quickly can place two new blocks at the same y if the source's measured
     height hasn't changed between presses, since each new block's y is computed from the *source*
     block, not the previously created one.

10. **Canvas block deletion cleans up the parent reference fact**
    - **Rule:** Deleting a canvas block via `removeBlock` → `deleteEntity(blockEntity)` removes both
      the block's own facts (eav) and all inbound references (vae), which includes the parent's
      `canvas/block` spatial-reference fact. No orphan reference is left on the page.
    - **Trigger/Context:** Backspace-delete on empty first canvas block; toolbar/selection delete.
    - **Enforced at:** `removeBlock` `src/replicache/mutations.ts:420-465` (calls `deleteEntity` 463);
      vae cleanup `src/replicache/clientMutationContext.ts:121-159` (references scanned 128-133,
      deleted 135).
    - **Notes:** `canvas/block/width` and `canvas/block/rotation` live on the block entity (eav) and
      are removed with it. Server context `deleteEntity` similarly drops the entity; the position fact
      is on the parent and is captured via the vae scan on the client. This is the one structural
      cleanup invariant that works identically to doc-block deletion.

11. **Focus after creation is explicit, not derived from order**
    - **Rule:** Every canvas creation gesture explicitly calls `focusBlock(newEntity, {type:"start"})`
      (often inside a `setTimeout`/`flushSync`) because there is no neighbor traversal to fall back on.
    - **Trigger/Context:** Empty-click create, Add-button create, Enter create.
    - **Enforced at:** `Canvas.tsx:119-122,262-267`; `useBlockKeyboardHandlers.ts:228-231`;
      `keymap.ts:641-668` (focus in the async `.then`).
    - **Notes:** `focusBlock` itself is page-type-agnostic; it scrolls the block container into view
      and sets the editor selection (`src/utils/focusBlock.ts:11-112`). On delete, focus falls back to
      the **page** (not a block) on canvas (`deleteBlock.ts:51-55`).

12. **Marquee / pointer text-selection across blocks is suppressed; canvas selection is per-block**
    - **Rule:** The cross-block mouse-drag selection in `useBlockMouseHandlers` builds a sibling range
      via `getBlocksWithType(parent)` (which returns the *doc* ordered list). On canvas, dragging
      between blocks computes ranges from this linear sibling list rather than spatial geometry, and
      `SelectionManager`'s drag handling is about contenteditable text ranges, not a spatial marquee.
      Selecting a single canvas block is via mousedown/longpress focusing that block.
    - **Trigger/Context:** Mouse drag across blocks; click/shift-click; long-press (mobile/touch).
    - **Enforced at:** range build `components/Blocks/useBlockMouseHandlers.ts:76-102`; single-select
      mousedown 37-73; canvas long-press focus `Canvas.tsx:360-373`;
      `SelectionManager` mouse logic `components/SelectionManager/index.tsx:643-705`.
    - **Notes:** There is **no true xy marquee** ("rubber-band") selection implemented for canvas;
      see Suspected Inconsistency #5. Multi-block keyboard ops in `SelectionManager`
      (move up/down, indent, heading shortcuts) use `getBlocksWithType` (doc-ordered) and would
      behave oddly if ever triggered on canvas (e.g. `moveBlockDown` reorders by `card/block`, which
      canvas blocks do not have).

---

## Suspected inconsistencies / violations

1. **Inconsistent vertical offset between the two canvas-Enter paths.**
   The keyboard-handler Enter (used when a non-text block is selected) offsets the new block by
   `box.height + 12` (`useBlockKeyboardHandlers.ts:225`), while the TextBlock keymap Enter (used while
   typing in a text block — the common case) offsets by `box.height` with no margin
   (`keymap.ts:465`). Same gesture, two different spacings; likely the keymap path should also add the
   `12px` margin (or both should share a constant). Result: hitting Enter in a text block stacks new
   blocks flush (touching), whereas the other path leaves a gap.

2. **Checklist state not copied on canvas-Enter.**
   The doc Enter path copies `block/check-list` to the new list item (`keymap.ts:570-582`), but the
   canvas Enter branch only copies `block/is-list` and `block/list-style` (`keymap.ts:468-488`) — it
   omits `block/check-list`. Pressing Enter in a canvas checklist item produces a non-checklist list
   item. Doc-mode invariant "Enter in a checklist continues the checklist" is violated on canvas.

3. **Tab indent/outdent is wired on canvas but operates on null neighbors.**
   `useBlockKeyboardHandlers.ts:91-104` calls `indent`/`outdent` with `props.previousBlock`, which is
   always `null` on canvas (`Canvas.tsx:406`). `indent` is guarded (`if (props.previousBlock)`) so it
   no-ops, but `outdent` is invoked unconditionally with a null previous block. Combined with the
   depth-1 `listData` stub (`Canvas.tsx:442`), Tab/Shift-Tab on a canvas list block does
   nothing useful and may mutate `block/is-list`/parent in unexpected ways. The intended invariant
   (canvas lists are flat, Tab is meaningless) is not explicitly enforced at the keymap level — it
   only happens to be neutralized by null neighbors.

4. **Slash-command block creation has no canvas-positioned path.**
   `createBlockWithType` (`BlockCommands.tsx:51-83`) only knows `addBlock` (fractional `card/block`)
   for the `!entityID` case. It "works" on canvas only because a focused canvas block always supplies
   an `entityID`, so creation goes through the in-place `else` (convert type) branch. Any slash command
   that intends to create a *new* block rather than convert the current one would emit a `card/block`
   fact on a canvas page (orphaned — the canvas renderer only reads `canvas/block`). The
   doc/canvas branch present in `useHandlePaste` (`useHandlePaste.ts:283-303`) and the Enter handlers
   is **absent** here. Latent footgun if a command path ever reaches `addBlock` on canvas.

5. **No spatial marquee selection on canvas; cross-block selection uses doc ordering.**
   Box/rubber-band selection over xy space is not implemented. `useBlockMouseHandlers` derives a
   contiguous range from `getBlocksWithType` (the linear `card/block` order), which is meaningless for
   spatially-arranged canvas blocks (`useBlockMouseHandlers.ts:86-98`). Likewise the whole
   `SelectionManager` multi-block keyboard toolset (move up/down via `moveBlockUp`/`moveBlockDown`,
   list indent, `getSortedSelection`) assumes `card/block` siblings and would misbehave on canvas.
   Canvas appears to intend single-block focus only, but the doc-mode multi-select machinery is still
   mounted and reachable, so its invariants ("selected blocks form a contiguous run in document
   order") don't hold for canvas.

6. **Empty-click create has a magic y-offset of −12 not mirrored elsewhere.**
   The empty-canvas click create subtracts 12 from the cursor y (`Canvas.tsx:113`,
   `y: Math.max(e.clientY - parentRect.top - 12, 0)`) to roughly center the new block on the cursor,
   but the drop handler uses the raw cursor y (`useHandleCanvasDrop.ts:96`) and the Add-button uses a
   fixed offset. These per-gesture fudge factors (`-12`, `-468`, `+32`, `+12`) are uncoordinated; not a
   correctness bug, but there is no single "where does a new canvas block go" rule.

---

## Open questions

1. **Is the `+12` margin difference in the two Enter paths intentional** (e.g. the keyboard-handler
   path expects a taller non-text block) or a copy-paste drift? (`useBlockKeyboardHandlers.ts:225` vs
   `keymap.ts:465`.)
2. **Should canvas lists be flat by design?** The depth-1/empty-path `listData` stub
   (`Canvas.tsx:442`) plus list-style copying on Enter (`keymap.ts:468-488`) suggests "yes, flat
   single-level lists" — but is multi-item list *continuation* (Enter makes the next item) the only
   intended list feature, with indent/checklist explicitly out of scope?
3. **What is the intended selection model on canvas?** Single-block only, or is a spatial marquee
   planned? If single-block only, should the doc multi-select keyboard shortcuts in
   `SelectionManager` be gated off when the focused page is canvas (parallel to how
   `ToolbarButton`/`NonTextBlockOptions` already gate on `focusedEntityType === "canvas"`)?
4. **Are overlapping / off-canvas (x > 1272) blocks acceptable** as a permanent non-invariant, or is
   bounds-clamping / collision-nudging intended? Drag commits raw deltas with no bounds
   (`Canvas.tsx:293-311`).
5. **Can a `card/block` fact ever be created on a canvas page** through any path (paste edge cases,
   slash commands, programmatic block insertion)? If so it would be silently invisible
   (renderer reads only `canvas/block`). Worth auditing every `addBlock` call reachable while
   `pageType === "canvas"`.
6. **On Enter, should the new block's y be computed from the *last-created* block rather than the
   *source* block** to avoid stacking duplicates at the same y on rapid Enter
   (Invariant 9 / Suspected #1)?
