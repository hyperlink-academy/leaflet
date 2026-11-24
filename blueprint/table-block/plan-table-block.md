# Table block

## Overview

- Build a first-class `table` block afresh; use `origin/feature/tables` only as a reference for its basic row/cell prototype.
- Store a local table as stable table, row, column, and cell entities. Each cell owns an existing Yjs/ProseMirror rich-text value and references its stable column.
- Publish a compact ATProto snapshot with rich-text plaintext/facets per cell, header/style/border/alignment metadata, and no local entity or Yjs identifiers.
- Ship document and canvas support together. Canvas tables keep readable column minimums and scroll horizontally inside their normal resizable canvas block.
- Keep v1 text-focused: inline marks and links work; comments, footnotes, nested blocks, merged cells, sorting, range selection, and manual resizing do not.
- Cap new editor table creation and expansion at 1,000 cells. Replay already-queued mutations under the earlier limit.

## Expected behavior

- `/table` creates a 2-column × 3-row table with a first-row header, visible borders, default styling, and left-aligned columns.
- Tables work on document and canvas pages, participate in existing block selection/deletion, and use an explicit contextual table trigger on desktop and mobile.
- The first row alone can be toggled as the header. Header columns are deferred, but the model remains extensible for a future boolean.
- Add/delete row and column commands retain at least a 1×1 table. New columns are left aligned; a Tab-created row is always a body row.
- Row reorder keeps the header row pinned and reorders only body rows; column reorder changes stable column order. Both ship with drag handles plus Move row up/down and Move column left/right menu actions.
- The focused cell is editable with the existing inline formatting vocabulary except comments and footnotes. Other cells render read-only until focused.
- `Tab` and `Shift+Tab` move forward/backward through cells. Tab from the final cell appends a body row and focuses its first cell. Enter moves down in the same column and appends a row when used in the last row. Shift+Enter inserts an in-cell line break.
- Arrow keys move within cell text first, then across cell boundaries and into neighboring blocks. Escape selects the table first, then returns focus to the page. With the table selected, Enter adds a block below and F2 enters a cell.
- Deleting a focused row or column moves focus to the same logical position in the next available row/column, then the previous one as fallback.
- A Markdown or HTML table pasted into an empty text block replaces it; from nonempty text it is inserted after the current block.
- Explicit TSV parses as a grid. Inferred TSV or quoted CSV needs at least two rows and columns of consistent width. Rich HTML is only treated as a grid if it contains a table. Pasted grids overwrite from the focused cell and expand the table if needed.
- Pasted cell markup keeps supported semantic marks, links, and line breaks; arbitrary fonts/colors are stripped, nested block boundaries become line breaks, and row/column spans are flattened.
- Show a concise toast only when an import is normalized or rejected.
- Any operation that would exceed 1,000 cells is refused with a clear explanation. A grid paste and all resulting expansion undo as one action.
- Copy table and block-level copy write semantic HTML carrying scoped Leaflet table metadata, GFM in `text/plain`, and TSV. Copying text inside a cell preserves its inline formatting.
- Reader output uses semantic `<table>`, `<thead>`, `<tbody>`, `<th scope="col">`, and `<td>`. It preserves table style, borders, and column alignment on web, email, and feeds; web/canvas readers scroll horizontally rather than shrinking content below readable width, while email uses a width-constrained fixed-layout table with content-weighted columns and wrapping cells.
- Published cell links follow existing Leaflet reader behavior: a safe new-tab link.

## Implementation plan

- Extend `src/replicache/attributes.ts` with the `table` block type and typed table, row, column, cell, header, style, border, alignment, and column-reference facts. Prefer named, cardinality-safe facts over arrays coupled to positional indexes.
- Extend `src/replicache/mutations.ts` with dedicated, atomic table operations: create default table; add/delete/reorder row; add/delete/reorder column; set header/style/border/alignment; and paste/resize grid. Each mutation must validate the 1×1/1,000-cell/rectangular invariants, create or remove descendant cells safely, and participate in one undo group.
- Extend descendant cleanup in `src/replicache/mutations.ts` so removing a table recursively removes rows, columns, cells, and their facts rather than relying on `card/block`-only traversal.
- Add table-aware materialization helpers near `src/replicache/getBlocks.ts` or a focused `src/replicache/table.ts` module. They should sort stable row/column references, map cells by column, repair deterministic missing cells after concurrent structural operations, and expose a rectangular editor view model.
- Add `components/Blocks/TableBlock/` for editor presentation, including a horizontal scroll frame, theme-token styling, semantic row/cell layout, canvas sizing behavior, lazy cell rendering, and first-row header treatment.
- Add a dedicated cell editor wrapper in `components/Blocks/TableBlock/` that reuses `components/Blocks/TextBlock/schema.ts`, `useCollabText.tsx`, formatting, and Yjs persistence but excludes document-block splitting, merging, comments, footnotes, list behavior, and document-level navigation.
- Add a table-specific keymap/focus utility using `src/state/useEditorState.ts`, `src/utils/focusBlock.ts`, and the existing undo manager. It implements Tab traversal, Enter/Shift+Enter, Escape, focused-row/column deletion recovery, and final-Tab row creation without inheriting `TextBlock/keymap.ts` block-split semantics.
- Register `table` in `components/Blocks/Block.tsx` and `components/Blocks/BlockCommands.tsx`; use the slash command to create the complete 2×3 graph in one undo group and place focus in the first header cell.
- Add a table context menu/toolbar following `components/Blocks/Block.tsx`, `components/Blocks/BlockCommandBar.tsx`, and existing toolbar patterns. It exposes table settings, row/column operations, Copy table, active-column alignment, and import-normalization feedback without hover-only controls.
- Ensure canvas integration uses existing block width/position state and `components/Blocks/ScaledCanvas.tsx` conventions. Avoid special canvas persistence: the table remains an ordinary canvas block with inner scrolling.
- Extend `src/htmlMarkdownParsers.ts` and `src/utils/paste/htmlToBlocks.ts` to preserve GFM/HTML tables before current flattening, parse TSV and conservative CSV, normalize cells/spans, convert cell HTML to supported rich text, and construct native table facts.
- Extend `components/Blocks/TextBlock/useHandlePaste.ts` with top-level table interception and add a table-cell paste path that applies rectangular data from the focused cell in one mutation/undo group.
- Extend `src/utils/getBlocksAsHTML.tsx` and `src/utils/copySelection.ts` to render table selections as semantic HTML with scoped native metadata, GFM plain text, and TSV. Ensure custom metadata is optional: external consumers see valid HTML even after it is stripped.
- Add `PubLeafletBlocksTable` to `lexicons/src/blocks.ts`, include it in `BlockLexicons`, and regenerate `lexicons/pub/leaflet/blocks/table.json` plus `lexicons/api` generated types with the existing `npm run lexgen` workflow. Use rows of rich-text cell snapshots, `headerRow`, style/border options, and per-column alignment.
- Extend the published block union in `lexicons/src/pages/LinearDocument.ts` and generated JSON to admit the table block. Keep the record additive so legacy documents and clients remain unaffected.
- Extend `src/utils/factsToPagesRecord.ts` to serialize local cells through existing Yjs-to-plaintext/facet helpers. It must preserve all supported inline facets and table appearance metadata while never serializing editor-only IDs.
- Add `app/(app)/(published)/lish/[did]/[publication]/[rkey]/Blocks/PublishedTable.tsx` and register it in `PostContent.tsx`. Render accessible semantic table HTML, theme-aware styles, reader scrolling, alignment, header scope, and existing link behavior.
- Extend `app/(app)/(published)/lish/[did]/[publication]/feedHtml.ts`, `emails/post.tsx`, `app/api/ai/lib.tsx`, and any text extraction helpers such as `src/utils/pageRecordTextBlocks.ts` with explicit table render/extraction policies. Use semantic table output where HTML supports it and a stable row/cell textual representation otherwise.
- Update `src/utils/blockDispatch.ts` coverage through the generated block union rather than adding an untyped special case.
- Do not cherry-pick `origin/feature/tables`. Its reusable lessons are stable ordered structure, rich-text cell reuse, and horizontal overflow; its index-bound widths, outdated hooks, missing publication pipeline, and missing tests should not enter the new implementation.

## Implementation phases

1. **Data and publication contract**
   - Define local table facts, invariants, creation/cleanup mutations, the ATProto lexicon, generated types, serializer fixtures, and published-record tests.
   - Result: a table can round-trip between local facts and a typed published record before editing UI ships.

2. **Core editor and reader**
   - Add slash creation, document/canvas rendering, focused-cell rich-text editing, header toggle, structural controls, keyboard/focus behavior, styles, borders, column alignment, and accessible row/column reordering.
   - Result: a polished manually authored table publishes as semantic responsive HTML.

3. **Clipboard interoperability**
   - Add Markdown/HTML/TSV/CSV parsing, in-table rectangular paste, full-table HTML/GFM/TSV copy, native metadata, guardrails, and one-step undo.
   - Result: authors can reliably import/export common text and spreadsheet table formats.

4. **Non-web surfaces and hardening**
   - Complete feed, fixed-layout wrapping email output, AI/export, plain-text extraction, concurrent-structure repair, accessibility verification, mobile QA, canvas QA, and performance instrumentation.
   - Result: tables behave consistently across every currently supported publication surface.

5. **Post-core enhancements**
   - Reassess the 1,000-cell cap, header columns, sorting, manual resizing, range selection, and nested content only after production usage validates the core model.

## Testing strategy

- Add unit tests for table fact ordering, rectangular invariant repair, 1×1 minimum, 1,000-cell limit, cascaded deletion, concurrent add/delete resolution, and undo/redo of every structural mutation.
- Add Yjs/ProseMirror tests for rich formatting, link facets, lazy focused-cell editor hydration, Enter/Shift+Enter, Tab/Shift+Tab, Escape, and focus recovery after deletion.
- Extend `src/utils/paste/htmlToBlocks.test.ts` and `markdownPaste.test.ts` with GFM, semantic HTML, Excel/Google Sheets HTML, TSV, quoted CSV, spans, multiline cells, malformed grids, 1,000-cell boundary cases, and external styling removal.
- Add copy round-trip tests to `src/utils/getBlocksAsHTML.tsx`/`copySelection.ts` coverage: Leaflet metadata, semantic HTML degradation, GFM output, TSV output, links, marks, pipes/newlines, and plain-text fallback.
- Extend `src/utils/factsToPagesRecord.test.ts`, `src/utils/blockDispatch.test.ts`, feed HTML tests, email render tests, and AI Markdown/text extraction tests with table fixtures and every appearance/alignment/header permutation.
- Add component-level or browser interaction coverage for document and canvas editing, desktop drag and keyboard/menu reordering, mobile menu use, touch horizontal scrolling, keyboard-only structural operations, reader text selection/copy, focus rings, and screen-reader table semantics.
- Manually validate narrow desktop/mobile/canvas widths, high-density tables near the cap, normalized/rejected import toasts, slow collaboration, concurrent structural operations, undo after remote updates, fixed-layout email client rendering, and legacy documents without table records.

## Open questions

- The 1,000-cell creation and expansion cap is conservative. Revisit it after measuring hosted push latency and large-table editing. Previously saved larger tables can still publish.
- Header columns remain a deferred semantic feature. Adding `headerColumn` later should render body-row first cells as `<th scope="row">` and needs a defined Markdown fallback.
