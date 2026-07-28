# feature/pub-pages branch — simplification review

74 files changed, +3453 / -251 vs `main`. Two cross-cutting features:
1. **Publication Pages**: publication-owned static pages (about/contact/home),
   built as Leaflets in `/edit/...`, published as `pub.leaflet.publicationPage`
   records, rendered at `/lish/:did/:pub/:rkey` (or `/` for the homepage).
2. **New blocks**: `postsList` (renders publication's posts inside a page) and
   `standardSitePost` (embeds another leaflet post as a card).

## Review areas

Each subagent gets a focused slice + the same charter: identify
simplification opportunities, code duplication, dead code, awkward props
threading, and any correctness gaps in the first-pass implementation.

### Area A — Publication shell components (rendering chrome)
Files: `app/lish/[did]/[publication]/PublicationContent.tsx`,
`PublicationHomeLayout.tsx`, `PublicationHeader.tsx`,
`PublicationStickyHeader.tsx`, `PublicationNav.tsx`,
`PublicationPostsList.tsx`, `PublicationPostItem.tsx`.

Watch for:
- `PublicationPostItem` is exported BOTH from `PublicationContent.tsx`
  (legacy, used only by `PublicationPostsList` for fake posts) AND from
  `PublicationPostItem.tsx` (new Small/Medium/Large variants). Likely
  redundant.
- `MetaRow`/`PostLink` patterns inside `PublicationPostItem.tsx`.
- `PublicationStickyHeader` does DOM scroll observation via raf + class
  selector. Is this still needed after `1880ebb1 simplify scroll stuff`?
- `PublicationHeader` mixes stacked/inline variants with conditional
  inline-style math. Could simpler CSS handle it.
- `PublicationNav` sorting/filtering of pages is duplicated in
  `PublicationPagesNav.tsx` (edit side).

### Area B — Publication page renderer (server side aggregation)
Files: `app/lish/[did]/[publication]/[rkey]/PublicationPageRenderer.tsx`,
`DocumentPageRenderer.tsx`, `PostContent.tsx`, `Blocks/PublishedPageBlock.tsx`,
`PostPages.tsx`, `CanvasPage.tsx`, `LinearDocumentPage.tsx`,
`Interactions/Quotes.tsx`, `page.tsx`, `getPostPageData.ts`,
`app/lish/[did]/[publication]/page.tsx`.

Watch for:
- `extractBlocksByType` / `extractFromListItems` are duplicated between
  `PublicationPageRenderer.tsx` (lines ~264-311) and
  `DocumentPageRenderer.tsx` (lines ~208-257). Identical implementations.
- Both renderers manually walk blocks for bsky/standardSitePost/poll/code.
  Could be one `collectBlockResources(pages)` helper.
- `JSON.parse(JSON.stringify(...))` used three+ times to strip non-plain
  objects before passing server→client. Is there a single helper or do we
  even need it?
- `standardSitePostData` is threaded as a prop through PostPages → CanvasPage →
  CanvasBlock → Block → PublishedPageLinkBlock → CanvasLinkBlock → Block (and
  Quotes preview). That's a lot of prop drilling alongside `bskyPostData`.
  Could a context replace both.
- `PublicationPageRenderer` constructs a fake `DocumentContextValue` with
  `normalizedDocument: null as unknown as ...` — sign that `DocumentContext`
  shape is wrong for non-document pages.
- `app/lish/[did]/[publication]/page.tsx`: homepage branch builds the
  same publication-row → page-record plumbing as `[rkey]/page.tsx`. Two
  call sites, very similar shape.

### Area C — Edit Pages flow (in-app editor for publication pages)
Files: `app/lish/[did]/[publication]/edit/[[...route]]/layout.tsx`,
`page.tsx`, `PublicationPagesNav.tsx`, `PublicationEditHeader.tsx`,
`PublicationPageLeaflet.tsx`,
`app/lish/[did]/[publication]/dashboard/EditPagesNavLink.tsx`,
`app/lish/[did]/[publication]/dashboard/PublicationDashboard.tsx`.

Watch for:
- `window.prompt` for path in `PublicationPagesNav.handleCreate` — feels
  like a TODO disguised as UI.
- `EditPagesNavLink` auto-creates a home page on first click. Subtle side
  effect for a nav button.
- `PublicationPagesNav` and `PublicationNav` both sort/filter pages with
  near-identical logic.
- `useLeafletPublicationPage()` flag is checked in `Page.tsx`,
  `PageOptions.tsx`, `Sidebar.tsx`. Are all three places needed.
- `PublicationEditHeader` toast/status state machine has both `setTimeout`
  and `try/catch` — review for race conditions when leaving page.

### Area D — New blocks: editor side
Files: `components/Blocks/PostsListBlock.tsx`,
`components/Blocks/StandardSitePostBlock/{index,StandardSitePostItem,parseStandardSitePostInput}.tsx`,
`components/Blocks/Block.tsx`, `BlockCommandBar.tsx`, `BlockCommands.tsx`,
`EmbedBlock.tsx`, `components/StandardSitePostDataProvider.tsx`,
`src/replicache/attributes.ts` (new attributes),
`src/utils/getBlocksAsHTML.tsx`, `src/utils/addLinkBlock.ts`.

Watch for:
- `SettingsTriggerButton` is defined identically in both `PostsListBlock.tsx`
  and `StandardSitePostBlock/index.tsx` — same forwardRef wrapper, same
  forgetDisplayName boilerplate.
- `PostsListSettingsButton` mixes view + highlight + tag filter UI;
  hand-rolled tag list could use existing `Toggle`/`Menu` primitives.
- `StandardSitePostDataProvider` has a hand-rolled per-microtask batch
  loader on top of `useSWR`. Worth checking it's actually needed (no
  built-in batching in `swr`).
- `BlockCommands.tsx`: new "Subscribe Form" command currently creates a
  `text` block as a placeholder — looks unfinished.
- `addLinkBlock` and `EmbedBlock.tsx` both branch on `data.leafletPost` —
  the same path detection logic, written twice.
- `getBlocksAsHTML.tsx` adds `standard-site-post` and `posts-list` cases
  but returns just `<div data-type=... data-uri=...>` — is that
  rehydrated anywhere or dead?

### Area E — Publish pipeline & lexicon glue
Files: `lexicons/src/publicationPage.ts`, `lexicons/src/blocks.ts`,
`lexicons/build.ts`, `lexicons/pub/leaflet/{publicationPage,blocks/postsList,blocks/standardSitePost}.json`,
`actions/createPublicationPage.ts`, `actions/publishPublicationPages.ts`,
`actions/createNewLeaflet.ts`,
`src/utils/leafletToPublicationPageRecord.ts`,
`src/utils/factsToPagesRecord.ts`,
`src/utils/getPublicationMetadataFromLeafletData.ts`,
`app/api/rpc/[command]/get_publication_data.ts`,
`app/api/rpc/[command]/get_standard_site_posts.ts`,
`app/api/rpc/[command]/route.ts`,
`app/api/link_previews/route.ts`,
`src/utils/resolveStandardSitePostUrl.ts`,
`app/api/oauth/[route]/{oauth-metadata,route}.ts`.

Watch for:
- `factsToPagesRecord.ts` was extracted from somewhere (likely
  `publishToPublication`) — does the original still duplicate this
  logic? Check that `processBlocksToPages` is the single source of truth.
- `publishPublicationPages` serial loop over `pageRows` — is it OK to
  parallelize, given uploadLock?
- `createNewLeaflet` got generalized to accept `firstBlocks: DefaultBlockType[]`
  but the public callers only pass `firstBlockType` OR `["text","posts-list"]`.
  Could be simpler if `firstBlocks` always wins.
- `pathToRkey("/foo/bar")` produces the same rkey as `pathToRkey("/foo-bar")`
  — collision risk if a publication has both.
- `resolveStandardSitePostUrl` does an unbounded `SELECT * FROM publications`
  and filters in memory. Could be a per-domain query.
- `getPublicationMetadataFromLeafletData` got a new `pageRow` branch and the
  early-return semantics changed (`if (!pubData) return null` happens inside
  the `if (pageRow)` block, so a leaflet that *only* has a publication_pages
  row but the page row has no `publications` returns null). Verify.
- OAuth scope diff: just adding `repo:pub.leaflet.publicationPage` — fine.
- `link_previews` route now does 2 things and the type for
  `LinkPreviewMetadataResult` is now `Promise<...>`. The consuming code at
  `addLinkBlock.ts:42` and `EmbedBlock.tsx:270` previously already awaited
  it as a Promise — but the *type* shouldn't include the Promise wrapper.

## Process

1. Dispatch 5 subagents (A–E) in parallel as Explore agents. Each is asked to:
   - Report specific simplification opportunities (file:line citations).
   - Note duplications, dead code, prop drilling, type holes.
   - Skip generic style nits.
2. Read each report adversarially:
   - Re-open the cited file/line.
   - Reject claims that lack a real basis.
3. Synthesize into one prioritized list.

