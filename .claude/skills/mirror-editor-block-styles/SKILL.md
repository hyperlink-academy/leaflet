---
name: mirror-editor-block-styles
description: Mirror stylistic changes made to a block in the editor over to the published post renderer, which is a separate render tree that drifts easily. Use whenever you change the visual styling (margins, padding, font size/weight, line-height, color, alignment) of a text/heading/blockquote/list/image block in components/Blocks/, so the published post keeps matching the editor.
user-invocable: true
---

# Mirror Editor Block Styles to the Published Post

Leaflet renders every block **twice**, from two disconnected code paths:

1. **Editor** (`components/Blocks/…`) — the interactive doc you write in.
2. **Published post** (`app/(app)/(published)/lish/[did]/[publication]/[rkey]/…`) — the
   read-only version served at `leaflet.pub`, rendered from the AT-Protocol
   record (facets + block fields), not from the editor components.

There is **no shared styling layer** between them beyond global CSS classes.
So a stylistic change in the editor (a margin, a font size, a color, a
line-height) does **not** automatically show up in the published post — it has
to be copied by hand. This skill is the checklist for keeping them in sync.

## When to use

Any time you change how a block *looks* in the editor — spacing (margin/padding),
font size, weight, line-height, color, alignment, or the block wrapper — mirror
that change into the published renderer, **unless the user explicitly says not
to**. Also run it as an audit when asked to "make the published post match the
editor."

Purely *interactive/editor-only* changes do **not** get mirrored: focus/selection
outlines, hover affordances, drag handles, remote-cursor overlays, command-bar UI,
placeholder text, foldable-heading markers, `relative`/positioning added solely to
anchor an editor overlay. If a change has no read-only visual effect, skip it.

## The two sides

### Editor (source of truth for how a block should look)

- **`components/Blocks/TextBlock/index.tsx`** — the most important file.
  - `HeadingStyle` map (per-level classes: weight, `leading-*`, `pb-*`, color,
    heading font-family).
  - `headingFontSize` map → `blockTextSize` (`src/utils/blockTextSize.ts`).
  - `BaseTextBlock` `textStyle` (the **editable** block — this is what the author
    actually sees, so it's the authoritative style): small → `textSizeSmall
    text-secondary`, large → `textSizeLarge text-primary`, default → `text-primary`.
  - `alignmentClass` (`text-left/right/center/justify`).
  - `RenderedTextBlock` is the *non-editing* fallback in the editor; if it and
    `BaseTextBlock` disagree, trust `BaseTextBlock`.
- **`components/Blocks/Block.tsx`** — the block **wrapper** spacing: top/bottom
  margins per block type, the heading level→top-margin map, blockquote stacking
  margins, first/last-block spacing, list indentation.
- **`app/globals.css`** — shared CSS. Some styles live here (`.pageScrollWrapper
  h1..h4`, `.textSizeSmall/.textSizeLarge`, `h1..h4 { font-bold }`, CSS variables
  like `--list-marker-width`). Changes here are **already shared** with the
  published post *if* the published markup uses the same selector/class — verify,
  don't assume.

### Published (the targets to update)

- **`app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostContent.tsx`** — the primary
  target: the interactive published post. The `Block` component's `switch`
  renders each block type (`text` → `<p>`, `header` → `<h1/h2/h3/h6>`,
  `blockquote` → `<blockquote>`, lists, image, …) and builds the block-wrapper
  `className` (margins) + inline `style` (font size). **Most mirroring happens
  here.**
- **`app/(app)/(published)/lish/[did]/[publication]/[rkey]/StaticPostContent.tsx`** — the
  static render for **feeds and email**. Minimal styling, no interactivity. Mirror
  here only when the change matters in a plain static context (and remember email
  strips a lot of CSS). Often out of scope; call it out rather than silently skip.
- **`…/Blocks/TextBlockCore.tsx`** — inline **facet** rendering (bold, italic,
  underline, strikethrough, code, highlight, links, mentions, footnotes). Mirror
  here if you changed an inline *mark's* appearance. These mostly reuse the same
  global CSS classes as the editor (`font-bold`, `italic`, `inline-code`,
  `highlight`, …), so inline marks usually stay in sync automatically.

## Editor → published mapping (block wrapper)

The editor's `Block.tsx` wrapper uses **padding + margin**; the published
`PostContent.tsx` uses margins on the block element. Match the *visual* result,
not the class names verbatim. Current mapping for headers (keep in sync):

| Condition (previous block)        | Editor (`Block.tsx`)     | Published (`PostContent.tsx`) |
|-----------------------------------|--------------------------|-------------------------------|
| first block                       | `mt-1 sm:mt-2`           | `mt-1 sm:mt-2`                |
| after a horizontal rule           | `""` (rule's own margin) | `""`                          |
| after another heading             | `mt-1`                   | `mt-1`                        |
| level 1, otherwise                | `mt-5 sm:mt-6`           | `mt-5 sm:mt-6`               |
| level 2, otherwise                | `mt-4 sm:mt-5`           | `mt-4 sm:mt-5`               |
| level 3 / 4, otherwise            | `mt-2 sm:mt-3`           | `mt-2 sm:mt-3`               |

`HeadingStyle` is duplicated as a constant in **both** `TextBlock/index.tsx` and
`PostContent.tsx` — edit both (each has a comment pointing at the other).

## Gotchas that cause silent drift

- **em vs rem — text size.** The editor sizes small/large text with `em` classes
  (`.textSizeSmall` = `0.875em`, `.textSizeLarge` = `1.125em`) so they scale with
  the publication's custom base font (`--theme-font-base-size` on
  `.pageScrollWrapper`). Do **not** mirror with Tailwind `text-sm`/`text-lg` —
  those are fixed `rem` and ignore the custom base. In the published post use an
  inline **em** `fontSize` (`0.875em` / `1.125em` / `1em`), which scales in every
  context (main post, quote excerpts, page-link previews), not only inside
  `.pageScrollWrapper`.
- **Inline `style` beats `className`.** The published `<p>`/`<hN>` set
  `fontSize` inline (`blockTextSize.*`). An inline font-size **overrides** any
  Tailwind size class on the same element. If you need a size variant, change the
  inline value — don't add a size class next to it and expect it to win.
- **`.pageScrollWrapper`-scoped CSS.** Classes like `.textSizeSmall`,
  `.pageScrollWrapper h1..h4` only apply *inside* that wrapper. Published content
  also renders in Quotes excerpts and page-link previews that may sit outside it.
  Prefer self-contained inline styles / full class strings there.
- **Level-4 heading = `<h6>`.** The published renderer emits `<h6>` for level 4,
  which the global `h1..h4 { font-bold }` and `.pageScrollWrapper h1..h4`
  font-family rules do **not** target. A level-4 heading needs its weight, heading
  font-family, and color spelled out (this is why `HeadingStyle[4]` is applied
  directly in `PostContent.tsx`).
- **Global CSS may already cover it.** Before duplicating a style, check whether a
  `app/globals.css` rule (e.g. `.pageScrollWrapper h2 { font-size }`) already
  applies to the published markup. If so, the change is shared — but confirm the
  published element actually matches that selector.

## Process

1. Diff the editor change (e.g. `git show <commit> -- components/Blocks/`). List
   each **stylistic** hunk; drop editor-only/interaction hunks.
2. For each stylistic change, find the matching block case in `PostContent.tsx`
   (and `StaticPostContent.tsx` / `TextBlockCore.tsx` if relevant) and apply the
   equivalent, honoring the gotchas above (especially em-vs-rem and inline-vs-class).
3. If a value lives in a `HeadingStyle`-style duplicated constant, update every
   copy.
4. `npx tsc --noEmit` to confirm it still type-checks.
5. If you can, eyeball parity with the `tests-posts` harness or by running the app
   (`/run`), then tell the user exactly which changes you mirrored and which you
   deliberately skipped (and why).
