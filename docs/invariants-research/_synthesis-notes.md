# Synthesis notes — cross-agent comparison (working log)

Tracks where independent agents corroborate, conflict, or refine each other. Sources:
`00` = lead keyboard/lists notes, `01` data-model, `02` prosemirror, `03` focus/flatten/mouse,
`04` multiselect, `05` canvas, `06` rich-blocks (pending), `07` literature (pending).

## A. Corroborated across ≥2 independent agents (high confidence)

1. **Canvas Enter offset is inconsistent (`box.height + 12` vs `box.height`).** `00` (viol#1), `05`
   (susp#1). Block-selected path `useBlockKeyboardHandlers.ts:225` adds +12; in-text keymap
   `keymap.ts:465` adds none. Same gesture → different spacing. **CONFIRMED.**
2. **Single-block handlers go inert when >1 block is selected (defer to SelectionManager).** `00`
   (K2,K20), `04` (I4,I5), `03` (inv22). Core handoff invariant. BUT `04` (V4) finds it **leaks**:
   keymap `Enter`/`Escape` are not `>1`-guarded → multiselect Enter behavior is focus-dependent.
3. **Cmd/Ctrl-A is two-stage (select text → select sibling blocks).** `00` (K38), `04` (I16).
4. **Bulk delete orphans the children of selected list parents.** `01` (V3, from the mutation side:
   `deleteBlock` only removes named entities, SQL cascade is one level) AND `04` (V1, from the
   selection side: no `moveChildren`/re-home, unlike single Backspace `keymap.ts:262-285`). Two
   independent angles → **this is a real, important violation.**
5. **Tab/Shift-Tab outdent runs without a `previousBlock` guard; depth-1 outdent silently converts to
   text.** `00` (viol#4), `05` (susp#3). On canvas the flat-list invariant only "accidentally" holds
   because neighbors are null.
6. **Fractional position order has an id tie-break at the ROOT level only; child sort omits it.** `01`
   (I1), `03` (inv2, S5). Duplicate positions → nondeterministic child order. Equal positions also
   make `generateKeyBetween` throw (`01` V1).
7. **`block/is-list` is load-bearing only on the depth-1 root; descendants are treated as list items
   regardless of their own flag.** `01` (I9), `03` (inv6), `05` (inv7, canvas flat depth-1 stub).
   Promotion via outdent assumes the flag exists (`01` V4).
8. **A text block's editing doc is exactly one paragraph; block "type" lives in Replicache facts, not
   PM nodes.** `02` (inv1). Independently encoded a 2nd time in the stale-render path
   `RenderYJSFragment` (`02` V6).

## B. Conflicts / corrections to reconcile (my notes vs agents)

1. **Column preservation (x-memory).** `00` (K34/K36) assumed `lastXPosition` preserves the caret
   column across vertical block jumps. `03` (S3) proves `lastXPosition` is **DEAD**: init `0`
   (`useEditorState.ts:5`), read in `useBlockKeyboardHandlers.ts:115,129`, **never written**
   (whole-repo grep). RESOLUTION for the doc: column-preservation is an *intended* invariant that is
   **only partially honored** — the in-text keymap path works (uses live `coords.left`,
   `keymap.ts:207,235`); the block-level/through-atom path is broken (always lands left edge). Document
   as INTENDED + flag the violation. (Likely-intended write site: `mountProsemirror.ts` dispatch.)
2. **Atom caret-skip.** `00` (K32) framed "arrows step over atoms" around footnotes. `02` (V4) refines:
   **only `footnote` is arrow-skipped**; `atMention`/`didMention` are *selectable* atoms with default
   NodeSelection behavior. RESOLUTION: the general invariant ("caret never lands inside an atom; one
   keypress traverses it") is only implemented for footnotes → gap, not a clean invariant yet.
3. **`focusBlock` target types.** My agent-03 prompt guessed a `"begin"` target; `03` confirms only
   `start | end | top | bottom | coord` exist (`focusBlock.ts:114-131`), and top/bottom/coord silently
   fall back to `start` on hit-test miss (`03` S4). Use the real set in the doc.
4. **"Empty document always has an editable text block."** I hypothesized this; `03` (inv9-12) confirms
   AND locates it: empty doc renders a placeholder editable block (`index.tsx:185-233`); clicking the
   `.blocks` container or the 50vh `BlockListBottom` focuses-or-creates a trailing text block
   (`index.tsx:108-139,235-293`). BUT `03` (S1) finds **two divergent "click below" paths** that treat
   blockquote oppositely and differ on multiselect guard. So the invariant holds but via duplicated,
   slightly inconsistent code.

## C. Most important corroborated violations (candidate "fix-first" list)

- **V-ORPHAN**: bulk/structural delete leaks descendant entities & `card/block` edges (`01` V3, `04` V1).
- **V-XPOS**: `lastXPosition` dead → broken column memory through atom/non-text blocks (`03` S3).
- **V-POSCRASH**: equal/inverted neighbor positions make `generateKeyBetween` throw; the failed mutation
  still commits its id → durable client/server divergence (`01` V1,V8).
- **V-CANVAS-ENTER**: +12 vs 0 offset, and checklist not copied on canvas Enter (`00`,`05`).
- **V-INDENT-2-PARENTS**: `indent` = retract + `addLastBlock` (new fact id, no atomicity) can give a
  block two parent edges under reorder/permission-split (`01` V2).
- **V-MULTISELECT-LEAK**: keymap Enter/Escape not guarded for >1 selection (`04` V4); heading/size/list
  shortcuts fire at length 0/1 (`04` #3).
- **V-FOLD-PREVNEXT**: prev/next computed by 3+ different rules (fold-filtered render array vs
  unfiltered queries vs sorted-selection); list Enter/Backspace mix them → wrong-parent/off-by-one when
  folding is involved (`03` S7). Fold predicate duplicated verbatim in 4 places (`03` open-q).
- **V-NEWITEM-INHERIT**: new-list-item inheritance differs across the two Enter paths (`00` viol#2) and
  the canvas path (`05` susp#2).

## D. Taxonomy for the final document

1. Structural / data-model invariants (tree, positions, parent edges, cardinality, deletion,
   idempotency, concurrency) — mainly `01`.
2. Block lifecycle (create / split / merge / delete via Enter & Backspace) — `00` + `02`.
3. List / outline (indent, outdent, depth, subtree-travels-with-item, Enter-empty-outdents) — `00` +
   `list-operations` + `01`.
4. Caret & cross-block navigation (arrows, x-column, atom skip, stored-mark clear, boundary focus) —
   `00` + `03`.
5. Selection (single↔multi handoff, selectedBlocks model, Cmd-A, Shift-arrow, bulk ops, copy/paste) —
   `04` + `03`.
6. Text-internal ProseMirror+Yjs (schema, marks, input rules, paste normalization, footnotes/comments,
   CRDT source-of-truth, schema versioning, undo grouping) — `02`.
7. Rich / non-text blocks (isTextBlock gating, boundary behavior, two-step delete, conversions, slash
   menu, textarea blocks) — `06` (pending) + `00`.
8. Canvas mode & its divergences — `05`.
9. Focus & empty-state (trailing text block, focus-routing targets, click-empty-space) — `03`.
10. Undo / redo grouping — `00` + `02`.

Then: **Section 2 — Proposed additional invariants from literature** (`07` pending + my gap analysis).
Then: **Appendix — Suspected violations** (cross-referenced to the above).

## E. Still pending
- `06` rich-blocks/isTextBlock gating & two-step delete & slash-menu conversions.
- `07` literature survey → drives the "additional invariants" section.
