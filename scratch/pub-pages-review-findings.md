# feature/pub-pages — simplification review findings

Five focused subagent reviews + adversarial verification. Below is the
synthesized list, ordered by impact.

## P0 — correctness / data integrity

### 1. Publication page rkey/path collision

`pathToRkey()` (`src/utils/leafletToPublicationPageRecord.ts:58-66`) lowercases
and slugifies the path, so `/foo/bar` and `/foo-bar` both produce rkey
`foo-bar`. Migration `20260429191659_add_publicaton_pages_table.sql:15` only
defines PRIMARY KEY `(id, publication)`. There is no unique constraint on
`(publication, path)` nor on rkey at the DB layer, and the PDS write at
`publishPublicationPages.ts:125` uses `putRecord` (overwriting).

Two pages with colliding slugs silently overwrite each other on publish.
Fix: add `UNIQUE (publication, path)` and either constrain rkey shape in
the lexicon (`publicationPage.json:7` is `"key": "any"` — should be
`"format": "literal"`/pattern, or `tid`) or detect collision when generating
the rkey.

### 2. `getPublicationMetadataFromLeafletData` early-returns null when
`pageRow.publications` is missing

`src/utils/getPublicationMetadataFromLeafletData.ts:76-88`: if a leaflet has
only a `publication_pages` row and no `leaflets_in_publications` /
`leaflets_to_documents` row, `pubData` is set ONLY when `pageRow.publications`
is truthy (the joined publication FK). When the join column is absent in the
data (depending on which query loaded `data`), the function returns `null`
at line 88 — losing the "this leaflet IS a publication page" signal that
`useLeafletPublicationPage()` relies on (`components/PageSWRDataProvider.tsx:102`).

Verify the `get_leaflet_data` selector includes the nested `publications` for
`publication_pages`, or change the logic to always set `page` on `pubData`
even when no publication is joined.

## P1 — duplication that's worth de-duping now

### 3. `extractBlocksByType` / `extractFromListItems` duplicated verbatim

`PublicationPageRenderer.tsx:264-311` vs `DocumentPageRenderer.tsx:208-257`.
Identical implementations. Move to a shared util (e.g.
`app/lish/[did]/[publication]/[rkey]/extractBlocksByType.ts`).

### 4. Page-sort helper duplicated

`PublicationNav.tsx:16-21` (read) and
`edit/[[...route]]/PublicationPagesNav.tsx:45-50` (edit) both sort with
"home first, then localeCompare". One helper `sortPublicationPages(pages)`.

### 5. `leafletPost` link-preview branch duplicated

`components/Blocks/EmbedBlock.tsx:271-286` and `src/utils/addLinkBlock.ts:44-58`
both check `data.leafletPost` and assert the same two facts. One helper
that returns the fact pair, called from both.

### 6. `SettingsTriggerButton` duplicated verbatim

`components/Blocks/PostsListBlock.tsx:96-110` and
`components/Blocks/StandardSitePostBlock/index.tsx:40-54` are character-for-character
identical (modulo `aria-label`). Extract a `BlockSettingsButton` primitive.

### 7. Per-page resource fetching duplicated across renderers

`PublicationPageRenderer.tsx:87-141` and `DocumentPageRenderer.tsx:43-140`
each do: build an `AtpAgent`, batch+fetch bsky posts in 25s, fetch
standard-site posts via `get_standard_site_posts.handler`, run `fetchPollData`,
and `extractCodeBlocks`. One `collectAndFetchBlockResources(pages)` helper.

### 8. Homepage / slug page dispatch duplicated

`app/lish/[did]/[publication]/page.tsx:57-76` (homepage) and
`app/lish/[did]/[publication]/[rkey]/page.tsx:111-127` (slug) each have a
"if there's a matching `publication_page` with `record_uri` and `record`,
render via `PublicationPageRenderer`, else render the legacy view" branch.
Worth unifying — e.g. the slug route already handles `path === "/" + rkey`,
so the homepage could be served by the same route with rkey=`""`/`/`.

## P2 — UX / unfinished work

### 9. `PublicationPagesNav.handleCreate` uses `window.prompt`

`edit/[[...route]]/PublicationPagesNav.tsx:31`. Hand-rolled native prompt for
path entry — clearly a placeholder. The project has `components/Modal` (Radix
Dialog) and `Input` for this.

### 10. "Subscribe Form" block command is a stub

`components/Blocks/BlockCommands.tsx:457-465` creates a `text` block —
no subscribe-form behaviour. Either implement the block type and the rendered
form, or remove the command until it does something.

### 11. `EditPagesNavLink` auto-creates a "home" page on first click

`dashboard/EditPagesNavLink.tsx:20-37`. The button is labelled "Edit Pages"
but on first click it silently calls `createPublicationPage` with path `/`,
title `home`. Surprising side effect. Either name it "Create Page" until
one exists, or move the seed-creation server-side when the edit layout
loads.

## P2 — reinvented or scattered primitives

### 12. `PostsListSettingsButton` tag picker is hand-rolled

`components/Blocks/PostsListBlock.tsx:180-216` builds a custom button list
with `bg-accent-1`/`hover:bg-border-light`. CLAUDE.md explicitly says use
existing `Menu`/`MenuItem` primitives; project also has
`RadioMenuGroup`/`RadioMenuItem` that already model single-select.

### 13. `useLeafletPublicationPage()` is checked in three render paths

`components/Pages/Page.tsx:34,86`, `components/Pages/PageOptions.tsx:63-64`,
`app/[leaflet_id]/Sidebar.tsx:25-26`. Each does its own `if (publicationPage)
return null` (or gates a child). A single conditional in
`edit/[[...route]]/PublicationPageLeaflet.tsx` (which already wraps the
`Pages`) would centralize this — passing a `mode="publication-page"` prop
or a small context.

### 14. Dead placeholder branches in `getBlocksAsHTML`

`src/utils/getBlocksAsHTML.tsx:101-105` emits
`<div data-type="standard-site-post" data-uri="..." />`, and
`getBlocksAsHTML.tsx:210` has `'posts-list': async () => null`. Grep finds
no consumer for either `data-type="standard-site-post"` or
`data-type="posts-list"`. Either wire them into an HTML rehydration path or
drop the cases.

### 15. `DocumentContext` is misused for publication pages

`PublicationPageRenderer.tsx:178` passes
`normalizedDocument: null as unknown as DocumentContextValue["normalizedDocument"]`,
plus zeroed `comments/mentions/recommendsCount/leafletId`. Strong signal
that publication-page rendering should not share the document context.
Either make `normalizedDocument` optional on the context type, or fork a
narrower `PublicationPageContext`. The current shape lets any component
inside crash on `.title` etc.

### 16. `PublicationStickyHeader.sticky` and `PublicationHeader.variant`
have a single non-default caller

Both props exist for the edit layout's single call site
(`edit/[[...route]]/layout.tsx:96-99`, the only spot passing `sticky={false}`
and `variant="inline"`). Either fold those two combinations into the edit
layout directly, or rename the prop (`sticky` is contradictory).

## P3 — smaller cleanups

### 17. `PublicationPostItem` exported from two files

The legacy `PublicationPostItem` in `PublicationContent.tsx:142-188` is now
only used by `PublicationPostsList.tsx` to render fake posts (theme preview
path, `theme-settings/PubPreview.tsx:51,96`). Same component is re-implemented
with three size variants in `PublicationPostItem.tsx`. Collapse: the fake-post
path can use `PublicationPostItemMedium` (with `description` only, no cover).

### 18. `PublicationPostItem.tsx` `author` prop is never passed

`PublicationPostsList.tsx:132-172` (and `StandardSitePostItem.tsx:75-77`,
which does pass a label string, not a ReactNode wrapper) never wire a
post-level author. `MetaRow`'s `hasAuthor` plumbing is unused. Drop the prop
from all three variants and from `MetaRow` until there's a real caller.

### 19. `createNewLeaflet`'s `firstBlockType` is half-superseded

`actions/createNewLeaflet.ts:33` keeps both `firstBlockType?: "h1" | "text"`
and `firstBlocks?: DefaultBlockType[]`. After this branch, only
`actions/createPublicationDraft.ts:12` still passes `firstBlockType`; the new
`createPublicationPage.ts:25` uses `firstBlocks`. Either drop
`firstBlockType` (and migrate `createPublicationDraft` to `firstBlocks:
["text"]`), or formalize `firstBlockType` as a shorthand. Today's API has
two ways to say the same thing.
*(Subagent E claimed firstBlockType was fully dead — verified false:
createPublicationDraft.ts:12 still uses it.)*

### 20. `resolveStandardSitePostUrl` does an unbounded `SELECT * FROM publications`

`src/utils/resolveStandardSitePostUrl.ts:38-47`. Loads every publication
record into memory and filters by `record.url`. Called from
`/api/link_previews` for every link preview. Once publication count is
non-trivial, this gets expensive. Use a JSONB filter
(`record->>url = origin`) or denormalize the URL into an indexed column.

### 21. `publishPublicationPages` serializes pages

`actions/publishPublicationPages.ts:73-143` publishes pages with a
`for…of` loop. Blob uploads are already serialized by `uploadLock`, but
fact fetching, record building, and `putRecord` per page could run in
parallel. Low-priority unless typical publications have many pages.

### 22. `StandardSitePostDataProvider`'s microtask batcher may be redundant

`components/StandardSitePostDataProvider.tsx:7-49`. Hand-rolled microtask
batching on top of SWR. SWR already dedupes by key; if every block reads
from server-provided `posts` context first (which it does, line 71), the
batcher only runs for blocks not in the SSR payload. Worth confirming
whether multi-block client-side rendering actually hits the batch path
often enough to justify the complexity.

### 23. `PublicationEditHeader` "publishing" timeout has no cleanup

`edit/[[...route]]/PublicationEditHeader.tsx:31` uses `setTimeout` to reset
status but never clears it on unmount or on a second `handlePublish` call.
Add a `useEffect` cleanup or store the timeout id and clear it.

### 24. Lexicon `publicationPage.json:7` uses `"key": "any"`

While `pathToRkey` constrains rkeys at write time, the lexicon allows
anything — drift between code and contract. Tighten the key constraint.

### 25. Unused import in `PostContent.tsx`

`app/lish/[did]/[publication]/[rkey]/PostContent.tsx:11`: `PubLeafletDocument`
is imported but never referenced (TS 6133). Drop it.

### 26. `link_previews` route's exported type wraps Promise twice

`app/api/link_previews/route.ts:38-42`: `LinkPreviewMetadataResult` is now
`Promise<Awaited<ReturnType<...>> & {...}>`. Consumers
(`addLinkBlock.ts:42`, `EmbedBlock.tsx:270`) already `await` the JSON, then
cast the result as this Promise — that's a type mismatch in practice. The
type should be the awaited shape, not a Promise.

## Out of scope / verified fine

- `processBlocksToPages` is consolidated; `publishToPublication.ts:26` imports
  the new shared util. No old duplicate.
- OAuth scope `repo:pub.leaflet.publicationPage` is duplicated across
  `oauth-metadata.ts:11` and `oauth/route.ts:67` but legitimately so —
  metadata declares capabilities, the authorize call passes the scope.
- `parseStandardSitePostInput.ts` is fine as the synchronous, optimistic
  fast path; `resolveStandardSitePostUrl.ts` is the async/DB-aware fallback.
- The `did` null-filter in `get_standard_site_posts.ts:65` is necessary
  (`AtUri` parse can throw).
