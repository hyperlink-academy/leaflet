# Plan: Single Draft Leaflet for Publication Pages

## Refined prompt

Refactor publication page editor state: replace per-page leaflets + draft/published DB columns + local-only theme state with a single draft leaflet attached at the top level to the publications table, where pages, routes, and page contents are facts within that leaflet. Publish flow reads that leaflet's facts and writes to the database and AT Protocol records (top-level publication record + per-page records).

* No data migration — this is unreleased; just cut over to the new model.
* The draft leaflet attaches via a new `publications` column (uuid FK → `permission_tokens`); created at publication creation, plus lazily on first `/edit` visit. Editing stays owner-only via auth; the token is plumbing, not a sharing mechanism.
* New draft leaflets are seeded with a home page (route `/`) containing the publication description, a posts-list block, and a subscribe block.
* The entire nav is fact-backed: routes and titles are page-level facts, ordering comes from `root/page` positions, external link tabs are entities in the leaflet.
* Page CRUD becomes optimistic Replicache mutations; `/edit` is one client app with one Replicache instance; selected page is client state.
* The home page is an ordinary page with route `/`; publish requires one.
* Draft theme is `theme/*` facts on the leaflet root via the existing ThemeManager machinery; the in-progress `draft_theme` column + action are dropped.
* Editor prevents invalid nav state inline; publish also validates and fails with clear errors.
* `publication_pages` becomes published-state only, keyed by page entity ID; publish diffs facts vs rows, deletes stale rows and PDS records (including old-model rows on first publish). Public site falls back to the legacy homepage until first publish.
* Published nav state is DB-only — no publication record lexicon changes, no appview indexing of page records.
* One publish action covers pages + nav + theme for both `pub.leaflet.publication` and `site.standard.publication`; the separate theme-save action goes away. Publish fails fast and is safe to re-run (same rkeys, upserts, re-diff).
* No unpublished-changes indicator and no draft site preview in v1; images re-upload each publish (PDS dedupes by hash).
* Full cleanup: drop obsolete columns, delete dead actions/components/SWR plumbing and the `[[...route]]` edit pages.
* Scope is publication pages only — posts/newsletters keep their existing per-leaflet model.

Defaults taken where Q&A ended (flag during refinement if wrong):

* Route rules: single-segment, lowercase, url-safe slugs (`/about`), plus the reserved home route `/`.
* Page-route vs post-rkey collisions are ignored; pages win on lookup, matching current resolution order.
* Publish stays a synchronous server action for v1.

## Overview

* One leaflet per publication becomes the single source of draft truth: pages, routes, titles, ordering, external links, content blocks, and theme all live as Replicache facts in that leaflet, replacing per-page leaflets, draft columns on `publication_pages`, and React-state-only theme editing.
* The draft leaflet hangs off a new `publications` column referencing a permission token; the existing multi-page fact model (`root/page`, `page/type`, `card/block`) is extended with a few nav-level attributes (route, title, external-url).
* Page CRUD moves from server actions + SWR into Replicache mutations, making the whole edit experience optimistic, offline-friendly, and undo-capable, with one Replicache instance powering nav, content editing, and theming.
* Publish becomes a single diff-and-write action: read the leaflet's facts server-side, validate, serialize each page to a `pub.leaflet.publicationPage` record, update the publication record (theme), upsert `publication_pages` rows keyed by page entity ID, and delete rows/records for pages no longer in the draft.
* This is an unreleased feature, so the cutover is clean: no data migration, obsolete columns dropped, dead actions and the `[[...route]]` edit routes deleted.

## Expected behavior

### Editing

* Visiting `/lish/[did]/[publication]/edit` (no route segments — old deep links to `/edit/<path>` no longer resolve) loads one editor app for the whole publication; which page is being edited is client state, not URL state.
* If the publication has no draft leaflet yet (pre-existing pubs), one is created on that first visit; new publications get one at creation time. Either way it is seeded with a home page at route `/` containing the publication's description as text, a posts-list block, and a subscribe block.
* Adding, renaming, re-routing, reordering, and deleting pages — and adding/editing external link tabs — apply instantly (optimistic Replicache mutations) with no server roundtrip or page reload; reordering uses the existing fractional-index ordering on `root/page`.
* External links are nav entries in the same list as pages; they have a title and URL and no content.
* The theme editor reads and writes `theme/*` facts on the leaflet root through the existing fact-based ThemeManager machinery; theme changes preview live across the editor and persist as draft state across sessions and devices (no more lost-on-reload theme edits).
* The editor blocks invalid nav state inline: duplicate routes, malformed slugs, deleting the home page / the last page.
* Edit access remains owner-only, enforced by the existing auth check; the permission token is not a sharing mechanism.

### Publishing

* One "Publish" action publishes everything: page contents, nav (routes/titles/order/external links), and theme. The separate theme-save flow is gone.
* Publish validates the draft first (home page at `/` exists, no duplicate/malformed routes) and fails with a clear, listable error set without writing anything.
* For each content page, publish serializes facts to a `pub.leaflet.publicationPage` record and puts it to the PDS, reusing the page's existing rkey on republish (record URIs are stable across renames/re-routes because pages are keyed by entity ID).
* The publication record is updated with the current theme (`pub.leaflet.publication` theme, or derived `basicTheme` for `site.standard.publication`); both record types are supported.
* `publication_pages` rows are upserted keyed by page entity ID with the published snapshot (path, title, sort order, record, record_uri); rows whose entity no longer exists in the draft — including any stale rows from the old model — are deleted along with their PDS records.
* Publish failures fail fast; re-running publish converges (same rkeys, upserts, re-diff). Images are re-uploaded every publish; the PDS dedupes blobs by hash.

### Public site

* Serving published pages is unchanged in mechanism: nav and content come from `publication_pages` rows (DB-only; no lexicon changes, no appview indexing of page records).
* A publication that has never published from the new editor keeps the legacy fallback homepage until its first publish.
* Page routes shadow post rkeys on lookup, as today.

### Posts

* Posts/newsletters are untouched: `leaflets_in_publications`, the post editor, and the post publish flow keep their existing per-leaflet model.

## Changes

### Data model

* New attributes in the fact schema for nav state: a page route, a page title, and an external-url (marking a nav entry as an external link). Existing `root/page` ordering and `theme/*` attributes are reused as-is.
* New `publications` column holding the draft leaflet's permission token id.
* `publication_pages` is reduced to published state: add a page-entity-id key column; drop `leaflet_src`, `metadata`, and `published_metadata` (path/title/sort_order columns now ARE the published snapshot); regenerate DB types.
* Delete the uncommitted `draft_theme` migration, `savePublicationDraftTheme` action, and `draftPubTheme` utility before they ship.

### Draft leaflet lifecycle

* Publication creation also creates and seeds the draft leaflet (token, entity set, root entity, seeded home page, facts).
* The `/edit` entry point lazily creates the same for publications missing one, then renders the editor.

### Editor

* Collapse `edit/[[...route]]` into a single `edit` route: one Replicache instance scoped to the draft leaflet powers nav, page content, and theme.
* Rewrite the page-nav component to read pages/external links from facts and use new Replicache mutations for page CRUD (create page, update route/title, set external url, reorder via existing position machinery, delete page).
* Inline validation for routes/titles in the nav editor (uniqueness, slug shape, home-page protections).
* Rewire the pub theme editor (`PubThemeSetter` and provider plumbing) onto fact-based theme state, reusing the leaflet ThemeManager setters; remove its publish-on-save behavior.
* Remove the SWR page-list plumbing and the per-page server actions (`createPublicationPage`, `updatePublicationPage`, `reorderPublicationPages`, `deletePublicationPage`).

### Publish

* Rework `publishPublicationPages` to: load the draft leaflet's facts from the root entity, validate nav state, serialize each content page via the existing facts→record pipeline, put page records (stable rkeys), fold the theme facts into the publication record write (absorbing `updatePublicationTheme`), upsert `publication_pages` by entity id, and delete stale rows + PDS records.
* Update public serving and nav helpers (`publishedPageMetadata` and consumers) to read the simplified published-only columns.

### Cleanup

* Delete dead code paths: old edit-layout per-page leaflet loading, `[[...route]]` page component, obsolete actions, draft-vs-published metadata helpers, and any `get_publication_data` fields that only served draft nav.
