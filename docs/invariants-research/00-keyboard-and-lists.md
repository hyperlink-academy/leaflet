# Keyboard Layers & List Operations — Invariants (lead notes)

Scope: the two keyboard-handling layers plus list indent/outdent and undo grouping.
Primary files read in full:
- `components/Blocks/useBlockKeyboardHandlers.ts` (block-selected-as-unit, window keydown listener)
- `components/Blocks/TextBlock/keymap.ts` (ProseMirror keymap; cursor inside a text block)
- `src/utils/list-operations.ts` (indent / outdent / outdentFull / multiSelectOutdent / order/unorder)
- `src/undoManager.ts` (undo grouping)
- `src/utils/prosemirror/formattingKeymap.ts` (mark shortcuts)

Convention below: **K#** invariant id; "doc" = linear page, "canvas" = xy page.

---

## A. The two-layer keyboard model

- **K1 — Text blocks are driven by the PM keymap; selected non-text blocks by the window listener.**
  The window keydown listener in `useBlockKeyboardHandlers` early-returns on `e.defaultPrevented`
  (`useBlockKeyboardHandlers.ts:36`), so anything the ProseMirror keymap already handled (it
  `preventDefault`s) is not re-handled at the block level.
- **K2 — For a text block, the window listener only ever acts on `Tab`.**
  `AllowedIfTextBlock = ["Tab"]` and the guard `if (!AllowedIfTextBlock.includes(e.key) && isTextBlock[props.type]) return;`
  (`useBlockKeyboardHandlers.ts:61-62,89`). Every other key for a text block is the keymap's job.
- **K3 — The window listener only fires for a *selected* block with write permission.**
  Gated on `isSelected` (block present in `useUIState.selectedBlocks`) and `entity_set.permissions.write`
  (`useBlockKeyboardHandlers.ts:27-38`).
- **K4 — Inside a non-text block's own input/label/textarea/contenteditable, keys fall through to the browser
  (except `Tab`).** If the focused element is one of those and its `value !== ""`, return (do browser default)
  (`useBlockKeyboardHandlers.ts:51-60`; mirrored in Backspace `:139-147` and Enter `:191-197`).

## B. Undo grouping

- **K5 — A single user keystroke that performs structural edits is one undo step.**
  Block-level commands are wrapped `undoManager.startGroup()` … `setTimeout(endGroup, 100)`
  (`useBlockKeyboardHandlers.ts:64,73`). Keymap `Backspace` and `Enter` are wrapped in `um.withUndoGroup(...)`
  (`keymap.ts:133-142`). `withUndoGroup` is re-entrant: it only opens/closes a group if one isn't already open
  (`undoManager.ts:33-39`).
- **K5-note — Group nesting is collapse-on-restart.** `startGroup` force-ends any currently-open group
  (`undoManager.ts:21-26`); overlapping async work begun in one keystroke can bleed into a neighbouring group.
  The 100ms `endGroup` tail (`useBlockKeyboardHandlers.ts:73`) is a heuristic, not a hard boundary.

## C. Enter — cursor inside a text block (`keymap.ts` `enter`, 413-673)

- **K6 — Enter on an *empty* list item outdents instead of creating a new item (doc only).**
  `listData && pageType !== "canvas" && doc.content.size <= 2` ⇒ call `shifttab` and stop (`keymap.ts:425-432`).
- **K7 — Enter splits the block at the cursor.** Content from the cursor to end is sliced off the current block
  (`tr.delete(anchor, size)`, `keymap.ts:433-436`) and becomes the new block's content (`:651-668`).
- **K8 — Enter at the end of a list item that has a *visible* deeper child creates a first child; otherwise a
  next sibling at the same depth.** `createChild = nextBlock.listData.depth > this.depth && cursor at end &&
  not folded` (`keymap.ts:491-499`); parent is `entityID` when child, else `listData.parent` (`:528-537`).
- **K9 — When splitting a non-folded list parent (and not creating a child), the parent's children migrate to the
  new sibling.** `moveChildren(old=current,new=new)` when `!createChild && (!folded || anchor===1)`
  (`keymap.ts:538-550`). So the subtree stays under the "continuation" item.
- **K10 — A new list item inherits list identity and styling.** Always `block/is-list=true` (`keymap.ts:551-555`);
  copies `block/list-style` (`:556-569`); copies `block/check-list` but the *checked value* only carries when
  splitting at the very start (`anchor===1`), otherwise the new item is unchecked (`:570-582`).
- **K11 — Enter on a non-list block creates a new text block after it, same parent.** (`keymap.ts:584-598`).
- **K12 — Enter at the very start of a heading moves the heading down.** `blockType==="heading"` only when
  `type==="heading" && anchor<=2`; the current block is set to `text` and the new block receives the
  `block/heading-level` (`keymap.ts:441-443,600-615`).
- **K13 — A new block inherits alignment and text size from its origin.** Copies `block/text-alignment` when not
  "left" (`keymap.ts:616-625`) and `block/text-size` (`:626-639`).
- **K14 — After Enter, selection + focus move to the new block at its start, carrying any split-off content.**
  (`keymap.ts:641-668`).
- **K15 — While the slash menu is open, Enter is inert at the keymap level.** `if (doc.textContent.startsWith("/"))
  return true` (`keymap.ts:423`) — the menu component consumes Enter.

## D. Enter — block selected as a unit (`useBlockKeyboardHandlers.ts` `Enter`, 187-274)

- **K16 — Ctrl/Meta-Enter toggles the todo/checklist state of a list block.** (`useBlockKeyboardHandlers.ts:199-206`;
  keymap mirror `CtrlEnter` `keymap.ts:675-689`).
- **K17 — Canvas Enter creates a new text block offset below by `box.height + 12` and focuses it at start.**
  (`useBlockKeyboardHandlers.ts:207-233`).
- **K18 — List-block Enter creates a same-depth sibling (or a child if the next block is deeper), marked
  `is-list`.** (`useBlockKeyboardHandlers.ts:236-257`).
- **K19 — Non-list-block Enter creates a new text block between current and next.** (`useBlockKeyboardHandlers.ts:259-270`),
  then focuses the new block after 10ms (`:271-273`).

## E. Backspace — cursor inside a text block (`keymap.ts` `backspace`, 243-394)

- **K20 — Backspace defers to the SelectionManager when >1 block is selected.** `return false` (`keymap.ts:254-256`).
- **K21 — Backspace only restructures when the cursor is at the absolute start with an empty selection.**
  `if (anchor > 1 || selection.content().size > 0) return false` → PM default delete (`keymap.ts:258-260`).
- **K22 — Backspace at the start of a checklist item first strips the checklist attribute.** (`keymap.ts:262-270`).
- **K23 — Backspace at the start of a list item re-parents its children to the nearest eligible parent before the
  item is merged/removed.** New parent = previous block (if a list) else `listData.parent`/`parent`; `after` =
  previous block's same-depth ancestor or the previous block (`keymap.ts:271-285`).
- **K24 — Backspace at the start of the first block (no previousBlock) cannot merge upward; it transforms in place:**
  list ⇒ remove `is-list` (`keymap.ts:287-294`); heading ⇒ convert to text (`:296-317`); canvas ⇒ remove the block
  (`:319-323`); otherwise no-op (`:324`).
- **K25 — Backspace at start, when the previous block is an *empty* non-list text block, deletes that empty
  previous block.** (`keymap.ts:327-342`). (Asymmetry: an empty *list* item above is not swallowed.)
- **K26 — Backspace at the start of an empty block removes the block and focuses the previous block at end (or the
  page).** (`keymap.ts:344-357`).
- **K27 — Backspace at start, when the previous block is *non-text*, focuses that rich block as a unit and does not
  merge.** (`keymap.ts:359-366`).
- **K28 — Backspace at start with text and a previous *text* block merges the two: remove current, append its
  content into the previous block, cursor at the seam.** (`keymap.ts:368-393`).

## F. Backspace — block selected as a unit (`useBlockKeyboardHandlers.ts` `Backspace`, 136-185)

- **K29 — Destructive rich blocks require a two-step confirm.** For `card|mailbox|rsvp|poll`, the first Backspace
  arms `areYouSure` (300ms debounce), the second deletes; a debounce guard prevents a too-fast double-trigger
  (`useBlockKeyboardHandlers.ts:149-178`).
- **K30 — Otherwise a selected block is removed, its page closed, and focus moves to the previous block at end.**
  (`useBlockKeyboardHandlers.ts:180-184`).

## G. Caret navigation across blocks (`keymap.ts` 105-132, 185-241; handlers 106-133)

- **K31 — ArrowLeft at the start focuses the previous block at its end; ArrowRight at the end focuses the next block
  at its start.** Collapsed selection only (`keymap.ts:109-132`).
- **K32 — Arrow keys step over an atomic footnote in a single press.** `skipFootnote` (`keymap.ts:109-124,155-173`).
- **K33 — At a horizontal boundary, the first Arrow press only clears stored marks (consumes the key); the next
  press navigates.** Prevents formatting bleed when leaving a block (`keymap.ts:113,123,175-183`).
- **K34 — ArrowUp/Down cross to the prev/next block only on the first/last visual line (within 12px of
  top/bottom), preserving the caret's x via `coordsAtPos(...).left`.** Ctrl-j / Ctrl-k force the jump
  (`keymap.ts:105-108,185-241`).
- **K35 — Vertical navigation is suppressed while the slash menu is open or while >1 block is selected.**
  (`keymap.ts:197-198,226-227`).
- **K36 — Block-level (selected) navigation uses `lastXPosition` to keep the column on up/down (and Ctrl/Meta-j/k).**
  (`useBlockKeyboardHandlers.ts:106-133`).

## H. Selection escalation from text

- **K37 — Shift-ArrowDown at the end (or Shift-ArrowUp at the start) starts a two-block block-selection with the
  neighbour, blurs the editor and clears the DOM selection.** (`keymap.ts:61-104`).
- **K38 — Cmd/Ctrl-A is two-stage: first selects all text in the block; if already fully selected, escalates to
  selecting all sibling blocks.** `metaA` returns false when not fully selected (letting PM `selectAll` run),
  and escalates to `selectedBlocks = all siblings` when `from===0 && to===content.size`
  (`keymap.ts:47-48,691-726`).
- **K39 — Escape from text blurs, clears `selectedBlocks`, and focuses the page.** (`keymap.ts:49-60`); the block
  handler's Escape additionally un-arms `areYouSure` and sets `focusedEntity` to the page
  (`useBlockKeyboardHandlers.ts:276-290`).

## I. Tab / indent / outdent (`useBlockKeyboardHandlers.ts:91-104`; `keymap.ts` `shifttab` 396-411; `list-operations.ts`)

- **K40 — Tab indents the current list item; Shift-Tab outdents.** Single-selection only (returns when >1 selected,
  which the SelectionManager handles) (`useBlockKeyboardHandlers.ts:91-104`).
- **K41 — Indent requires a preceding sibling list item at the same depth; the item becomes that sibling's last
  child, and the new parent is unfolded.** (`list-operations.ts:30-56`).
- **K42 — Outdent at depth 1 converts the item to plain text and promotes its children to the parent; at depth>1 it
  re-parents to the grandparent, placed right after the old parent, unfolding the new parent.**
  (`list-operations.ts:90-144`).
- **K43 — `outdentFull` makes any item a top-level text block and promotes its children.** (`list-operations.ts:58-88`).
- **K44 — A list item's entire subtree travels with it on indent/outdent.** Implicit in the `addLastBlock` /
  `outdentBlock` / `moveChildren` usage (`list-operations.ts:48-53,110-114,134-140`); outdent reads ancestry from
  the block's own `path`, which is robust to a stale `previousBlock` in multiselect (`list-operations.ts:117-130`).
- **K45 — multiSelectOutdent keeps the tree valid:** if every selected item is depth 1 it converts them all to text;
  otherwise it iterates siblings back-to-front, skips depth-1 items, and skips a child whose selected parent is at
  depth>1 (so a selected parent's subtree moves once, not twice) (`list-operations.ts:146-189`).

## J. Misc text-block keys

- **K46 — Shift-Enter inserts a `hard_break`; it never splits the block.** (`keymap.ts:143-150`).
- **K47 — Mark shortcuts:** Meta/Ctrl-b strong, -i em, -u underline, Ctrl-Meta-x strikethrough
  (`formattingKeymap.ts:14-23`); Ctrl-Meta-h highlight using `lastUsedHighlight` (`keymap.ts:42-46`).

---

## Suspected inconsistencies / violations (from this section alone)

1. **Canvas Enter y-offset differs between the two layers.** Block-selected Enter offsets by `box.height + 12`
   (`useBlockKeyboardHandlers.ts:226`) while the in-text keymap Enter offsets by `box.height` only
   (`keymap.ts:466`). Same action, two spacings.
2. **"New list item" inheritance differs between the two Enter paths.** The in-text keymap copies
   `list-style`, `check-list`, `text-alignment`, `text-size`, and runs `moveChildren` (`keymap.ts:551-639`);
   the block-selected Enter sets only `is-list` and copies none of those, and never `moveChildren`
   (`useBlockKeyboardHandlers.ts:236-257`). Creating a sibling while a block is *selected* yields a differently
   configured item than while *editing*.
3. **Empty-line-above swallowing is list-asymmetric.** K25 deletes an empty *non-list* previous block, but the
   guard `!previousBlock.listData` (`keymap.ts:336`) means an empty list item above is not removed — possibly
   surprising/inconsistent with the plain-text case.
4. **Shift-Tab outdent has no `previousBlock` guard while Tab indent does.** `Tab` indents only `if
   (props.previousBlock)` (`useBlockKeyboardHandlers.ts:100`), but the Shift branch calls `outdent`
   unconditionally (`:95-97`); outdent at depth 1 silently converts to text — a Shift-Tab on a top-level item
   turns it into a paragraph, which may be unexpected from a "Tab" affordance.
5. **`metaA` full-selection test relies on `from===0`.** `isFullySelected = from===0 && to===content.size`
   (`keymap.ts:703`). This depends on PM `selectAll`/`AllSelection` producing `from===0`; worth confirming there's
   no off-by-one vs. `TextSelection` (text starts at pos 1), or the block-select escalation silently won't fire.
6. **Two `if (!repRef.current) return false;` in a row** in `shifttab` (`keymap.ts:403-404`) — dead duplicate;
   harmless but a code smell suggesting this path was edited under pressure.

## Open questions for synthesis

- Is K6 (Enter-empty-list-item outdents) intended to also apply when the empty item has children? `content.size<=2`
  only checks the item's own text, not its subtree.
- K24's "first block can't merge upward" vs. the canvas branch deleting the block: is deletion-on-Backspace of a
  lone canvas block intended, or should it also un-list/convert like doc mode?
- Do K17/K18 (block-selected Enter) ever actually run for a *text* block? K2 says the window listener only allows
  `Tab` for text blocks, so block-selected Enter applies to *non-text* selected blocks — confirm what "Enter on a
  selected image/poll" is meant to do (it currently creates a sibling text/list block).
