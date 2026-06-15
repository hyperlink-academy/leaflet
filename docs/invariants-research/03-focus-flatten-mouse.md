# Focus / Flattening / Mouse Invariants

Research scope: block list rendering / tree-flattening, focus routing, x-position
memory, and mouse/click/pointer behavior in the Leaflet block editor. This documents
the *intended* invariants the code assumes/enforces and flags suspected violations.
Nothing was modified.

Key source files:
- `components/Blocks/index.tsx` — `Blocks` (doc list container), filtering of folded blocks, `nextPosition` computation, empty-area click handlers, `NewBlockButton`, `BlockListBottom`.
- `components/Blocks/Block.tsx` — per-block wiring (`Block`, `BaseBlock`, `BlockLayout`, `ListMarker`), memo equality, spacing from prev/next.
- `components/Blocks/useBlockMouseHandlers.ts` — `onMouseDown`/`onMouseEnter` selection.
- `src/replicache/getBlocks.ts` — **the actual tree→flat-list source of truth** (`getBlocksWithType`, `getBlocksWithTypeLocal`, `computeDisplayNumbers`).
- `src/hooks/queries/useBlocks.ts` — `useBlocks` (subscribes to flattened list), `useCanvasBlocksWithType`.
- `src/utils/focusBlock.ts` — focus routing helper + `Position` union.
- `components/Blocks/TextBlock/keymap.ts` — `moveCursorUp`/`moveCursorDown`, ArrowLeft/Right, Enter/Backspace cursor placement.
- `components/Blocks/useBlockKeyboardHandlers.ts` — non-text-block ArrowUp/Down/Enter/Backspace.
- `components/SelectionManager/index.tsx` + `selectionState.ts` — multi-select nav/delete, folded-children copy.
- `src/state/useEditorState.ts` — `editorStates` map + `lastXPosition`.
- `src/utils/focusPage.ts`, `src/utils/elementId.ts`, `components/Canvas.tsx`, `components/Pages/Page.tsx`.

---

## How the flat block order is built

### 1. The canonical flattening (getBlocks.ts)

`getBlocksWithType(tx, entityID)` (`src/replicache/getBlocks.ts:25-107`) is the source of
truth for the **doc** flat order. `getBlocksWithTypeLocal` (`:109-176`) is a synchronous
mirror used for the initial render before Replicache hydrates.

- Read root children via the `card/block` attribute (`getBlocks.ts:32`).
- **Sort by fractional position**, tie-broken by fact `id` (`getBlocks.ts:36-40`): `a.data.position === b.data.position ? (a.id > b.id ? 1 : -1) : a.data.position > b.data.position ? 1 : -1`. So order is: position asc, then id asc.
- For each root block, if it has `block/is-list = true` (`getBlocks.ts:43,46`), recurse into a DFS `getChildren(root, parent, depth, path)` (`getBlocks.ts:47-89`):
  - Children fetched again via `card/block` on that node and sorted by position (`getBlocks.ts:54-55`) — note: **id tie-break is NOT applied to children**, only `position > position`.
  - Emits `[ self, ...children.flat() ]` — i.e. **pre-order DFS** (parent first, then its subtree), producing a single flat array (`getBlocks.ts:70-87`).
  - `listData` is attached only inside the list recursion: `{ depth, parent, path, checklist, checked, listStyle, listStart }` (`getBlocks.ts:75-83`). `path` accumulates `{entity, depth}` for every ancestor including self (`getBlocks.ts:64`).
  - `parent` field on every list item is set to **`b.entity`** (the root container/page), *not* the immediate list parent (`getBlocks.ts:74`). The immediate parent is in `listData.parent`. (Same in local: `getBlocks.ts:151`.)
- Non-list root blocks emit a single entry with **no** `listData` (`getBlocks.ts:91-98`).
- After flattening, `computeDisplayNumbers(result)` walks the flat list to assign ordered-list numbers per `listData.parent`, resetting counters on any non-list block (`getBlocks.ts:6-23`).

**This function does NOT remove folded blocks.** Folding is purely a render-layer filter
(see below). So `getBlocksWithType` always returns the *full* flattened tree.

`useBlocks(entityID)` (`useBlocks.ts:7-23`) returns this list (repData when hydrated, else
`getBlocksWithTypeLocal` initialValue).

### 2. Fold filtering + render order (index.tsx)

`Blocks` (`components/Blocks/index.tsx:22`) consumes `useBlocks` then renders:

- **Fold filter** (`index.tsx:141-149`): keep a block iff `!f.listData || !f.listData.path.find(path => foldedBlocks.includes(path.entity) && f.value !== path.entity)`. I.e. drop a block if any *ancestor* (a path entity that is not itself) is folded. The folded parent itself stays visible; its descendants are hidden.
- After filtering, `.map((f, index, arr) => ...)` (`index.tsx:150`) builds `Block` props from the **post-filter** array:
  - `previousBlock = arr[index - 1] || null` (`index.tsx:164`)
  - `nextBlock = arr[index + 1] || null` (`index.tsx:166`)
  - `nextPosition`: only set to `nextBlock.position` **when depths are equal** (`index.tsx:152-156`): `let depth = f.listData?.depth||1; let nextDepth = nextBlock?.listData?.depth||1; nextPosition = depth===nextDepth ? nextBlock?.position||null : null`. So crossing a depth boundary yields `nextPosition = null` (used by Enter to position the new sibling at end-of-range).
- **`previousBlock`/`nextBlock` are the flattened, fold-filtered, visual neighbors** — they cross list-nesting boundaries (a depth-1 item's `nextBlock` can be a depth-3 item, and vice-versa) and they correctly skip the hidden descendants of folded parents because the filter runs *before* neighbor assignment.

### 3. `lastRootBlock` and `lastVisibleBlock` (index.tsx:85-95)

- `lastRootBlock = blocks.findLast(f => !f.listData || f.listData.depth === 1)` (`index.tsx:85-87`) — last top-level item (used as the `position` anchor for appended blocks). Uses the **unfiltered** `blocks`.
- `lastVisibleBlock = blocks.findLast(f => !f.listData || !f.listData.path.find(path => foldedBlocks.includes(path.entity) && f.value !== path.entity))` (`index.tsx:89-95`) — last block that is not hidden by a folded ancestor. Same predicate as the render filter.

### 4. Canvas order (Canvas.tsx / useBlocks.ts)

Canvas is a **flat** model — no tree, no `listData` from the query. `CanvasContent`
(`components/Canvas.tsx:81`) reads `canvas/block` facts and sorts by **y then x**
(`Canvas.tsx:144-149`): `a.position.y===b.position.y ? a.position.x-b.position.x : a.position.y-b.position.y`. `useCanvasBlocksWithType` (`useBlocks.ts:25-69`) sorts identically (`:63-68`).
Canvas blocks are rendered with `previousBlock: null, nextBlock: null` and empty
`position`/`nextPosition` (`Canvas.tsx:394-408`), so block-to-block keyboard navigation does
not work on canvas — navigation there is spatial only.

---

## Focus target types table

`focusBlock(block, position)` (`src/utils/focusBlock.ts:11-112`). `Position` union at
`focusBlock.ts:114-131`. Behavior depends on block type.

For **math/code** blocks (textarea via `elementId.block(id).input`): `focusBlock.ts:28-58`.
For **text/heading/blockquote** blocks (ProseMirror via `editorStates[id].view`):
`focusBlock.ts:60-111`. For all other (atom) block types, `focusBlock` only selects/focuses
the block-as-unit and returns (`focusBlock.ts:61-67`).

| `type` | Where cursor lands (text/heading/blockquote) | math/code textarea | file:line |
|---|---|---|---|
| `start` | PM pos `1` (very start of content) | `offset 0` | `focusBlock.ts:81-84` (text); `:33-35` (code) |
| `end` | PM pos `doc.content.size - 1` (very end) | `offset = textContent.length` | `focusBlock.ts:77-80`; `:37-39` |
| `top` | `posAtCoords({ top: rect.top + 12, left: max(position.left, rect.left) })` — first visual line at x=left | `getPosAtCoordinates(max(left, rect.left), rect.top + 10)` | `focusBlock.ts:85-91`; `:40-48` |
| `bottom` | `posAtCoords({ top: rect.bottom - 12, left: max(position.left, rect.left) })` — last visual line at x=left | `getPosAtCoordinates(max(left, rect.left), rect.bottom - 10)` | `focusBlock.ts:92-98`; `:40-48` |
| `coord` | `posAtCoords({ top: position.top, left: position.left })` — exact viewport point | (not handled for code/math; only start/end/top/bottom) | `focusBlock.ts:99-105` |

Notes on landing:
- After computing `pos`, text path dispatches `TextSelection.create(tr.doc, pos?.pos || 1)` then `view.focus()` (`focusBlock.ts:108-111`). If `posAtCoords` returns null (e.g. coords outside the doc), it **falls back to pos 1 (start)** — a silent fallback that can surprise top/bottom/coord nav.
- `top`/`bottom`/`coord` clamp `left` to at least the editor's left edge (`Math.max(position.left, rect.left)`), preventing landing left of the block, but do **not** clamp `top`, so an out-of-range `coord.top` relies on the null→pos-1 fallback.
- `begin` is **not** a real target type. The `Position` union only has `start | end | coord | top | bottom` (`focusBlock.ts:114-131`). (The task prompt mentioned `"begin"`; it does not exist in code.)
- For math/code, focusing is done via `requestAnimationFrame(() => el.setSelectionRange(...))` and the textarea is **deliberately not `.focus()`-ed** (commented out at `focusBlock.ts:52-54`) to avoid a subpage scroll/flash bug — so the caret is set but the textarea may not actually receive focus.
- `focusBlock` always first `flushSync`-sets `selectedBlock` + `focusedBlock` to this block (`focusBlock.ts:16-23`) and scrolls its container into view (`:24-27`).

---

## Invariants

### Flattening / order

1. **Pre-order DFS flattening**
   - **Rule:** The visual block order is a pre-order depth-first traversal of the block tree: each list parent appears immediately before its (recursively flattened) subtree.
   - **Trigger/Context:** Any doc render; every consumer of `useBlocks`.
   - **Enforced at:** `src/replicache/getBlocks.ts:70-89` (`[self, ...childBlocks.flat()]`), mirror `:143-160`.
   - **Notes:** Children are flattened via `.flat()` so arbitrarily deep nesting collapses into one array.

2. **Sibling order = position asc, id tie-break (roots only)**
   - **Rule:** Sibling blocks order by fractional `position` ascending; equal positions tie-break by fact `id` ascending — but the id tie-break is applied only at the **root** level, not to list children.
   - **Trigger/Context:** Building the flat list / list recursion.
   - **Enforced at:** roots `getBlocks.ts:37-39` (`a.id > b.id ? 1 : -1`); children `getBlocks.ts:54-55` (position-only, no id tie-break). Same asymmetry in local: `:116-118` vs `:132-134`.
   - **Notes:** See suspected inconsistency #S5 — children with identical positions have nondeterministic order.

3. **`previousBlock`/`nextBlock` are flattened, fold-filtered visual neighbors**
   - **Rule:** Each rendered block's `previousBlock`/`nextBlock` are the immediately adjacent entries in the post-fold-filter flat array, crossing nesting depth freely.
   - **Trigger/Context:** Doc `Blocks` render.
   - **Enforced at:** `components/Blocks/index.tsx:164,166` over the filtered array `:141-150`.
   - **Notes:** Because the fold filter (`:141-149`) runs before neighbor assignment, neighbors automatically skip hidden descendants.

4. **prev/next skip folded children; folded parent stays visible**
   - **Rule:** Descendants of a folded list block are removed from the rendered list (and thus from prev/next), but the folded parent itself remains.
   - **Trigger/Context:** A list block whose entity is in `foldedBlocks` and has children.
   - **Enforced at:** filter `index.tsx:141-149`; `lastVisibleBlock` `:89-95`; fold toggling via `ListMarker` button `Block.tsx:622-627` and `useUIState.toggleFold` `src/useUIState.ts:34-42`.
   - **Notes:** `getBlocksWithType` itself never filters folds — every non-render consumer (Enter/Backspace sibling math, SelectionManager) sees the full tree and must re-apply the fold predicate when it wants visible-only neighbors (e.g. `SelectionManager/index.tsx:59-67`, `selectionState.ts:38-47`).

5. **`nextPosition` is null across a depth boundary**
   - **Rule:** A block's `nextPosition` is its visual next block's position only when both share the same `listData.depth`; otherwise `null`.
   - **Trigger/Context:** Computing `Block` props; consumed by Enter to place the new sibling between current and next.
   - **Enforced at:** `index.tsx:152-156`.
   - **Notes:** `generateKeyBetween(position, null)` appends at end of the sibling range when crossing out of a nested level.

6. **`listData.parent` = immediate list parent; `parent` field = root container**
   - **Rule:** For list items, `parent` (top-level field) is the root page/card entity, while the immediate parent list node is `listData.parent`. Non-list blocks have `parent` = root and no `listData`.
   - **Trigger/Context:** All list operations, Enter/Backspace, indent/outdent.
   - **Enforced at:** `getBlocks.ts:74` (`parent: b.entity`) + `:76-78` (`parent` inside listData); local `:151` + `:153`.
   - **Notes:** Enter for lists uses `props.listData.parent` (`keymap.ts:532-535`, `useBlockKeyboardHandlers.ts:246-251`); mouse selection uses `props.parent` (root) for sibling queries (`useBlockMouseHandlers.ts:87`).

7. **Ordered-list numbering computed over the full flat list, reset by non-list blocks**
   - **Rule:** `displayNumber` per ordered list is assigned sequentially per `listData.parent`; encountering any non-list block clears all counters.
   - **Trigger/Context:** After flattening.
   - **Enforced at:** `getBlocks.ts:6-23` (called `:105`, `:174`).
   - **Notes:** Computed on the *unfiltered* flattened list, so folded children still consume numbers (a folded sublist doesn't renumber visible siblings) — but `index.tsx` filtering happens later, so the numbering reflects tree, not view.

8. **Canvas order = y-then-x; no prev/next**
   - **Rule:** Canvas blocks render sorted by y ascending then x ascending; they have no `previousBlock`/`nextBlock`/`position` for keyboard linear nav.
   - **Trigger/Context:** Canvas page render.
   - **Enforced at:** `components/Canvas.tsx:144-149`; props `:394-408`; mirror sort `useBlocks.ts:63-68`.

### Trailing text block / empty document

9. **Empty document always shows an editable text placeholder**
   - **Rule:** If a page has zero blocks, a `NewBlockButton` renders a text-like "write something…" placeholder so there is always somewhere to start typing; clicking it creates the first text block and focuses it.
   - **Trigger/Context:** Page with no blocks (`lastBlock === null`).
   - **Enforced at:** `components/Blocks/index.tsx:185-233` (`NewBlockButton`), placeholder branch `:225-229`, `onMouseDown` create+focus `:204-221`. Also the first/only empty TextBlock shows its own placeholder (`TextBlock/index.tsx:153-181`, `:338-362`).
   - **Notes:** This is a *render* guarantee, not a data guarantee — the DB can hold a page with no block facts; the UI fabricates the entry point.

10. **`NewBlockButton` hides itself when the last root block is an empty text/heading**
    - **Rule:** The inline "add a block" affordance is suppressed when the last root block is a text/heading whose editor is empty (size ≤ 2) — you'd just type in that block instead.
    - **Trigger/Context:** Last root block is text/heading and empty.
    - **Enforced at:** `index.tsx:194-199`.

11. **Clicking the empty area directly below the blocks flex (between content and the 50vh zone) focuses-or-creates a trailing text block**
    - **Rule:** Clicking the `.blocks` container itself (`e.target === e.currentTarget`) creates a trailing text block if the last visible block is not text/heading, otherwise focuses the last visible block at `end`. No-op while a multi-block selection is active or without write permission.
    - **Trigger/Context:** Click landing on the flex container, not a child block.
    - **Enforced at:** `index.tsx:108-139`. Guards: `!permissions.write` (`:109`), `selectedBlocks.length > 1` (`:110`), target check (`:111`). Create branch `:117-134`; focus branch `:135-137`.
    - **Notes:** Create path inserts at `generateKeyBetween(lastRootBlock?.position || null, null)` and focuses by DOM id after a 10ms timeout (`:123-134`).

12. **Clicking the large 50vh bottom area (`BlockListBottom`) focuses-or-creates a trailing text block**
    - **Rule:** The `.blockListClickableBottomArea` (a `grow shrink-0 h-[50vh]` zone) makes the empty space below content clickable: focus the last visible block at `end` if it `isTextBlock`, else add a trailing text block and focus it.
    - **Trigger/Context:** Click anywhere in the bottom 50vh region. Requires write permission; **hidden when footnotes are present** (`areFootnotes`).
    - **Enforced at:** `index.tsx:235-293`; predicate uses `isTextBlock[lastVisibleBlock.type]` (`:261`); focus `:262-266`; create `:268-284`; hidden if footnotes `:250`.
    - **Notes:** Two redundant-but-divergent code paths (#11 container click vs #12 bottom area) — see suspected inconsistency #S1.

13. **Page-level click that is NOT on the blocks/bottom area focuses the page (not a block)**
    - **Rule:** Clicking the page scroll wrapper focuses the page entity (deselecting any block) unless already focused or the event was defaultPrevented.
    - **Trigger/Context:** Doc page wrapper click.
    - **Enforced at:** `components/Pages/Page.tsx:67-74` → `focusPage(entityID, rep)` (`src/utils/focusPage.ts:9-33`).
    - **Notes:** `focusPage` sets `focusedEntity` to the page and scrolls into view; with `"focusFirstBlock"` it focuses the first block at `start` after timeouts (`focusPage.ts:35-74`).

14. **Canvas: only double-click / cmd / ctrl click on empty canvas creates a block; single click just focuses the page**
    - **Rule:** On canvas empty space, a plain single click only sets the page focused/deselects; a new text block is created **only** on `e.detail === 2 || e.ctrlKey || e.metaKey`, at the cursor's canvas coordinates, then focused at `start`.
    - **Trigger/Context:** Click on the canvas content background (`e.currentTarget === e.target`).
    - **Enforced at:** `components/Canvas.tsx:90-124`; create gate `:105`; focus `:119-123`. Plus the floating `AddCanvasBlockButton` (`:224-274`).
    - **Notes:** This differs from doc, where a single click below content creates a trailing block. See suspected inconsistency #S2.

### Focus routing & cursor placement

15. **Atom (non-text) blocks: focus selects the block-as-unit only**
    - **Rule:** For any block type other than text/heading/blockquote (and beyond the code/math caret handling), `focusBlock` sets selection + focusedEntity and returns without placing a text cursor.
    - **Trigger/Context:** `focusBlock` on image/embed/card/etc.
    - **Enforced at:** `focusBlock.ts:61-67`.

16. **ArrowLeft at block start / ArrowRight at block end jumps to neighbor at end / start**
    - **Rule:** In a text block with empty selection, pressing ArrowLeft when caret ≤ pos 1 focuses `previousBlock` at `end`; ArrowRight when caret is at the last position focuses `nextBlock` at `start`. (Footnote-atom skipping and stored-mark clearing take precedence.)
    - **Trigger/Context:** Horizontal arrow at the text boundary.
    - **Enforced at:** `components/Blocks/TextBlock/keymap.ts:109-132`.

17. **ArrowUp/ArrowDown leave a text block only at the visual top/bottom line, preserving x**
    - **Rule:** ArrowDown moves to `nextBlock` with `{type:"top", left: coords.left}` only when the caret is on the bottom visual line (`viewClientRect.bottom - coords.bottom < 12`); ArrowUp moves to `previousBlock` with `{type:"bottom", left: coords.left}` only when on the top line (`coords.top - viewClientRect.top < 12`). The current caret's live `coords.left` is the x carried over.
    - **Trigger/Context:** Vertical arrow inside a text block. `Ctrl-j`/`Ctrl-k` force the jump (`jumpToNextBlock=true`) regardless of line.
    - **Enforced at:** `keymap.ts:185-241` (down `:185-213`, up `:214-241`). Bound at `:105-108`.
    - **Notes:** x carried is `view.coordsAtPos(selection.anchor).left` computed *at jump time* — NOT `lastXPosition`. Disabled when a `/` command is open or multi-select active (`:197-199`, `:226-228`).

18. **Non-text block ArrowUp/ArrowDown navigation uses `lastXPosition` for x**
    - **Rule:** When a *non-text* block is selected and is the keydown target, ArrowDown focuses `nextBlock` `{type:"top", left: lastXPosition}` and ArrowUp focuses `previousBlock` `{type:"bottom", left: lastXPosition}`.
    - **Trigger/Context:** Selected atom block, single selection.
    - **Enforced at:** `components/Blocks/useBlockKeyboardHandlers.ts:109-133` reading `useEditorStates.getState().lastXPosition` (`:115`,`:129`).
    - **Notes:** `lastXPosition` is permanently `0` (see #S3) so these always land at the left edge (clamped to `rect.left`).

19. **Backspace at start of empty/at-boundary text block merges into / focuses previous**
    - **Rule:** Backspace at caret pos 1 in a text block: if in a list, handle list-merge (checklist removal / moveChildren); if it's the first block, convert heading→text or strip list; if the previous block's editor is empty and non-list, remove the previous; if current is empty, remove current and focus previous at `end` (or focus page if none); if previous is a non-text block, focus it at `end`; otherwise merge current content into previous and place caret at the join.
    - **Trigger/Context:** Backspace at text-block start.
    - **Enforced at:** `keymap.ts:243-394`. Key focus calls: focus-prev-end empty `:348-356`; non-text prev `:359-366`; merge caret at `doc.content.size - firstChild.size - 1` `:374-386`.
    - **Notes:** Non-text-block Backspace path is separate (`useBlockKeyboardHandlers.ts:136-185`): removes block then `focusBlock(prevBlock, {type:"end"})` (`:183-184`).

20. **Enter splits a text block and focuses the new block at `start`**
    - **Rule:** Enter in a text block deletes from caret to end, creates a new block (sibling for lists / next for plain / new canvas block below), moves the tail content into it, and focuses it at `{type:"start"}`. Empty list item Enter outdents instead of creating.
    - **Trigger/Context:** Enter inside a text/heading block (non-`/` content).
    - **Enforced at:** `keymap.ts:413-673`; empty-list outdent `:425-432`; final focus `:659-666`; canvas branch `:445-490`.
    - **Notes:** Non-text-block Enter is separate (`useBlockKeyboardHandlers.ts:187-274`): creates a text block after (or below, on canvas) and focuses it; list child vs sibling decided by `props.nextBlock.listData.depth > props.listData.depth` (`:236-243`).

21. **Shift-ArrowUp/Down at a text boundary extends a multi-block selection**
    - **Rule:** Shift-ArrowDown when caret is at doc end selects `[current, nextBlock]` and focuses next as block; Shift-ArrowUp when caret ≤ 1 selects `[current, previousBlock]`. Blurs the editor and clears the DOM selection.
    - **Trigger/Context:** Shift+vertical arrow at the text edge.
    - **Enforced at:** `keymap.ts:61-104`.

22. **Multi-select arrow/delete navigation operates on full-tree siblings, re-filtering folds where needed**
    - **Rule:** With >1 block selected, ArrowUp/Down/Left/Right collapse selection to the boundary block and focus it (`start`/`end`); shift-arrows grow/shrink the selection along `getBlocksWithType` order; Backspace/Delete removes all selected and focuses the sibling before the first.
    - **Trigger/Context:** Multi-block selection active (`SelectionManager`).
    - **Enforced at:** `components/SelectionManager/index.tsx:336-614`; collapse-focus e.g. `:395-399`,`:529-533`; delete+focus `:339-378`. cmd+ArrowUp/Down jump to first/last visible block (`:36-71`, last filtered by fold `:59-68`).
    - **Notes:** `getSortedSelection` returns `[visibleSelected, visibleSiblings, selectedWithFoldedChildren]` (`selectionState.ts:11-48`); the 3rd is used so copy/cut includes hidden children of folded selected parents (`:25-36`, used `SelectionManager/index.tsx:593-611`).

### x-position memory

23. **`lastXPosition` is the remembered cursor column for vertical nav across blocks**
    - **Rule (intended):** When moving up/down across blocks, the horizontal column should be preserved via `useEditorStates.lastXPosition`.
    - **Trigger/Context:** Vertical block-to-block navigation.
    - **Enforced at:** declared `src/state/useEditorState.ts:5` (`lastXPosition: 0`); consumed `useBlockKeyboardHandlers.ts:115,129`.
    - **Notes:** **Not actually enforced** — see #S3. The text-block keymap bypasses it (passes live `coords.left`, `keymap.ts:207,235`), and nothing ever writes `lastXPosition`, so it is dead state stuck at 0.

### Click-to-focus / selection

24. **Plain mousedown on a block selects it as a unit and sets it focused**
    - **Rule:** A non-shift mousedown on a block container (not on a BUTTON/SELECT/OPTION/`data-draggable`, with write perms, not mid-scroll on mobile) sets `focusedBlock` + `setSelectedBlock` to that block and scrolls its page into view. For text blocks, the actual caret comes from the browser/PM (the editor's own pointer handling), not from this handler.
    - **Trigger/Context:** `onMouseDown` on `Block` container.
    - **Enforced at:** `components/Blocks/useBlockMouseHandlers.ts:37-75`; guards `:39-44`; select/focus `:54-72`.
    - **Notes:** `useSelectingMouse.start` is set to begin a potential drag-select (`:45`).

25. **Shift-mousedown adds the block to the multi-selection**
    - **Rule:** Shift+mousedown adds the target block to `selectedBlocks` (no-op if it's the sole already-selected block).
    - **Trigger/Context:** Shift+click a block.
    - **Enforced at:** `useBlockMouseHandlers.ts:46-53`.

26. **Mouse drag across blocks range-selects siblings**
    - **Rule:** While the primary button is held and a drag started on a block, entering another block selects the inclusive sibling range between start and current, by index within `getBlocksWithType(parent)`.
    - **Trigger/Context:** `onMouseEnter` during drag (`e.buttons === 1`).
    - **Enforced at:** `useBlockMouseHandlers.ts:76-102`; sibling range `:86-98`.
    - **Notes:** Range is computed over `props.parent` (root container) siblings (`:87`); the parallel text-drag-select suppression lives in `SelectionManager` (`:643-705`).

27. **Long-press (and canvas long-press) on a non-text block focuses it at `start`**
    - **Rule:** A long press on a block places focus on it (`{type:"start"}`); for text blocks the long-press handler returns early (lets normal editing happen).
    - **Trigger/Context:** Touch/long-press.
    - **Enforced at:** `Block.tsx:89-97`; canvas `Canvas.tsx:360-373`.

28. **Clicking a list marker toggles fold (only when it has children)**
    - **Rule:** The bullet/number marker button toggles `foldedBlocks` for that block iff it has children; ordered numbers are also click-to-edit.
    - **Trigger/Context:** Click on `ListMarker`.
    - **Enforced at:** `Block.tsx:622-627` (fold), `:648-663` (number edit).

29. **Mobile horizontal swipe on a list item indents/outdents**
    - **Rule:** A touch swipe ≥ 50px right indents (under `previousBlock`), left outdents.
    - **Trigger/Context:** Touch drag on a list block, mobile only.
    - **Enforced at:** `Block.tsx:44` (threshold), `:127-156`.

30. **Escape from a block returns focus to the page and clears selection**
    - **Rule:** Escape blurs the editor / collapses block selection and sets `focusedEntity` to the parent page.
    - **Trigger/Context:** Escape in a text block or selected atom block.
    - **Enforced at:** text `keymap.ts:49-60`; atom `useBlockKeyboardHandlers.ts:276-290`.

---

## Suspected inconsistencies / violations

- **S1 — Two divergent "click below content" paths in the same component.**
  `Blocks.onClick` (`index.tsx:108-139`) and `BlockListBottom.onClick` (`index.tsx:255-285`)
  both implement "focus-or-create trailing text block," but with different predicates and
  guards:
  - Container handler keys off `lastVisibleBlock.type !== "text" && !== "heading"` (so a
    trailing **blockquote** triggers *create*, `index.tsx:113-116`); bottom area keys off
    `isTextBlock[type]` (text/heading/**blockquote**), so a trailing blockquote triggers
    *focus* (`index.tsx:261`). Inconsistent treatment of blockquote between the two zones.
  - Container handler bails when `selectedBlocks.length > 1` (`:110`) and requires
    `lastVisibleBlock` to focus; the bottom handler has **no** multi-select guard and
    focuses `{...lastVisibleBlock, type:"text"}` (forcing type text even for a blockquote).
  - Bottom handler is suppressed entirely when footnotes exist (`:250`); the container
    handler is not. So below-content click behavior changes depending on footnotes.

- **S2 — Doc vs canvas "click empty space" behavior diverges.**
  Doc: a single click below content creates/focuses a trailing text block
  (#11/#12). Canvas: a single click only focuses the page; creation requires
  double-click or cmd/ctrl (`Canvas.tsx:105`). Consistent with intent (canvas is spatial)
  but is a real behavioral asymmetry for the "always land in an editable block" expectation.

- **S3 — `lastXPosition` is dead/never-written state; x-column memory is not implemented as designed.**
  `lastXPosition` is initialized to `0` (`useEditorState.ts:5`) and **read** in
  `useBlockKeyboardHandlers.ts:115,129`, but a full-repo search finds **no writer**
  (only those 3 sites total). Consequences:
  - Non-text-block vertical nav always passes `left: 0` → after `Math.max(0, rect.left)`
    in `focusBlock`, the caret lands at the **block's left edge**, ignoring the visual
    column the user was in. Column preservation through an atom block is broken.
  - The text-block keymap doesn't use it at all; it passes live `coords.left`
    (`keymap.ts:207,235`). So column *is* preserved text→text, but **not** through any
    intervening non-text block, and the "remembered across multiple vertical presses"
    semantics implied by a stored `lastXPosition` don't exist — each text hop recomputes
    from the current caret, so column can drift on short lines.

- **S4 — `focusBlock` top/bottom/coord silently fall back to start (pos 1) on a null hit-test.**
  `pos?.pos || 1` (`focusBlock.ts:109`) means if `posAtCoords` returns `null` (coords
  outside the editor box, e.g. an out-of-range `coord.top`, or a very short last line for
  `bottom`), the caret jumps to the **start** of the block instead of the nearest visual
  position. Also `pos` of literal `0` would collapse to `1`, though PM rarely returns 0 here.

- **S5 — Child sibling order lacks the id tie-break that roots have.**
  Root sort breaks position ties by fact id (`getBlocks.ts:37-39`), but the recursive
  child sort is position-only (`getBlocks.ts:54-55`; local `:132-134`). Two list children
  with identical fractional positions (possible after concurrent inserts / CRDT merges)
  get **nondeterministic / engine-dependent** order, and that order can differ from how
  identical-position roots would resolve. Divergence between the two flattening sorts.

- **S6 — `getBlocksWithType` (async) computes `checklist`/`checked` in `listData`; the local
  (sync) variant does not.** Compare `getBlocks.ts:75-83` (has `checklist`, `checked`) vs
  `getBlocks.ts:149-155` (omits both). During the brief initial-render window using
  `getBlocksWithTypeLocal`, checklist state on list items is missing from `listData`, so
  checkbox UI / checklist-aware behavior can be wrong until Replicache hydrates. A
  prev/next-adjacent divergence in how the *same* block is described by two code paths.

- **S7 — `previousBlock`/`nextBlock` and "siblings" are computed by at least three different
  rules.** (a) Render neighbors come from the **fold-filtered** flat array
  (`index.tsx:141-166`). (b) Mouse range-select and several keymap operations query
  `getBlocksWithType(parent)` **unfiltered** (`useBlockMouseHandlers.ts:87`,
  `keymap.ts:504-508`). (c) SelectionManager nav uses `getSortedSelection`'s
  fold-filtered sibling list (`selectionState.ts:38-47`). Enter's "next sibling" math
  (`keymap.ts:501-515`) and Backspace's parent-finding (`keymap.ts:271-284`) use the
  *unfiltered* tree and `props.previousBlock` (filtered) together. Because `props.previousBlock`
  can be a *folded parent* (its children are hidden) while the unfiltered query still has
  those children, list Enter/Backspace decisions made from `props.nextBlock`/`previousBlock`
  vs a fresh `getBlocksWithType` query can disagree about what the "next sibling"/"previous"
  actually is. This is the most likely real source of off-by-one / wrong-parent bugs when
  folding is involved. (Note Enter already special-cases folded parents at
  `keymap.ts:496-499,539-543`, evidence the divergence is known-tricky.)

- **S8 — List item `parent` field is the root, not the list parent — easy to misuse.**
  `parent: b.entity` on list items (`getBlocks.ts:74`) while the real parent is in
  `listData.parent`. Mouse selection and several handlers read `props.parent` for sibling
  queries (e.g. `useBlockMouseHandlers.ts:87` queries `getBlocksWithType(props.parent)` =
  the whole page), which is intentional for whole-page range selection but means
  `props.parent` is *not* a usable "container of my siblings" for nested list items. Any
  code assuming `props.parent` is the immediate list container would be wrong.

- **S9 — `BlockListBottom` focus forces `type: "text"`.** It calls
  `focusBlock({ ...props.lastVisibleBlock, type: "text" }, {type:"end"})` (`index.tsx:262-266`).
  If the last visible block is a `heading` or `blockquote`, this lies about the type to
  `focusBlock`. It happens to work because `focusBlock`'s text path treats text/heading/
  blockquote identically and only the early-return atom check matters — but it's a latent
  correctness hazard if `focusBlock` ever branches on `type === "text"` specifically.

---

## Open questions

- **OQ1 — Was `lastXPosition` meant to be written on every caret move (e.g. in
  `dispatchTransaction`)?** The store field + two readers exist but the writer was never
  implemented (or was removed). Intended design appears to be "remember column across
  vertical nav including through atom blocks," currently non-functional (#S3). Where (if
  anywhere) should it be set — `mountProsemirror.ts` `dispatchTransaction`
  (`components/Blocks/TextBlock/mountProsemirror.ts:272-360`) is the natural place.

- **OQ2 — Is the blockquote asymmetry in S1 intentional** (clicking below a trailing
  blockquote should *create* a new paragraph from the container zone but *enter* the
  blockquote from the bottom 50vh zone), or should both zones share one predicate?

- **OQ3 — Does the prompt's `"begin"` target correspond to `"start"`,** or to a removed
  target type? Only `start|end|coord|top|bottom` exist (`focusBlock.ts:114-131`). No
  `"begin"` usages anywhere in the repo.

- **OQ4 — Should `focusBlock` top/bottom/coord fall back to the *nearest* visual position
  rather than `start`** when `posAtCoords` returns null (#S4)? Current `|| 1` behavior is a
  silent jump-to-start.

- **OQ5 — Are identical child positions actually reachable** (would make #S5 observable)?
  Depends on whether `generateKeyBetween` / CRDT merges can ever yield duplicate positions
  among list children; if guaranteed-unique, S5 is theoretical.

- **OQ6 — Is the fold filter's "keep the folded parent, drop descendants" predicate
  (`index.tsx:141-149`) the single canonical definition,** given it's re-implemented
  verbatim in `lastVisibleBlock` (`:89-95`), `SelectionManager` cmd-Down (`:59-68`), and
  `getSortedSelection` (`selectionState.ts:38-47`)? Four copies of the same predicate — a
  refactor target and a divergence risk if one is updated without the others.
