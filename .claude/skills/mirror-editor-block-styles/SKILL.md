---
name: mirror-editor-block-styles
description: Keep every render surface of a block in sync with the editor. Use whenever you create a new block type or change an existing block in components/Blocks/ — styling (margins, padding, font size/weight, line-height, color, alignment) or structure — so the published post and the email newsletter keep matching the editor, and copy/paste keeps working. Unless the user says otherwise, block work isn't done until all surfaces are checked.
user-invocable: true
---

# Keep Block Surfaces in Sync with the Editor

Leaflet renders every block from **three disconnected code paths**, plus a
clipboard round-trip:

1. **Editor** (`components/Blocks/…`) — the interactive doc you write in.
   This is the **source of truth** for how a block looks and behaves.
2. **Published post** (`app/(app)/(published)/lish/[did]/[publication]/[rkey]/…`) —
   the read-only version served at `leaflet.pub`, rendered from the AT-Protocol
   record (facets + block fields), not from the editor components.
3. **Email newsletter** (`emails/post.tsx`) — the version sent to subscribers,
   rendered with react-email and inline pixel styles.
4. **Copy/paste** (`src/utils/getBlocksAsHTML.tsx` + `src/utils/paste/`) — the
   editor's clipboard serializer and parser, which must round-trip the block.

There is **no shared styling layer** between them beyond a few global CSS
classes. A change in the editor does **not** automatically show up anywhere
else — it has to be mirrored by hand. This skill is the checklist.

## When to use

Any time you **create a block type or update an existing block** — visual
styling (margin/padding, font size, weight, line-height, color, alignment, the
block wrapper) or structure (new fields, new variants) — check and mirror all
of: the published renderer, the email renderer, and copy/paste. Do this **by
default, unless the user explicitly says not to** (e.g. "editor only"). Also
run it as an audit when asked to "make the published post match the editor."

Purely *interactive/editor-only* changes do **not** get mirrored: focus/selection
outlines, hover affordances, drag handles, remote-cursor overlays, command-bar UI,
placeholder text, foldable-heading markers, `relative`/positioning added solely to
anchor an editor overlay. If a change has no read-only visual effect, skip it.

## Check in with the user first when…

Before mirroring, compare the editor version against the existing published and
email implementations. **Stop and ask the user before proceeding** if:

- The **published or email counterpart doesn't exist** for this block type
  (e.g. `emails/post.tsx` falls through to `BlockNotSupported`, or
  `PostContent.tsx` has no case for it). Building a whole new renderer for a
  surface is a scope decision, not a mechanical mirror.
- The existing published or email version is **significantly, deliberately
  different** from the editor (different layout, different content shown, not
  just drifted values). It may be intentional (email client constraints,
  static-context simplification) — ask rather than flattening the difference.

Small drifts (a margin or font-size that fell out of sync) are what this skill
exists for — just fix those.

## The surfaces

### Editor (source of truth)

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
  don't assume. They are **never** shared with email.

### Published post

- **`app/(app)/(published)/lish/[did]/[publication]/[rkey]/PostContent.tsx`** — the primary
  target: the interactive published post. The `Block` component's `switch`
  renders each block type (`text` → `<p>`, `header` → `<h1/h2/h3/h6>`,
  `blockquote` → `<blockquote>`, lists, image, …) and builds the block-wrapper
  `className` (margins) + inline `style` (font size). **Most mirroring happens
  here.**
- **`app/(app)/(published)/lish/[did]/[publication]/[rkey]/StaticPostContent.tsx`** — the
  static render used by **RSS feeds** (`generateFeed.ts`), *not* email. Minimal
  styling. Mirror here only when the change matters in a plain static context;
  call it out rather than silently skip.
- **`…/Blocks/TextBlockCore.tsx`** — inline **facet** rendering (bold, italic,
  underline, strikethrough, code, highlight, links, mentions, footnotes). Mirror
  here if you changed an inline *mark's* appearance. These mostly reuse the same
  global CSS classes as the editor (`font-bold`, `italic`, `inline-code`,
  `highlight`, …), so inline marks usually stay in sync automatically.

### Email newsletter

- **`emails/post.tsx`** — `BlockRenderer` is the email counterpart of
  `PostContent.tsx`'s block switch: one `PubLeafletBlocksX.isMain(block)` branch
  per block type, each styled with **inline pixel styles** on react-email
  components (`fontSize: 16`, `HEADING_FONT_SIZE_PX`, `BLOCK_MARGIN`,
  `HEADING_MARGIN`), with colors/fonts from the resolved `EmailTheme`.
  Unhandled types fall through to `BlockNotSupported` / `BlockDataNotFound`.
- **`emails/bskyPost.tsx`**, **`emails/standardSiteBlocks.tsx`** — embed-style
  blocks split into their own files.
- Sent by `app/api/inngest/functions/send_post_broadcast.ts`; previewable via
  `actions/publications/sendPostPreview.tsx` ("send test email").
- Email constraints: **no Tailwind, no global CSS, no `em` scaling, no CSS
  variables** — everything is inline `style` with absolute px values, and many
  clients strip anything fancy. Mirror the *visual intent* (relative size,
  weight, spacing, color role), not the mechanism. E.g. editor `textSizeSmall`
  (0.875em of a 16px-ish base) → `fontSize: 14` in email.

### Copy/paste (editor clipboard)

The clipboard must round-trip whatever the block renders:

- **Copy**: `src/utils/copySelection.ts` → `src/utils/getBlocksAsHTML.tsx`,
  whose `renderBlock` switch serializes each block type to HTML (plaintext falls
  out via `htmlToMarkdown`). A new or changed block field that isn't serialized
  here is silently dropped on copy.
- **Paste**: `components/Blocks/TextBlock/useHandlePaste.ts` drives the pipeline
  in `src/utils/paste/` (`normalizePastedHTML.ts` → `htmlToBlocks.ts`
  `buildBlockFromHTML`), which turns clipboard HTML back into block facts. See
  `src/utils/paste/README.md` for the architecture.
- **Check**: copying the block in the editor and pasting it back should
  reproduce it (type, content, and Leaflet-specific attributes). For a new
  block type, that usually means a `renderBlock` case *and* a matching parse
  case, plus a test in `src/utils/paste/htmlToBlocks.test.ts`. Run the tests
  with `npm test` (vitest).

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
  `.pageScrollWrapper`. In **email**, use absolute px against the 16px body base.
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
  directly in `PostContent.tsx`). Email clamps heading levels to h1–h3
  (`Math.min(3, …)` in `BlockRenderer`).
- **Global CSS may already cover it.** Before duplicating a style, check whether a
  `app/globals.css` rule (e.g. `.pageScrollWrapper h2 { font-size }`) already
  applies to the published markup. If so, the change is shared — but confirm the
  published element actually matches that selector. Email never gets global CSS.

## Process

1. Diff the editor change (e.g. `git show <commit> -- components/Blocks/`). List
   each **stylistic/structural** hunk; drop editor-only/interaction hunks.
2. Locate the block's counterpart in `PostContent.tsx` and `emails/post.tsx`
   (and `StaticPostContent.tsx` / `TextBlockCore.tsx` if relevant). If a
   counterpart is missing or deliberately very different, **check in with the
   user first** (see above) before writing code.
3. Apply the equivalent change to each surface, honoring the gotchas
   (em-vs-rem, inline-vs-class, px-only email). If a value lives in a
   `HeadingStyle`-style duplicated constant, update every copy.
4. For new fields/variants or a new block type, wire up copy/paste:
   `getBlocksAsHTML.tsx` serializer case + `src/utils/paste/htmlToBlocks.ts`
   parse case + test coverage.
5. Verify: `npx tsc` for types, `npm test` if paste/copy code changed, and if
   you can, eyeball parity with the `tests-posts` harness or by running the app
   (`/run`). Email can be eyeballed via `sendPostPreview`.
6. **Report per surface.** End with an explicit breakdown of what changed in
   each of: **editor**, **published post**, and **email** (plus copy/paste if
   touched). For any surface where nothing changed, say so and why — "no
   changes" must be stated, never implied by omission.
