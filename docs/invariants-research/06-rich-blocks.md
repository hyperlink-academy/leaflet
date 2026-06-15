# Rich/Non-text Block Invariants

Research notes on how Leaflet's block editor treats *heterogeneous* (non-text / rich /
structured) block types: what makes a block "text", how the cursor/keyboard behaves at the
boundary of a rich block, the two-step ("are you sure") delete, block-type conversion, and
the slash-command create/convert flow.

This documents *intended* invariants the code assumes/enforces (and flags suspected
violations). Nothing here proposes fixes.

Citations use `path:line`. Primary files:
- `src/utils/isTextBlock.ts`
- `components/Blocks/Block.tsx`
- `components/Blocks/BlockCommands.tsx`, `components/Blocks/BlockCommandBar.tsx`
- `components/Blocks/BaseTextareaBlock.tsx`
- `components/Blocks/useBlockKeyboardHandlers.ts`
- `components/Blocks/TextBlock/keymap.ts`
- `components/Blocks/TextBlock/index.tsx`
- `components/Blocks/index.tsx`
- `src/utils/focusBlock.ts`, `src/utils/deleteBlock.ts`
- `components/Blocks/DeleteBlock.tsx`

---

## isTextBlock table (type -> text? -> notes)

The canonical predicate is a partial map; **only three keys are present and `true`**; every
other type is `undefined` (i.e. falsy → treated as non-text). `src/utils/isTextBlock.ts:3-9`:

```ts
export const isTextBlock: { [k in ...block/type value]?: boolean } = {
  text: true,
  heading: true,
  blockquote: true,
};
```

Full set of block types comes from the `block-type-union` (`src/replicache/attributes.ts:443-465`)
and the dispatch map `BlockTypeComponents` (`components/Blocks/Block.tsx:344-368`).

| Block type           | `isTextBlock`? | Component (`Block.tsx:349-367`) | Editing surface / notes |
|----------------------|:--------------:|---------------------------------|-------------------------|
| `text`               | **true**       | `TextBlock`                     | ProseMirror editor. The "default" block. |
| `heading`            | **true**       | `TextBlock`                     | ProseMirror; heading-level fact; converts to/from `text`. |
| `blockquote`         | **true**       | `TextBlock`                     | ProseMirror; styled paragraph. |
| `code`               | false          | `CodeBlock`                     | `BaseTextareaBlock` `<textarea>` when focused; `elementId...input`. `focusBlock` has special caret handling (`focusBlock.ts:28-58`). |
| `math`               | false          | `MathBlock`                     | `BaseTextareaBlock` `<textarea>` when focused; KaTeX preview otherwise; special caret handling in `focusBlock`. |
| `image`              | false          | `ImageBlock`                    | Selection focuses a hidden file `<input>` (`ImageBlock.tsx:58-66`). |
| `link` (external)    | false          | `ExternalLinkBlock`             | Selection focuses URL `<input>` (`ExternalLinkBlock.tsx:31-42`). |
| `embed`              | false          | `EmbedBlock`                    | URL input / iframe. |
| `card` (page-link)   | false          | `PageLinkBlock`                 | Two-step delete; opens a subpage. `deleteBlock` closes child page. |
| `mailbox`            | false          | `MailboxBlock`                  | DEPRECATED placeholder; two-step delete; `deleteBlock` closes archive/draft pages. |
| `datetime`           | false          | `DateTimeBlock`                 | Popover date picker; `<input type=time>`. |
| `rsvp`               | false          | `RSVPBlock`                     | DEPRECATED placeholder; two-step delete. |
| `button`             | false          | `ButtonBlock`                   | `<a>`+button render; settings form uses `<input>`s (no `BaseTextareaBlock`). |
| `poll`               | false          | `PollBlock`                     | Vote/results/edit states; option `<input>`s; two-step delete. |
| `bluesky-post`       | false          | `BlueskyPostBlock`              | Embedded post. |
| `standard-site-post` | false          | `StandardSitePostBlock`         | Embedded post. |
| `horizontal-rule`    | false          | `HorizontalRule`                | Pure `<hr>`; no editing surface at all. |
| `posts-list`         | false          | `PostsListBlock`                | Publication-only block. |
| `signup`             | false          | `SubscribeBlock`               | Publication-only subscribe form. |

Note: `datetime` is the only declared-but-effectively-orphaned-in-`isTextBlock` type that
also reaches `BaseTextareaBlock`? No — `datetime` does not use `BaseTextareaBlock`. Only
`code` and `math` use `BaseTextareaBlock` (`CodeBlock.tsx:60`, `MathBlock.tsx:40`); their
caret handling is the only branch in `focusBlock.ts:28-58`.

A separate, **redundant local copy** of the predicate exists in the toolbar
(`components/Toolbar/index.tsx:63-66`): `isTextBlock = blockType==="heading" || "text" ||
"blockquote"`. It is NOT imported from `isTextBlock.ts`. (See suspected inconsistencies.)

---

## Behaviors gated by isTextBlock (list with file:line)

1. **Long-press to select a rich block as a unit (mobile).** `Block.tsx:89-97` — `useLongPress`
   handler early-returns `if (isTextBlock[props.type]) return;`. So long-press selection only
   applies to non-text blocks (text blocks are edited, not unit-selected, on long-press).

2. **Block-level keydown listener: input/label/textarea/contentEditable guard.**
   `useBlockKeyboardHandlers.ts:51-60` — when the event target is a form control / CE element
   AND `!isTextBlock[props.type]`, the handler bails (`return`) if the control has a non-empty
   value OR the key is `Tab`. I.e. for **non-text** blocks, typing inside an embedded input is
   left to the browser. (For text blocks this guard is skipped because the ProseMirror keymap
   owns those keys.)

3. **Block-level keydown listener: text-block keys are deferred to ProseMirror.**
   `useBlockKeyboardHandlers.ts:61-62` — `if (!AllowedIfTextBlock.includes(e.key) &&
   isTextBlock[props.type]) return;`. `AllowedIfTextBlock = ["Tab"]` (`:89`). So for text
   blocks ONLY `Tab` is handled here (indent/outdent); everything else (`Backspace`, `Enter`,
   arrows, `Escape`, `j/k`) is handled by `TextBlock/keymap.ts`. For non-text blocks, ALL of
   `{Tab, ArrowUp, ArrowDown, Backspace, Enter, Escape, j, k}` are handled here.

4. **ProseMirror Backspace at start: previousBlock is non-text → focus it, don't merge.**
   `TextBlock/keymap.ts:359-366` — when cursor at start of a text block and
   `!isTextBlock[previousBlock.type]`, it `focusBlock(previousBlock, {type:"end"})`, blurs the
   PM view, and returns `true` (no merge, no deletion). THE key boundary invariant.

5. **Block-list bottom click: focus last block if it's text, else append a text block.**
   `components/Blocks/index.tsx:259-285` — `BlockListBottom` onClick: if
   `isTextBlock[lastVisibleBlock.type]` focus it at end; otherwise create a new `text` block at
   the end and focus. (`index.tsx:113-116` does the same comparison inline via
   `type !== "text" && type !== "heading"` — see inconsistency #2.)

6. **(Local copy) Toolbar mode selection.** `components/Toolbar/index.tsx:63-82` — the toolbar
   uses a *local* `isTextBlock` to decide `"default"` toolbar vs image/alignment toolbars.
   Functionally equivalent today but not the shared predicate.

Indirectly related (NOT `isTextBlock` but the same "is this text" concept, using literal
type comparisons instead of the predicate):
- `focusBlock.ts:61-67` — "if its not a text block, that's all we need to do": returns early
  unless `type === "text" | "heading" | "blockquote"`. (Hardcoded list, mirrors the predicate.)
- `Blocks` empty-area click `index.tsx:113-116` — `lastVisibleBlock.type !== "text" &&
  !== "heading"` (omits `blockquote`!).
- `NewBlockButton` `index.tsx:188-199` — only suppresses itself for `text`/`heading` empties
  (omits `blockquote`).

---

## Invariants

### A. Definition of "text"

**1. Text-block predicate is exactly {text, heading, blockquote}.**
- **Rule:** A block is "text-like" iff its type is `text`, `heading`, or `blockquote`. All
  ~16 other types are non-text. Missing keys read as `undefined` → falsy.
- **Trigger/Context:** Any keyboard/focus/navigation code that must distinguish "ProseMirror
  paragraph I can merge/split/caret into" from "opaque widget".
- **Enforced at:** `src/utils/isTextBlock.ts:3-9`. Consumers: `Block.tsx:90`,
  `useBlockKeyboardHandlers.ts:57,61`, `keymap.ts:361`, `index.tsx:261`.
- **Notes:** A parallel hardcoded triple lives at `focusBlock.ts:62-66` and a parallel local
  predicate at `Toolbar/index.tsx:63-66`. Two consumers use a *doublet* (`text`/`heading`)
  that drops `blockquote` (`index.tsx:114-116`, `index.tsx:196`).

**2. Each block type maps to exactly one renderer; text types share one renderer.**
- **Rule:** `text`, `heading`, `blockquote` all render via `TextBlock`; each non-text type
  renders via its dedicated component. Unknown types render literal `"unknown block"`.
- **Enforced at:** `Block.tsx:323-325` (fallback), `Block.tsx:344-368` (`BlockTypeComponents`).

### B. Focus / selection model

**3. A non-text block is selected and focused "as a unit".**
- **Rule:** Focusing a non-text block sets `selectedBlocks=[block]` + `focusedEntity` and (for
  most types) imperatively focuses the type's inner control; it never creates a text caret.
  `focusBlock` returns early for non-text types after the code/math caret special-case.
- **Trigger/Context:** Arrow/Backspace boundary crossing into a rich block; mouse click;
  long-press (mobile); deletion landing.
- **Enforced at:** `focusBlock.ts:11-67`; per-type "focus my input when selected" effects:
  `ImageBlock.tsx:58-66`, `ExternalLinkBlock.tsx:31-42`; code/math caret: `focusBlock.ts:28-58`.
- **Notes:** Selection styling/options (move up/down, delete) are provided by `BlockLayout` →
  `NonTextBlockOptions`, shown only when `isSelected` (`Block.tsx:407-544`).

**4. Rich blocks render selection chrome via `BlockLayout`; text blocks do not.**
- **Rule:** `BlockLayout` is "used to wrap non-text blocks in consistent selected styling,
  spacing, and top-level options like delete" (`Block.tsx:419`). Each rich component opts in.
- **Enforced at:** `Block.tsx:407-450`. Consumers: Image/Code/Math/Button/Poll/Mailbox/RSVP/
  PageLink/DateTime/Embed/ExternalLink all wrap in `BlockLayout`. `HorizontalRule` does NOT —
  it draws its own selected outline (`HorizontalRule.tsx:8-14`).

**5. When a block is deselected, its `areYouSure` is force-reset.**
- **Rule:** `useEffect` clears `areYouSure` whenever `selected` goes false.
- **Enforced at:** `Block.tsx:118-122`.

### C. Keyboard at the rich-block boundary

**6. Backspace at start of a text block whose previous block is non-text focuses the rich
block (no merge, no delete).**
- **Rule:** From the start of a `text`/`heading`/`blockquote`, if the previous block is
  non-text, Backspace moves focus into the previous (rich) block at its end and consumes the
  event. The text block is preserved.
- **Trigger/Context:** Caret at PM position ≤1, empty selection, previous block exists and is
  non-text. Checked AFTER list/first-block/empty-prev/empty-self cases.
- **Enforced at:** `keymap.ts:359-366`.
- **Notes:** Ordering matters: an *empty* previous non-text block is never auto-removed by
  this path because the "previous editor empty" merge branch (`keymap.ts:332-342`) only fires
  when an editorState exists for the previous block — rich blocks have no PM editorState, so
  that branch is skipped and control reaches the non-text branch.

**7. ArrowLeft at start / ArrowRight at end of a text block crosses into the adjacent block.**
- **Rule:** ArrowLeft with empty selection at anchor ≤1 blurs PM and `focusBlock(previousBlock,
  {type:"end"})`. ArrowRight symmetric → `focusBlock(nextBlock,{type:"start"})`. Works
  regardless of neighbor type (rich neighbor becomes unit-selected via `focusBlock`).
- **Enforced at:** `keymap.ts:109-132`. (Footnote skip + stored-mark clear take precedence.)

**8. Vertical arrows from a text block land on the neighbor by visual line; rich neighbor is
unit-selected.**
- **Rule:** ArrowUp/Down at top/bottom visual line of a PM block focus the prev/next block.
  `Ctrl-k`/`Ctrl-j` force the jump unconditionally.
- **Enforced at:** `keymap.ts:105-108,185-241` (`moveCursorUp`/`moveCursorDown`). For a rich
  neighbor, `focusBlock` resolves to unit selection (and code/math caret) per Invariant 3.

**9. While a rich block is selected, arrows/`j`/`k` navigate between blocks (single-select
only).**
- **Rule:** With a non-text block selected, `ArrowUp`/`ArrowDown` (and `Ctrl/Meta-j`,
  `Ctrl/Meta-k`) `preventDefault` and move to prev/next, but ONLY when ≤1 block selected.
- **Enforced at:** `useBlockKeyboardHandlers.ts:106-133` (`ArrowDown`/`ArrowUp`/`j`/`k`).
- **Notes:** They read `useEditorStates...lastXPosition` to preserve horizontal position.

**10. While a rich block is selected, Enter creates a new text block after it and focuses it.**
- **Rule:** Pressing Enter on a selected non-text block inserts a new `text` block between it
  and the next block (or at canvas offset for canvas pages / new list item if list) and focuses
  it. Enter is a no-op when the target is an embedded input/label/textarea/CE element.
- **Enforced at:** `useBlockKeyboardHandlers.ts:187-274`. Input guard `:190-197`; canvas
  `:207-233`; list `:236-257`; plain `:260-270`.

**11. Tab/Shift-Tab indent/outdent works for any selected single block (text or rich).**
- **Rule:** Tab indents under previous block; Shift-Tab outdents. `Tab` is the lone key allowed
  through for text blocks (`AllowedIfTextBlock`); also handled for rich blocks here. No-op when
  multiple blocks selected.
- **Enforced at:** `useBlockKeyboardHandlers.ts:61,89-104`.

**12. Escape on a selected block deselects and returns focus to the page.**
- **Rule:** Escape clears `selectedBlocks` and sets `focusedEntity` to the parent page. If
  `areYouSure` was open it is cancelled first and focus returns to the (card) block.
- **Enforced at:** `useBlockKeyboardHandlers.ts:276-290`. Text-block PM equivalent:
  `keymap.ts:49-60` (blur view, focus page, clear selection).

### D. Two-step ("are you sure") delete

**13. Destructive rich blocks (card, mailbox, rsvp, poll) require a 2-step Backspace
confirmation.**
- **Rule:** First Backspace on a selected `card`/`mailbox`/`rsvp`/`poll` sets `areYouSure=true`
  (renders the `AreYouSure` confirmation in place of the block) and arms a 300ms debounce.
  A second Backspace AFTER the debounce window deletes via `deleteBlock`. A second Backspace
  WITHIN 300ms is swallowed (re-arms the debounce, no delete) — an accidental double-tap guard.
- **Trigger/Context:** Block selected as a unit, Backspace, target not a non-empty input.
- **Enforced at:** `useBlockKeyboardHandlers.ts:136-178`. Type gate `:150-155`; arm `:157-163`;
  confirm/double-tap-guard `:167-177`.
- **Notes:** All other non-text block types fall through to `:180-185` and are deleted on the
  FIRST Backspace (single-step) via `rep.mutate.removeBlock` + focus previous block.

**14. The on-screen delete button (NonTextBlockOptions) uses the same 2-step machine.**
- **Rule:** The trash button in the rich-block options bar: first click arms `areYouSure`
  (+300ms debounce), second click (after window) calls `deleteBlock`; within-window second
  click is swallowed. If `areYouSure`/`setAreYouSure` are not provided, it deletes immediately.
- **Enforced at:** `Block.tsx:511-541` (and debounce var `Block.tsx:452`). The two-step is only
  wired for the four destructive types because only those pass `areYouSure`/`setAreYouSure`
  into `BlockLayout` (Card `PageLinkBlock.tsx:41-42`, Mailbox `MailboxBlock.tsx:21-22`, Poll
  `PollBlock/index.tsx:77-78`). RSVP renders via `BlockLayout` but does NOT forward
  `areYouSure` (`RSVPBlock/index.tsx:9-13`) — see inconsistency #4.

**15. The `AreYouSure` confirmation panel replaces the block body and offers Delete / cancel.**
- **Rule:** When `areYouSure`, `BaseBlock` renders `<AreYouSure>` INSTEAD of the block
  component (`Block.tsx:329-339`). It auto-focuses the Delete button; "Delete" calls
  `deleteBlock(entities, rep)`; "Nevermind"/X calls `closeAreYouSure()` (→ `setAreYouSure(false)`).
- **Enforced at:** `DeleteBlock.tsx:6-74`; mount/unmount `Block.tsx:329-339`.
- **Notes:** Copy is type-aware: card→"Delete Page?", mailbox→"Delete Mailbox and Posts?",
  multi→"Delete Blocks?" (`DeleteBlock.tsx:36-48`).

**16. Escape cancels the confirmation.**
- **Rule:** Escape with `areYouSure` true sets it false and refocuses the block (typed as
  `card`); then clears selection / focuses page.
- **Enforced at:** `useBlockKeyboardHandlers.ts:276-290`. Also `Block.tsx:118-122`
  (deselect resets it).

**17. Deleting a page-bearing block closes its open subpage(s).**
- **Rule:** `deleteBlock` looks up `card`→`block/card` child and `mailbox`→`mailbox/archive`/
  `mailbox/draft`, and closes those pages after removal. It also cleans up footnotes.
- **Enforced at:** `deleteBlock.ts:17-36,113-127`.

**18. After deletion, focus lands on the previous block (else next), or the page on canvas.**
- **Rule:** `deleteBlock` selects+focuses the previous sibling at its end; if none, the next
  sibling at its start; on canvas pages it focuses the page itself and clears selection.
- **Enforced at:** `deleteBlock.ts:40-111`. Single-step Backspace path mirrors this at
  `useBlockKeyboardHandlers.ts:181-184`.

### E. Block-type conversion

**19. Backspace at start of a `heading` converts it to `text` (when it is the first block).**
- **Rule:** If the block has no previousBlock and is a `heading`, Backspace asserts
  `block/type=text` and re-focuses it at start (and returns `false`, letting the default occur).
- **Trigger/Context:** First block on page, type `heading`, caret at start.
- **Enforced at:** `keymap.ts:296-317`.
- **Notes:** This only fires in the `!previousBlock` branch — a heading that is NOT first does
  not convert on Backspace; it merges/behaves as a normal text block.

**20. Backspace at start of the first block, if a list, removes the list attribute (not the
block).**
- **Rule:** First block + `listData` → retract `block/is-list` (un-lists it) instead of
  deleting. Checklist items: first Backspace retracts `block/check-list`.
- **Enforced at:** `keymap.ts:262-294` (checklist `:264-270`, first-block list `:287-294`).

**21. Splitting a heading with Enter: only a caret at the very start keeps the new block a
heading; otherwise the tail becomes `text`.**
- **Rule:** In `enter`, `blockType = (type==="heading" && anchor<=2) ? "heading" : "text"`.
  When splitting a heading at start, the heading-level is *moved* to the new block and the
  current block is converted to `text`.
- **Enforced at:** `keymap.ts:441-443,599-615`.

**22. A text block whose entire content is a thematic-break marker converts to
`horizontal-rule` on blur.**
- **Rule:** On PM blur, if `textContent.trim() ∈ {"***","---","___"}`, assert
  `block/type=horizontal-rule`.
- **Enforced at:** `TextBlock/index.tsx:271-284`.

**23. Mention "embed" on an empty text block converts the block in place; otherwise inserts a
new embed block below.**
- **Rule:** If the block contains only the `@`, the current block is converted to `embed`
  (`block/type=embed`, `block/text` retracted). Else a new `embed` block is created below and
  the `@` removed from the current block.
- **Enforced at:** `TextBlock/index.tsx:606-652`.

**24. Slash menu: creating a block on a NON-empty text block creates a NEW block; on the
existing (empty) block it converts in place.**
- **Rule:** `createBlockWithType` branches on whether an `entityID` was passed:
  - If `args.entityID` is present (the slash menu always passes the current block's id), it
    asserts `block/type` on that SAME entity (convert in place).
  - If `args.entityID` is null/absent, it `addBlock`s a new entity between `position` and
    `nextPosition`.
- **Enforced at:** `BlockCommands.tsx:51-83`.
- **Notes:** Because the slash menu is only reachable when the block's `textContent`
  starts with `/` (Invariant 27), the current block is effectively empty-of-real-content, so
  "convert in place" is the practical behavior for every slash command. The leading "/" text is
  cleared separately (Invariant 26).

**25. Slash commands that need extra setup focus the new block's own input, not a text caret.**
- **Rule:** Image focuses the hidden file input after 100ms (`BlockCommands.tsx:213-216`); Poll
  enters `editing` state and focuses the first option input after 20ms
  (`BlockCommands.tsx:287-294`); New Page/Canvas open + focus the subpage's first block
  (`BlockCommands.tsx:386-404,424-425`). Undo restores focus to the original text block
  (`BlockCommands.tsx:217-225,243-248,295-308,387-403`).
- **Enforced at:** `BlockCommands.tsx:206-468`.

### F. Slash ("/") command menu

**26. Running a slash command clears the "/"-and-search text from the editor.**
- **Rule:** `clearCommandSearchText(entityID)` deletes the editor content range `(1,
  size-1)` — i.e. everything between the doc boundaries, removing the typed `/query`. Text
  commands call it on the source entity AND the resulting entity; `onOpenChange` (menu close)
  also clears.
- **Enforced at:** `BlockCommands.tsx:85-104` (and per-command calls), `BlockCommandBar.tsx:38-48`,
  `BlockCommandBar.tsx:84` (`onOpenChange`).
- **Notes:** Two near-duplicate implementations exist — module-level in `BlockCommands.tsx` and
  a closure in `BlockCommandBar.tsx`; both delete range `(1, size-1)`.

**27. The slash menu is shown only while the block's text starts with "/" AND the block is
selected.**
- **Rule:** `BlockCommandBar` renders iff `editorState.doc.textContent.startsWith("/") &&
  selected`; the search value is `textContent.slice(1)`.
- **Enforced at:** `TextBlock/index.tsx:368-373`.
- **Notes:** There is NO additional "caret at start" or "block empty" guard at the render
  site — any content that merely *starts* with `/` (e.g. `/foo bar`) opens the menu and treats
  the whole remainder as the search term.

**28. While the menu is open, vertical navigation and Enter inside the ProseMirror block are
suppressed so the combobox can own them.**
- **Rule:** `moveCursorDown`, `moveCursorUp`, and `enter` all early-return `true` (consume,
  do nothing) when `state.doc.textContent.startsWith("/")`. This lets the `Combobox`'s own key
  handling drive highlight/selection instead of moving the caret or splitting the block.
- **Enforced at:** `keymap.ts:197,226,423`.
- **Notes:** ArrowLeft/ArrowRight and Backspace are NOT guarded by the `/` check — Backspace
  deletes the `/` characters normally (and once `textContent` no longer starts with `/` the
  menu closes via Invariant 27). The combobox itself handles Up/Down/Enter selection.

**29. The "Add More!" (+) affordance on an empty focused text block inserts a literal "/" to
open the menu.**
- **Rule:** On an empty, focused, non-multiselected text block, `CommandOptions` renders quick
  buttons; the "+" button inserts `/` at position 1, sets the caret after it, and refocuses,
  thereby triggering Invariant 27.
- **Enforced at:** `TextBlock/index.tsx:363-366,444-532` (insert "/": `:495-521`).

**30. Publication-only / publication-hidden commands are filtered by context.**
- **Rule:** Command list filters: `hiddenInPublication` commands are hidden when a publication
  exists; `publicationOnly` commands appear only when editing a publication page; plus
  name/alternateName substring match.
- **Enforced at:** `BlockCommandBar.tsx:50-63`; flags declared `BlockCommands.tsx:107-118` and
  per command (e.g. `publicationOnly` `:452,463`; `hiddenInPublication` `:359`).

### G. Rich-block textareas (`BaseTextareaBlock`) — code & math only

**31. Inside a `BaseTextareaBlock`, plain Enter inserts a newline (browser default); only
Shift/Ctrl/Meta-Enter creates a new block.**
- **Rule:** The component only intercepts `Enter` when a modifier is held — it creates a `text`
  block below and focuses it. Plain Enter is left to the `<textarea>` (newline). There is no
  "Enter creates block" behavior like ProseMirror text blocks.
- **Enforced at:** `BaseTextareaBlock.tsx:29-55`.
- **Notes:** The block-level `Enter` handler in `useBlockKeyboardHandlers.ts:190-197`
  early-returns for `TEXTAREA` targets, so it never competes.

**32. You can navigate OUT of a code/math textarea with arrows only from the edge lines.**
- **Rule:** ArrowUp escapes to the previous block only if the caret is on the FIRST line
  (no newline before the caret); ArrowDown escapes to the next block only if the caret is on
  the LAST line. Mid-textarea arrows fall through to the browser (move within the textarea).
  Horizontal position is preserved via `getCoordinatesInTextarea`.
- **Enforced at:** `BaseTextareaBlock.tsx:57-93`.
- **Notes:** There is no ArrowLeft/ArrowRight escape and no Backspace-at-start escape inside
  `BaseTextareaBlock`. Leaving a code/math block leftward/by-backspace from its start is NOT
  implemented here; the block-level Backspace handler bails while the textarea is non-empty
  (`useBlockKeyboardHandlers.ts:140-147`), and on an EMPTY code/math textarea Backspace falls
  to the single-step delete path (`:180-185`) — i.e. an empty code block is deleted, not merged.

**33. Backspace inside a non-empty embedded input/label/textarea/CE is left to the browser.**
- **Rule:** Both the block-level `Backspace` (`:140-147`) and `Enter` (`:190-197`) handlers and
  the keydown listener guard (`:51-60`) bail when the target is a populated form control / CE.
  Several inputs additionally `preventDefault` a Backspace-on-empty to avoid clearing required
  fields (Button text/url `ButtonBlock.tsx:221-228,243-246`; Poll option removes the option
  instead `PollBlock/index.tsx:469-474`).

### H. Empty document / trailing block with rich blocks

**34. The document always remains text-appendable, even if every block is rich.**
- **Rule:** A click in the blank area below the last block (or in the page's empty area) will
  focus the last text block if there is one, otherwise CREATE and focus a new trailing `text`
  block. So a doc whose only/last block is rich can always gain text after it.
- **Enforced at:** `index.tsx:259-285` (`BlockListBottom`), `index.tsx:108-139` (page empty-area
  click), `index.tsx:185-233` (`NewBlockButton`, shown when last block isn't an empty text).
- **Notes:** There is no symmetric "always have text ABOVE the first rich block" affordance —
  to add text above a leading rich block you must select it and… there is no dedicated
  "insert above" shortcut for text; `NonTextBlockOptions` only offers move up/down + delete
  (`Block.tsx:480-541`). The first-block placeholder/`/`-prompt only appears for text/heading
  first blocks (`TextBlock/index.tsx:338-362`, `RenderedTextBlock` `:154-172`).

**35. A first/only rich block does not render the "write something / type / for commands"
placeholder.**
- **Rule:** The empty-doc placeholder and the inline `/`-prompt are gated on the block being a
  text/heading block (they live inside `TextBlock`/`RenderedTextBlock`). A page whose first
  block is rich shows no such hint.
- **Enforced at:** `TextBlock/index.tsx:338-362`; `RenderedTextBlock` `:154-172`.

---

## Suspected inconsistencies / violations

1. **Predicate duplicated three ways, two of which can drift.**
   - Canonical: `isTextBlock.ts:3-9` ({text, heading, blockquote}).
   - Hardcoded triple in `focusBlock.ts:62-66` (same set, but a literal — if a 4th text type is
     ever added it must be updated in lockstep).
   - Local re-derivation in `Toolbar/index.tsx:63-66` (same set, not imported).
   Risk: adding/removing a text type requires editing ≥3 places; only one is the named export.

2. **`text`/`heading` doublet drops `blockquote`.** Two consumers treat "is text" as only
   `text||heading`, excluding `blockquote`:
   - `index.tsx:114-116` (page empty-area click): if last block is a `blockquote`, the code
     takes the `else`… actually the condition is `type !== "text" && type !== "heading"`, so a
     trailing `blockquote` is treated as NON-text → it APPENDS A NEW TEXT BLOCK instead of
     focusing the blockquote. Compare `BlockListBottom` (`index.tsx:261`) which DOES use the
     real predicate (includes blockquote) → focuses it. The two blank-area click targets behave
     differently for a trailing blockquote.
   - `NewBlockButton` (`index.tsx:188-199`): suppresses itself only for empty `text`/`heading`,
     so an empty trailing `blockquote` still renders the "click to add a text block" affordance.
   Likely unintended divergence from the canonical predicate.

3. **Slash menu has no "start/empty" guard at render.** Invariant 27 fires on any content that
   merely starts with `/`. The keymap guards (`startsWith("/")`) assume the `/` is the command
   trigger, but `/usr/bin` typed at the start of a line would (a) open the command bar and (b)
   suppress Enter/Up/Down inside the block. The prompt's hypothesis ("only triggers at start /
   on empty") is only *partially* enforced: it triggers when text STARTS with `/`, regardless of
   caret position or whether other text follows. `TextBlock/index.tsx:368`, `keymap.ts:197,226,423`.

4. **RSVP is in the two-step Backspace gate but cannot show the in-place confirmation.**
   `useBlockKeyboardHandlers.ts:150-155` includes `"rsvp"`, so Backspace sets `areYouSure=true`.
   But `RSVPBlock` does NOT forward `areYouSure`/`setAreYouSure` to `BlockLayout`
   (`RSVPBlock/index.tsx:9-13`), so its options-bar trash button can't 2-step and, more
   importantly, the body still renders `<AreYouSure>` via `BaseBlock` (`Block.tsx:329-339`)
   because that path keys off the `areYouSure` STATE, not the forwarded prop — so the keyboard
   path DOES show the panel but the on-screen trash button path does not. Asymmetric. (RSVP is
   deprecated, so low impact, but it is an inconsistency between the two delete entry points.)

5. **`deleteBlock` previous/next-sibling indexing can crash on multi-select edge cases.**
   `deleteBlock.ts:62-76` computes `lastSelected = selectedBlocks[entities.length - 1]` and then
   `nextBlock = siblings[findIndex(lastSelected.value)+1]`. If `selectedBlocks` and `entities`
   disagree in length/order (e.g. called with an explicit `entities` array that isn't the
   current selection, as the AreYouSure button does: `DeleteBlock.tsx:55`), `lastSelected` may be
   `undefined` and `lastSelected.value` throws. The single-block keyboard/areYouSure paths
   always pass `[props.entityID]` while selection holds that one block, so it works there; the
   multi-select `AreYouSure` (entities.length>1) relies on selection being exactly those
   entities. Fragile coupling between the `entities` arg and `useUIState.selectedBlocks`.

6. **`Escape` cancel hardcodes type `"card"` when refocusing.**
   `useBlockKeyboardHandlers.ts:280-283` does `focusBlock({type:"card", value, parent})` when
   cancelling areYouSure — but the block could be `mailbox`/`rsvp`/`poll`. `focusBlock` only
   special-cases `code`/`math` and otherwise returns early for non-text, so passing `"card"`
   for a poll is harmless TODAY, but it's a latent correctness smell (focus logic keyed on a
   wrong type).

7. **Two-step delete double-tap window is a module-global, shared across all blocks.**
   `useBlockKeyboardHandlers.ts:135` (`let debounced`) and `Block.tsx:452` (`let debounced`) are
   FILE-level singletons. Two different blocks (or the keyboard path vs the button path) share
   no timer between files but DO share within a file across all block instances. Rapidly
   confirming-deleting two different destructive blocks could interact through the shared timer.
   Minor.

8. **`focusBlock` for code/math reads `el` without a null check.** `focusBlock.ts:29-31` casts
   `getElementById(...input)` to `HTMLTextAreaElement` and immediately uses `el.textContent`
   (`:38`) for `type:"end"`. If the code/math block's editing textarea isn't mounted yet (it
   only mounts when focused/selected — `CodeBlock.tsx:59`, `MathBlock.tsx:34`), `el` is null and
   `el.textContent` would throw. Timing-dependent; relies on selection state flipping before
   focus.

9. **Empty code/math block is deleted on Backspace, not "merged"/converted.** Per Invariant 32
   notes, there's no path to turn an emptied code block back into a text block via Backspace
   (unlike `heading`→`text`). It just gets removed (`useBlockKeyboardHandlers.ts:180-185`). Not
   necessarily a bug, but it's an asymmetry with heading conversion (Invariant 19) worth noting
   as an intended-vs-accidental question.

---

## Open questions

1. **Is the `text`/`heading` doublet (excluding `blockquote`) in `index.tsx:114-116` and
   `:196` intentional?** It diverges from both the canonical predicate and the sibling
   `BlockListBottom`. Was blockquote deliberately excluded from blank-area-click focusing, or
   overlooked when blockquote was added?

2. **Should the slash menu require the caret at start / the block to be otherwise empty?**
   Today any line starting with `/` opens it (Invariant 27, inconsistency #3). Intended that
   `/foo bar` is a valid command search and suppresses block Enter/arrows?

3. **What is the intended RSVP delete UX?** It's gated into the two-step Backspace but does not
   forward areYouSure to its options bar (inconsistency #4). Since it's deprecated, is the
   half-wired two-step intentional (keyboard-only) or vestigial?

4. **Is "no text-insert-above a leading rich block" intended?** There's robust "append text
   below" (Invariant 34) but no symmetric "insert text above the first block" affordance, and
   no first-block placeholder when the first block is rich (Invariant 35). How is a user
   expected to add a paragraph above, say, a leading image?

5. **Should `focusBlock`'s non-text early-return list and the canonical `isTextBlock` be unified?**
   `focusBlock.ts:61-66` hardcodes the triple rather than importing `isTextBlock`. Intentional
   (to avoid a circular import via `Block`?) or just historical?

6. **Are `code`/`math` the only blocks meant to use `BaseTextareaBlock`?** The component is
   generic (`block` prop) but only `CodeBlock`/`MathBlock` use it, and `focusBlock`'s caret
   special-case is similarly limited to those two. Is the textarea-editing model intended to
   stay code/math-only, or is `BaseTextareaBlock` a would-be shared base for other "label"-style
   rich blocks (e.g. button label) that currently use plain `<input>`s instead?

7. **Why two near-identical `clearCommandSearchText` implementations** (`BlockCommands.tsx:85`
   and `BlockCommandBar.tsx:38`) deleting range `(1, size-1)`? Intentional or merge artifact?
