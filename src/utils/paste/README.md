# Paste pipeline

Clipboard HTML → Leaflet blocks.

```
clipboard text/html ─┐
                     ├─► normalizePastedHTML ─► flattenHTMLToTextBlocks ─► buildBlockFromHTML ─► facts
clipboard text/plain ┘        (dialects)            (block elements)          (one per block)
   └─ markdownToHtml
```

- `normalizePastedHTML.ts` rewrites word-processor dialects into ordinary HTML:
  Word's `mso-list` paragraphs, Word Online's `aria-level` list runs, Google
  Docs' sibling-nested `<ul>`, class-driven marks that live in a `<style>`
  block, tables, task-list checkboxes. It also consumes a markdown renderer's
  footnote section (GFM `<section data-footnotes>`, pandoc `section.footnotes`,
  python-markdown `div.footnotes`): each ref becomes a span carrying its
  definition's HTML, from which the block builder mints a footnote entity.
- `htmlToBlocks.ts` flattens the normalized tree into block-level elements and
  turns each one into the facts a block needs.

Everything downstream of `parsePasteHTMLToElements` is pure, which is what the
tests drive. `useHandlePaste` only owns the Replicache/undo/cursor side.

## Tests

- `htmlToBlocks.test.ts` — one block outline per source (real captures in
  `__fixtures__/captured/`, plus hand-written fixtures for sources we have no
  capture of), then only what an outline can't show: marks, links, image URLs,
  Leaflet's own block attributes. Structural edge cases and blockquotes are
  tables of `html → outline`.
- `markdownPaste.test.ts` — the `text/plain` path.
- `fixtureInvariants.test.ts` — source-agnostic invariants over every fixture.

## What Google Docs actually emits

Worth writing down, because the widely-repeated version is out of date. Docs is
**not** currently wrapping its payload in
`<b style="font-weight:normal" id="docs-internal-guid-…">`; both captured
selections — whole-document and mid-paragraph — put that id on the first block
element and emit no wrapper. The failure that does bite is list nesting:
sublists arrive as _siblings_ of the `<li>` they belong to
(`<ul><li>a</li><ul><li>b</li></ul></ul>`), which `nestSiblingLists` repairs.

`legacy-docs-inline-wrapper.html` still exercises the wrapper shape, since an
inline element containing block content is real regardless of Docs (Docs itself
does it around images), but it isn't evidence about Docs today.

## Adding a real capture

Captures beat hand-written fixtures — the hand-written ones encode what we
_believe_ an app emits, and that belief has already been wrong once. To take one:

1. Open `capture-clipboard.html` in a browser.
2. Copy from the app you care about, then paste into the box.
3. Save the captured markup as `__fixtures__/captured/<source>.html`.

`fixtureInvariants.test.ts` picks up anything in `__fixtures__` automatically and
checks the invariants that hold for every source. Add an outline for the new
capture in `htmlToBlocks.test.ts` too — that is where a regression actually
shows up.
