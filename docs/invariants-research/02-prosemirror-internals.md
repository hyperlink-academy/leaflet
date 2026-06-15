# ProseMirror/Yjs Internal Invariants

Scope: the in-text ProseMirror/Yjs layer of a Leaflet **text block** — schema, input
rules, paste, plugins, marks, footnotes, links, mentions, CRDT sync, and schema
versioning. Each text block is its own ProseMirror `EditorView` whose doc is a single
paragraph backed by a Yjs `XmlFragment`. Cites are `file:line`.

Key files:
- `components/Blocks/TextBlock/schema.ts` — nodes & marks, `SCHEMA_VERSION`, `multiBlockSchema`
- `components/Blocks/TextBlock/inputRules.ts` — markdown-style input rules
- `components/Blocks/TextBlock/useHandlePaste.ts` — paste normalization
- `components/Blocks/TextBlock/plugins.ts` — selection-highlight plugin
- `components/Blocks/TextBlock/autolink-plugin.ts` — autolinking
- `components/Blocks/TextBlock/insertFootnote.ts` — footnote insertion
- `components/Blocks/TextBlock/stripCommentMarks.ts` — copy/paste comment stripping
- `components/Blocks/TextBlock/schemaVersion.tsx` — schema versioning / stale clients
- `components/Blocks/TextBlock/mountProsemirror.ts` — editor mount, dispatch, orphan-diffing, undo
- `components/Blocks/TextBlock/useCollabText.tsx` — Yjs doc, sync to replicache + realtime
- `components/Blocks/TextBlock/collabCursor.ts`, `remoteCursorPlugin.ts`, `RemoteCursors.tsx`, `commentDraftPlugin.ts`
- `components/Blocks/TextBlock/RenderYJSFragment.tsx` — read-only/stale renderer
- `src/state/useEditorState.ts` — the `editorStates` store
- `src/yjsRealtime.tsx` — realtime channel
- `src/undoManager.ts` — undo grouping
- `src/utils/prosemirror/*` — shared rich-text helpers
- `src/utils/createYjsText.ts` — plaintext → Yjs encoder

---

## Schema summary (nodes)

The editing schema (`schema`) top node `doc` has content `"block"` — **exactly one block
child** (`schema.ts:151`), and the only member of group `block` is `paragraph`, so a valid
text-block doc is **exactly one paragraph** (`schema.ts:152-157`). `paragraph` content is
`"inline*"` (`schema.ts:153`). `multiBlockSchema` is a sibling schema with `doc` content
`"block+"` used by comment composers (`schema.ts:312-315`); it is **not** the text-block
editing schema.

| Node | group | inline | atom | leaf? | selectable | draggable | attrs | file:line |
|------|-------|--------|------|-------|-----------|-----------|-------|-----------|
| `doc` | (top) | — | — | — | — | — | content `"block"` (single block) | schema.ts:151 |
| `paragraph` | block | — | — | no | — | — | content `"inline*"` | schema.ts:152-157 |
| `text` | inline | (text) | — | — | — | — | — | schema.ts:158-160 |
| `hard_break` | inline | true | no | yes (leaf, no content) | **false** | — | — | schema.ts:161-167 |
| `atMention` | inline | true | **true** | yes | **true** | true | `atURI` (req), `text`="", `href`?, `icon`? | schema.ts:168-240 |
| `footnote` | inline | true | **true** | yes | **false** | false | `footnoteEntityID` (req) | schema.ts:241-275 |
| `didMention` | inline | true | **true** | yes | **true** | true | `did` (req), `text`="" | schema.ts:276-307 |

Notes:
- `atMention` / `didMention` are selectable atoms (clickable, draggable). `footnote` is an
  atom but **not** selectable and **not** draggable (`schema.ts:259-260`) — it is navigated
  via custom keymap logic, not as a NodeSelection.
- `hard_break` is `selectable: false` (`schema.ts:164`); shift-Enter inserts one
  (`keymap.ts:143-149`).
- All three atom nodes carry an `inclusive`-irrelevant rendering and store their display
  text in attrs (`text`), so they are *not* represented as text in the Yjs CRDT — they are
  XmlElements (see `RenderYJSFragment.tsx:78-132`, `createYjsText` only emits text).

## Schema summary (marks)

| Mark | inclusive | excludes | attrs | file:line |
|------|-----------|----------|-------|-----------|
| `strong` | default (true) | — | (from prosemirror-schema-basic) | schema.ts:15 |
| `em` | default (true) | — | (from prosemirror-schema-basic) | schema.ts:16 |
| `code` | default (true) | — | none | schema.ts:17-27 |
| `underline` | default (true) | — | none | schema.ts:28-42 |
| `strikethrough` | default (true) | — | none | schema.ts:43-64 |
| `highlight` | default (true) | — | `color` default `"1"` | schema.ts:65-93 |
| `comment` | **false** | — | `commentID` (req) | schema.ts:94-119 |
| `link` | **false** | — | `href` (req) | schema.ts:120-148 |

Notes:
- Only `comment` and `link` are `inclusive: false` — typing at the boundary of these marks
  does **not** extend them. All others (`strong`, `em`, `code`, `underline`,
  `strikethrough`, `highlight`) inherit the default `inclusive: true`, so they bleed at the
  right boundary as you type.
- No mark declares `excludes`, so any combination of marks can coexist on a span (e.g. code
  + strong + link). The input rules and autolink plugin add *application-level* guards
  against code-overlap (see below) but the schema does not enforce mutual exclusion.
- `comment.commentID` holds a **space-separated list** of comment IDs — overlapping comment
  threads merge into one mark whose value is `ids.join(" ")`
  (`commentDraftActions.ts:156,195`; split at `mountProsemirror.ts:311-314`,
  `commentDraftActions.ts:207`, `getCommentQuote.ts:34`).

---

## Input rules table

All rules live in `inputRules.ts` in the `inputrules(...)` factory. "→ mark/node" =
ProseMirror transform; "→ Replicache" = delegates block-type change to a Replicache mutation
(`assertFact`) on the block entity. Every text-changing rule that *adds a mark* also
`removeStoredMark`s so the mark does not bleed into the next char.

| # | Trigger (regex) | Effect | Kind | file:line |
|---|-----------------|--------|------|-----------|
| 1 | `~~text~~` | wrap in `strikethrough` | mark | inputRules.ts:34-49 |
| 2 | `==text==` | wrap in `highlight` (color = `lastUsedHighlight` or "1") | mark | inputRules.ts:52-69 |
| 3 | `**text**` | wrap in `strong` | mark | inputRules.ts:72-87 |
| 4 | `` `text` `` | wrap in `code` | mark | inputRules.ts:90-106 |
| 5 | `*text*` (not preceded by `*`) | wrap in `em` | mark | inputRules.ts:109-125 |
| 6 | `` ```␠ `` at line start | convert block to **code** block, copy last-used language, focus code block | → Replicache (`block/type`=code, `block/code-language`) | inputRules.ts:128-148 |
| 7 | `[ ]␠` / `[x]␠` / `-[ ]␠` at line start | make block a **checklist** item (set `is-list`, `check-list`) | → Replicache | inputRules.ts:151-166 |
| 8 | `-␠`/`+␠`/`*␠` at line start | make **unordered list** (skips if already list) | → Replicache (`is-list`, `list-style`=unordered) | inputRules.ts:169-186 |
| 9 | `N.␠` / `N)␠` at line start | make **ordered list**, respect start number >1 via `list-number` | → Replicache | inputRules.ts:189-214 |
| 10 | `>␠` at line start | convert block to **blockquote** | → Replicache (`block/type`=blockquote) | inputRules.ts:217-226 |
| 11 | `#␠`..`####␠` (1–4) | convert block to **heading**, level = # count | → Replicache (`block/type`=heading, `block/heading-level`) | inputRules.ts:229-244 |
| 12 | `[^` | delete the `[^`, then `insertFootnote(...)` (async, via `setTimeout`) | node + Replicache (`createFootnote`) | inputRules.ts:247-261 |
| 13 | `@` at line start / after space | open mention autocomplete (lets `@` be typed) | side-effect only | inputRules.ts:264-270 |
| 14 | `@` immediately after a `hard_break` node | open mention autocomplete | side-effect only | inputRules.ts:271-282 |

Mark rules (1–5) and the footnote/mention rules (12–14) all bail out if the match anchor is
inside a `code` mark via `anchorInCodeMark` (`inputRules.ts:19-25`), so you can type literal
markdown inside inline code. The list/quote/heading/code-block rules (6–11) do **not** check
`anchorInCodeMark` (they only fire at line start, position 0).

---

## Invariants

### Schema / document shape

1. **Single-paragraph text block** — **Rule:** a text-block editing doc is exactly one
   `paragraph`; the top node allows only one `block` child and the only block-group node is
   `paragraph`. No block-level nesting (no nested lists/headings *inside* a block; list
   hierarchy lives in Replicache facts, not the PM doc). **Trigger/Context:** every text
   block's `EditorState`. **Enforced at:** `schema.ts:151-157`. **Notes:** "block type"
   (heading/blockquote/code/list) is a Replicache fact on the entity, *not* a PM node — the
   PM content is always a paragraph regardless of rendered block type.

2. **Fixed inline vocabulary** — **Rule:** a paragraph's inline content is only `text`,
   `hard_break`, `atMention`, `footnote`, `didMention`, plus the 8 marks. Anything else is
   schema-foreign and cannot exist in a bound doc. **Trigger/Context:** parsing/paste/sync.
   **Enforced at:** `schema.ts:158-308`. **Notes:** y-prosemirror **deletes** content it
   can't map to this schema (see Inv. 27).

3. **Atoms carry no editable text** — **Rule:** `atMention`/`footnote`/`didMention` are
   `atom: true` — single indivisible inline units; their visible label is the `text`/derived
   attr, not child content. **Trigger/Context:** editing/navigation. **Enforced at:**
   `schema.ts:177,247,283`. **Notes:** cursor cannot enter them; one Backspace deletes the
   whole node (default PM atom behavior).

4. **No mark mutual-exclusion at schema level** — **Rule:** no mark sets `excludes`, so any
   marks may co-apply; conflicts (e.g. autolink inside code) are prevented in application
   code, not the schema. **Enforced at:** `schema.ts:14-149` (absence of `excludes`).

### Marks

5. **`link` and `comment` are non-inclusive** — **Rule:** typing at either edge of a link or
   comment span does not extend the mark. **Enforced at:** `schema.ts:124` (link),
   `schema.ts:98` (comment). **Notes:** the other 6 marks are inclusive and *do* bleed
   rightward while typing.

6. **Formatting input rules clear the stored mark** — **Rule:** after an input rule wraps a
   span (bold/italic/code/strike/highlight), the just-applied mark is removed from the stored
   set so the character typed *after* the closing delimiter is unformatted. **Enforced at:**
   `inputRules.ts:45,65,83,102,121`. **Notes:** counteracts the default `inclusive: true`
   bleed for these rules only.

7. **Markdown shortcuts disabled inside inline code** — **Rule:** mark input rules and the
   footnote/mention triggers no-op if the match touches a `code` mark. **Enforced at:**
   `anchorInCodeMark` `inputRules.ts:19-25`, used at lines 35,53,73,91,110,248,266,274.

8. **Comment mark = space-separated thread IDs** — **Rule:** overlapping comments share a
   single `comment` mark whose `commentID` is the threads' IDs joined by spaces; readers split
   on space. **Enforced at:** write `commentDraftActions.ts:156,195`; read
   `mountProsemirror.ts:307-316`, `commentDraftActions.ts:207`, `getCommentQuote.ts:34`,
   `mountProsemirror.ts:42-47`.

9. **Highlight remembers last color** — **Rule:** highlight (via input rule or `Ctrl-Meta-h`)
   defaults to `useUIState.lastUsedHighlight` (or "1"). **Enforced at:** `inputRules.ts:62`,
   `keymap.ts:42-46`, default attr `schema.ts:68`.

10. **Shared formatting shortcuts** — **Rule:** `Meta/Ctrl-b/i/u` and `Ctrl-Meta-x` toggle
    strong/em/underline/strikethrough; both Meta and Ctrl bound (mac Ctrl variants keep
    working). **Enforced at:** `formattingKeymap.ts:14-22`, applied `keymap.ts:41`.

### Links / autolink

11. **Autolink on word boundary** — **Rule:** after a doc change, the last whitespace-
    terminated word is tokenized; if it's a valid link structure (a lone link, or a link
    wrapped in `()`/`[]`) it gets a `link` mark. **Trigger/Context:** `appendTransaction` on
    any doc-changing tx without `preventAutolink` meta. **Enforced at:**
    `autolink-plugin.ts:48-192`; valid-structure check `:23-35`. **Notes:** treats
    `hard_break` like a space (`:103-105`).

12. **Autolink never enters code** — **Rule:** candidate ranges already covered by a `code`
    mark are skipped; ranges already linked are skipped. **Enforced at:**
    `autolink-plugin.ts:152-162` (code), `:167-173` (existing link).

13. **Pasting a bare URL links instead of replacing** — **Rule:** if clipboard text is a URL
    (`betterIsUrl`): empty selection → insert URL text + link mark; non-empty selection →
    add link mark over the selection. Returns early (no block splitting). **Enforced at:**
    `useHandlePaste.ts:36-70`; shared variant `linkOnPaste.ts:8-23` (comment editors).
    **Notes:** this paste path pushes its own undo entry directly (`:52-65`) rather than via
    the dispatch path.

14. **`cmd/ctrl-click` opens links in a new tab** — **Rule:** handled on the native `click`
    DOM event (not PM click handling) so popup blockers trust it and a >4px mouse move
    doesn't cancel it. Plain click on a link opens the link-edit popover instead.
    **Enforced at:** `mountProsemirror.ts:108-154` (DOM click), `:223-243` (popover).

### Footnotes & atoms

15. **Footnote node ↔ Replicache entity pairing** — **Rule:** inserting a footnote both
    creates a `footnote` PM node (attr `footnoteEntityID`) *and* a `createFootnote` Replicache
    record; the node's position among siblings is a fractional index computed from
    surrounding footnotes. **Enforced at:** `insertFootnote.ts:9-71` (`createFootnote`
    `:59-64`, node insert `:66-68`), input-rule trigger `inputRules.ts:247-261`.

16. **Arrow keys step over a footnote atom** — **Rule:** ArrowLeft/ArrowRight at an empty
    selection adjacent to a `footnote` jump the cursor across the whole node (don't select
    it). **Enforced at:** `skipFootnote` `keymap.ts:155-173`, called `keymap.ts:111,123`.
    **Notes:** only `footnote` is special-cased here; `atMention`/`didMention` (selectable
    atoms) get default PM NodeSelection behavior.

17. **Deleting a footnote node deletes its record (once)** — **Rule:** on any *local*
    doc-changing tx, footnote IDs present in the old doc but absent in the new doc trigger
    `deleteFootnote`. Remote (ySync-origin) changes skip this so the deletion isn't fired by
    every client. **Enforced at:** `mountProsemirror.ts:283-303`; remote guard `:281,284`.

18. **Deleting all commented text deletes the comment (once)** — **Rule:** comment IDs in the
    old doc but not the new doc trigger `deleteComment`; remote changes skip it; resolving a
    thread strips its mark locally and also fires this (deleteComment is idempotent).
    **Enforced at:** `mountProsemirror.ts:305-332`.

19. **Footnote click target depends on viewport** — **Rule:** clicking a footnote ref opens a
    popover on mobile/canvas, else scrolls/focuses the side-column (or bottom) footnote
    editor. **Enforced at:** `mountProsemirror.ts:159-200`; read-only path
    `index.tsx:190-202`.

### Mentions

20. **`@` opens autocomplete; selection replaces `@` with an atom** — **Rule:** typing `@`
    (line start, after space, or after a hard_break) schedules the autocomplete; selecting a
    result deletes the `@`(+query) range and inserts a `didMention` (for DIDs) or `atMention`
    (publications/posts/service results) atom, then a trailing space. **Enforced at:**
    triggers `inputRules.ts:264-282`; insertion `addMentionToEditor`
    `BskyPostEditorProsemirror.tsx:408-451`; wiring `index.tsx:561-604`. **Notes:** the space
    is inserted at `from + 1` because the atom occupies exactly one position.

21. **`@` on an empty block can embed instead** — **Rule:** choosing a service result with an
    embed on an otherwise-empty block converts the block to an `embed` (retracts `block/text`);
    otherwise it creates a new embed block below and strips the `@`. **Enforced at:**
    `handleMentionEmbed` `index.tsx:606-688`.

### Paste

22. **Paste splits HTML into one block per top-level element** — **Rule:** pasted HTML is
    flattened to a list of block-like elements (`P/H1–6/LI/UL/OL/BLOCKQUOTE/PRE/IMG/A/SPAN/HR`
    + data-attr cards), each mapped to a Leaflet block type and created via Replicache;
    inline content of each is parsed with the single-block `parser` and spliced into that
    block's editor. **Enforced at:** flatten `useHandlePaste.ts:612-661`; per-child
    `createBlockFromHTML` `:167-610`; content splice `:551-561`.

23. **Plain text paste is routed through a markdown→HTML parser** — **Rule:** if there is no
    usable `text/html` but there is text, the text is converted with `markdownToHtml` and then
    treated as HTML (so `# `, `- `, etc. in pasted plaintext become real blocks).
    **Enforced at:** `useHandlePaste.ts:71-76`; parser `htmlMarkdownParsers.ts:25-35`.

24. **Comment anchors are stripped on copy and paste** — **Rule:** comment marks must never
    travel through the clipboard (a copied anchor would re-attach an unrelated thread).
    `transformCopied`/`transformPasted` strip the `comment` mark from slices; the HTML paste
    path additionally strips `span.comment-anchor` markup from the parsed clipboard DOM.
    **Enforced at:** `stripCommentMarks.ts:9-28`; wired `mountProsemirror.ts:106-107`; HTML
    path `useHandlePaste.ts:81-85`. **Notes:** the HTML path parses clipboard HTML itself, so
    `transformPasted` doesn't run for it — hence the duplicate stripping.

25. **Pasted images replace an empty block or insert a new image block** — **Rule:** a
    clipboard image becomes an `image` block; if the current block has no text it is converted
    in place (retract `block/text`), else a new image block is added below. A single-IMG HTML
    paste with an accompanying image item is suppressed so it isn't created twice.
    **Enforced at:** `useHandlePaste.ts:89-158` (`:92-94` dedupe).

26. **Paste preserves block-type semantics by tag** — **Rule:** tag → block type mapping:
    `BLOCKQUOTE`→blockquote, `PRE`→code (with language detection), `H1–4`→heading(level),
    `LI/SPAN/P`→text, `A[data-type=button]`→button block (else inline link mark in a text
    block), `HR`→horizontal-rule, `DIV[data-*]`→math/bluesky-post/card; lists set
    `is-list`/`list-style`/`check-list` and recurse for nesting. **Enforced at:**
    `useHandlePaste.ts:219-549`.

### CRDT / Yjs sync

27. **Yjs is bound, Replicache is the source of truth for stored text** — **Rule:** the
    `block/text` Replicache fact holds the *full* base64-encoded Yjs doc state; it is applied
    to the local `Y.Doc` on load and on pokes, and the local fragment is written back
    (debounced ~300ms) on local edits. The PM `EditorState` is bound to the Yjs
    `XmlFragment("prosemirror")` via `ySyncPlugin`. **Enforced at:** doc owner
    `useCollabText.tsx:49-142` (apply `:72-75`, write-back `:104-140`); bind
    `mountProsemirror.ts:84-86`; encoder for plaintext `createYjsText.ts`. **Notes:**
    because Yjs updates are CRDTs, applying the same change from both the realtime channel and
    a Replicache pull converges (`yjsRealtime.tsx:18-23`).

28. **Only local edits are persisted/broadcast** — **Rule:** write-back to Replicache is
    skipped for transactions whose origin is empty (came from Replicache) or is the realtime
    connection (a peer already persisted it). Realtime broadcast similarly only relays edits
    whose origin is the PM binding. **Enforced at:** `useCollabText.tsx:124-134`;
    `yjsRealtime.tsx:87-93`.

29. **`editorStates` mirrors each block's PM state, keyed by entityID** — **Rule:** every
    mounted editor publishes `{editor, view, keymap, initial}` into the global
    `useEditorStates` store under its `entityID`; cross-block operations (paste splice,
    backspace-merge, mention insert) read/write peers through this store, and the view is
    re-`updateState`d when the store entry changes. **Enforced at:** store
    `useEditorState.ts:4-34`; dispatch writes `mountProsemirror.ts:272-365`; subscription
    re-apply `:249-258`. **Notes:** `setEditorState` replaces only the edited entity's entry,
    so a keystroke in one block leaves others referentially equal (perf invariant relied on by
    `RemoteCursors.tsx:121-126`).

30. **Remote cursors live outside the contenteditable** — **Rule:** the custom
    `remoteCursorPlugin` only (a) publishes local selection to awareness and (b) decorates
    *remote selections* as inline decorations; it never injects a caret widget into the
    editable DOM. Carets are drawn by the `RemoteCursors` overlay via `coordsAtPos`.
    **Enforced at:** `remoteCursorPlugin.ts:13-23,27-72`; overlay `RemoteCursors.tsx`;
    rationale: widget islands break mobile selection-handle drags. **Notes:** awareness/cursor
    state is ephemeral — only ever over the realtime channel, never Replicache
    (`yjsRealtime.tsx:21-23`).

31. **A clamped remote position is required for a remote selection deco** — **Rule:** remote
    anchor/head are clamped to `doc.content.size - 1`; if anchor==head (collapsed) no
    selection decoration is drawn (caret is the overlay's job). **Enforced at:**
    `remoteCursorPlugin.ts:54-58`, `RemoteCursors.tsx:88-91`.

### Undo / history

32. **Editor edits group into timeout-bounded undo steps** — **Rule:** doc-changing
    transactions (unless `addToHistory:false` or `bulkOp`) start an undo group, push an
    `{undo,redo}` that restores the prior/next `EditorState`, and end the group after 200ms of
    inactivity (or on blur). **Enforced at:** `trackUndoRedo` `mountProsemirror.ts:371-395`;
    blur-end `index.tsx:285-289`; grouping primitives `undoManager.ts`.

33. **Yjs write-backs are excluded from undo** — **Rule:** the `block/text` `assertFact`
    write-back sets `ignoreUndo: true` because undo/redo is handled at the PM layer (restoring
    editor states), not by undoing the fact. **Enforced at:** `useCollabText.tsx:113-122`
    (`ignoreUndo` `:115`).

34. **Backspace/Enter wrap their block-structure mutations in an undo group** — **Rule:**
    Backspace and Enter run inside `um.withUndoGroup` so the PM edit and the Replicache block
    mutation (merge/split/remove) undo together. **Enforced at:** `keymap.ts:133-142`.

### Selection-highlight / draft plugins

35. **Selection highlight skips selection-only updates** — **Rule:** the
    `highlightSelectionPlugin` recomputes its decoration only when the doc changed or a forced
    `updateSelectionHighlight` meta is set (on blur), to avoid DOM mutations that break native
    selection-handle dragging. **Enforced at:** `plugins.ts:9-43`.

36. **Comment drafts are decorations, not marks** — **Rule:** a comment being drafted
    highlights its range with a *decoration* (mapped through edits), so nothing is written to
    the shared Yjs doc until the comment is submitted; the mapped range is the live anchor.
    **Enforced at:** `commentDraftPlugin.ts:10-45`.

### Schema versioning / stale clients

37. **Schema is versioned; bump on any representational change** — **Rule:** `SCHEMA_VERSION`
    must be incremented whenever a node/mark is added or a *required* attr is added (prefer
    defaulted attrs, which old schemas tolerate). **Enforced at:** `schema.ts:6-11` (=1).

38. **Newer-schema content is never applied to a bound editor; the client goes stale**
    — **Rule:** both inbound paths gate on the doc's stamped schema version: (a) the
    `block/text` fact (`updateSchemaVersion(fact) > SCHEMA_VERSION` ⇒ don't apply, mark
    stale); (b) realtime `doc-update` broadcasts carry a `schemaVersion` envelope field
    (`> SCHEMA_VERSION` ⇒ mark stale, drop). This prevents y-prosemirror from deleting
    unrepresentable content out of the shared doc and persisting that deletion to everyone.
    **Enforced at:** fact gate `useCollabText.tsx:61-75`; channel gate
    `yjsRealtime.tsx:205-219`; rationale `schemaVersion.tsx:8-24`.

39. **Stale clients stop editing and fall back to read-only render** — **Rule:** when stale,
    `TextBlock` mounts the static `RenderedTextBlock`/`RenderYJSFragment` renderer instead of a
    live editor, and a refresh toast is shown. **Enforced at:** `index.tsx:62-86`; toast
    `schemaVersion.tsx:50-78`; renderer `RenderYJSFragment.tsx`.

40. **Every persist stamps the doc's schema version** — **Rule:** `stampDocSchemaVersion` is
    called before each write-back so the recorded version is the highest that has edited the
    doc; plaintext helpers (`createYjsText`) don't stamp (they only produce v0 nodes).
    **Enforced at:** `schemaVersion.tsx:45-48`; called `useCollabText.tsx:111`. **Notes:**
    pre-versioning content has no stamp and counts as v0 (`schemaVersion.tsx:29,34-40`).

41. **A stale client must not flush a pending write-back** — **Rule:** the debounced
    Replicache write checks `useStaleClient.stale` and bails, so a flush firing after the
    editor unmounts on going stale can't clobber newer content already in the fact.
    **Enforced at:** `useCollabText.tsx:108-110`.

---

## Suspected inconsistencies / violations

- **V1 — `multiBlockSchema`/`multilineParser` is dead code in paste.** `useHandlePaste.ts`
  imports `multiBlockSchema` and builds `multilineParser`
  (`useHandlePaste.ts:6,21`) but **never uses** `multilineParser` — every child is parsed
  with the single-block `parser` (`:278`). Confirmed by grep (1 declaration, 0 uses). Harmless
  but suggests an abandoned "parse whole clipboard as multi-block" approach; the actual
  multi-block split is done by `flattenHTMLToTextBlocks` + per-element Replicache mutations.

- **V2 — Mark-add input rules vs the schema's `inclusive: true` default.** Inv. 6 papers over
  Inv. 5: bold/em/code/strike/highlight are inclusive marks, so the *only* thing stopping them
  bleeding after an input rule is the explicit `removeStoredMark`. Any new mark input rule that
  forgets the `removeStoredMark` (e.g. if copied without line 45/65/83/102/121) will silently
  bleed. Not a current bug, but a fragile invariant worth flagging.

- **V3 — Footnote `deleteFootnote`/comment `deleteComment` diffing only runs on the editing
  client.** The orphan-diff in `dispatchTransaction` is skipped for ySync-origin (remote)
  changes (`mountProsemirror.ts:281,284`). This assumes the *originating* client is alive long
  enough to fire the mutation. If a peer deletes a footnote/comment and immediately
  disconnects (or the tab closes) before the 300ms write-back / mutation, the Yjs deletion can
  propagate (text node gone) while the `block/footnote` / comment record is **orphaned** on
  other clients. Convergence of *text* is guaranteed (CRDT); convergence of the *side records*
  is not — it rides on a non-CRDT, client-local diff. Flagged as an intention/availability
  gap, not a confirmed dup-delete.

- **V4 — `atMention`/`didMention` selectable but `footnote` not — asymmetric atom
  navigation.** Arrow-key `skipFootnote` (`keymap.ts:155-173`) only special-cases `footnote`.
  `atMention`/`didMention` are `selectable: true` atoms, so arrowing onto them creates a
  NodeSelection (default PM), while footnotes are stepped over. This is presumably intentional
  (mentions are interactive/clickable, footnotes are pure refs) but means "atom navigation" is
  not uniform — worth documenting as two different deletion/selection behaviors.

- **V5 — `isUrl` vs `betterIsUrl` divergence.** `isUrl` is `str.includes(".")`
  (`isURL.ts:8-10`) — extremely loose — while paste/blockify use `betterIsUrl` (requires a
  protocol, `:12-35`). Both are exported and used in different call sites; the autolink plugin
  uses linkify's tokenizer instead. Not a violation per se, but three different "is this a
  URL" notions coexist, so "what counts as a link" depends on the path (paste vs autolink vs
  blockify-button).

- **V6 — Read-only renderer assumes a single `paragraph` (or `hard_break`) top node.**
  `RenderYJSFragment` only handles `node.nodeName === "paragraph"` (and a stray top-level
  `hard_break`); any other top node returns `null`/`<br/>` (`RenderYJSFragment.tsx:31-146`).
  This is consistent with Inv. 1 (doc is always a single paragraph), but if the schema ever
  allowed another top block, the stale/read-only path would silently render nothing. The
  editing schema enforces single-paragraph, so this holds *today* — listed because the static
  renderer encodes the invariant independently of the schema and would drift if the schema
  changed without a version bump.

- **V7 — Comment-mark delete fires `deleteComment` on resolve too (acknowledged).** Resolving
  a thread strips its mark locally, so the orphan-diff also fires a redundant `deleteComment`
  for the resolver (`mountProsemirror.ts:323-332`). The code comments call this out and rely
  on `deleteComment` being idempotent. Not a bug; documented because it means "comment mark
  removed ⇒ thread deleted" is the enforced rule and resolve is implemented *as* a mark
  removal, so any feature that strips a comment mark for another reason would delete the thread.

---

## Open questions

1. **Footnote/comment record cleanup on abrupt disconnect (V3).** Is there a server-side or
   appview-side reconciliation that GCs `block/footnote` / comment records whose anchoring
   node no longer exists in the persisted `block/text`? If not, orphaned footnote/comment
   records are possible. (Lead may know from the appview/CVR side.)

2. **Undo across the Yjs boundary.** PM undo restores `EditorState` objects
   (`mountProsemirror.ts:337-352`) but the bound Yjs doc is mutated by `ySyncPlugin`. Does
   restoring an old `EditorState` correctly drive ySync to *reverse* the Yjs change, and does
   that interact with a y-prosemirror `UndoManager`? I did not find a Yjs `UndoManager` in use
   for text blocks (only `src/undoManager.ts`, the Rocicorp one) — confirm there is no
   second, Yjs-level undo stack that could diverge.

3. **Atom drag-and-drop.** `atMention`/`didMention` are `draggable: true`. What happens when
   one is dragged across the block/Replicache boundary (atoms reference DIDs/atURIs but
   footnotes reference a Replicache entity)? Footnotes are `draggable: false`, presumably to
   avoid moving a node whose record position would then be stale — confirm there's no path
   that drags a footnote.

4. **`hard_break` + autolink interaction at block joins.** Autolink treats `hard_break` as a
   space (`autolink-plugin.ts:103-105`) and the `@`-after-hard_break rule exists
   (`inputRules.ts:271-282`); are there cases where a URL spanning a hard_break is partially
   linked? (Probably out of scope but the special-casing suggests edge cases.)

5. **Multi-ID comment mark splitting on partial delete.** When text under an overlapping
   (multi-ID) comment mark is partially deleted, does the diff in
   `mountProsemirror.ts:307-332` ever drop an ID that still has surviving anchored text
   elsewhere in the block? The diff is whole-block set membership, so an ID survives if *any*
   anchored char remains — but if the same `commentID` appears in two disjoint marks, deleting
   one range won't delete the comment (correct), yet `commentDraftActions.ts:156/195` re-emit
   joined IDs on edit — worth a closer look at whether IDs can desync between segments.
