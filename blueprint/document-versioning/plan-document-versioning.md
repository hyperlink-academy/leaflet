# Document Versioning (fact-closure snapshots)

Give every leaflet a version history: **explicitly created, named versions**, a read-only viewer for any past version, and restore. A version is a **snapshot of the document's fact closure** — the same raw facts the editor already reads — stored in a side table.

Automatic/periodic snapshots are deliberately **out of scope for now**. The design keeps the door open for them (see "Adding automatic cuts later"), but nothing in v1 observes the edit stream.

## Overview

- A leaflet today is `permission_token → permission_token_rights → entity_set → entities → facts`, with `permission_tokens.root_entity` anchoring the recursive closure walk (`get_facts(root)`). All document content — blocks, ordering, images, theme, pages — is facts.
- **Nothing is currently recoverable.** Facts are mutated in place and hard-deleted on retract; Replicache mutations are applied and discarded; every `Y.Doc` runs with GC on. Versioning must introduce its own storage — no history can be reconstructed retroactively.
- A **version** = the serialized fact array returned by `get_facts(root)` at a point in time, stored as one row in `document_versions` as plain jsonb. `snapshot_path` is the escape hatch for offloading oversized snapshots to a Supabase storage bucket later.
- Versions are cut by a **server action, on an explicit user action** — never from the push path. Push serializes on a per-token advisory lock (`pg_advisory_xact_lock` in `app/api/rpc/[command]/push.ts`) and flush is the hottest path in the app; with explicit-only cuts, versioning touches neither. Nothing is added to the write path at all.
- **Viewing is nearly free**: `ReplicacheProvider` already supports `initialFactsOnly` + `disablePull`, which constructs no Replicache client, no realtime channel, and no yjs provider — every reader hook falls back to a static fact array. The version viewer reuses the editor's own component tree, not a parallel renderer.
- **Blobs** get deferred deletion + a reference index, replacing today's synchronous `storage.remove()` in `removeBlock`/`removeGalleryImage`.
- Storing **raw facts** (not the published-record format) is load-bearing: it's what makes both the viewer and restore possible. See "Why raw facts" below.

## Constraints discovered in the codebase

These drove every decision here; each is a real finding, not an assumption.

1. **No server-side history of any kind exists.** Flush does `onConflictDoUpdate` on `facts` (`src/replicache/cachedServerMutationContext.ts:293-311`); retract issues real `DELETE`s, including of inbound reference facts pointing at a deleted entity (`:327-345`). No mutation log, no tombstones, no history tables. `facts.updated_at` and `facts.version` exist but are **vestigial** — no trigger and no writer touches them; the real row version used by CVR sync is Postgres `xmin`.

2. **The push path is latency-critical and serialized per permission token.** Everything added to flush lands inside `pg_advisory_xact_lock` on a 32-bit hash of `token.id` (`app/api/rpc/[command]/push.ts:96-100`) — the same `tokenHash` the AI routes reuse; any server-side write to a live leaflet should take the identical lock. Note it's per *token*, not per leaflet: two tokens over the same entity set don't serialize against each other.

3. **`block/text` facts hold full encoded ydoc state**, base64'd in jsonb, re-asserted on a 300ms debounce (`components/Blocks/TextBlock/useCollabText.tsx`). These dominate snapshot bytes.

4. **Yjs GC is on everywhere** — all 22 `new Y.Doc(` call sites use the default constructor. Deleted text content is *gone* from stored encodings; prior revisions are not reconstructible from a `block/text` value.

5. **You cannot restore text by writing an old `block/text` value back.** Yjs merge is monotone: the old encoding is a subset of the current one, so the flush-time `Y.mergeUpdates` (`cachedServerMutationContext.ts:269-291`) and every live client would merge it with newer state and the restore would silently no-op. A fresh ydoc doesn't fix this either — live clients apply pulled values into their *existing* in-memory doc via `Y.applyUpdate`, so an unrelated doc's content union-merges with (duplicates into) the current text. Restoring text means applying a **compensating update**: new ops on top of the *current* encoding that transform it into the old content, so the result is a superset of the current state and merges cleanly everywhere. `editYjsText` (`app/api/ai/lib.tsx:512-573`) already does exactly this shape server-side. See "Restore".

6. **The read path already has a no-Replicache branch, exercised in production.** `useEntity`, `useBlocks`, `useCanvasBlocksWithType`, `usePageFootnotes` and the theme hooks all compute a fallback from `initialFacts` via `scanIndexLocal` / `getBlocksWithTypeLocal` (`src/replicache/utils.ts`, `src/replicache/getBlocks.ts`), and `useSubscribe` no-ops on a null `rep`. `app/(app)/(identity)/(home-pages)/(writer)/home/LeafletList/LeafletCardReplicache.tsx` renders real blocks, canvases, and themes this way today.

7. **Read-only rendering is already a first-class mode.** `useEntitySetContext().permissions.write` (`components/EntitySetProvider.tsx`) gates ~40 editing affordances, and `components/Blocks/TextBlock/index.tsx:57-78` renders `RenderedTextBlock` (pure `useEntity` + `RenderYJSFragment`, no ProseMirror) when write permission is absent, the block is `preview`, or the client is schema-stale.

8. **Two existing primitives to reuse for restore:** `src/utils/copyLeafletContents.ts` (entity-id remapping + image storage copy — `actions/createNewLeafletFromTemplate.ts` is a thin wrapper over it) and `src/utils/createLeaflet.ts` (whole leaflet created in one CTE statement with pre-generated uuids and an optional caller-supplied `tailCte`).

9. **Image blobs are immutable but eagerly deleted.** `src/utils/addImage.ts` names each upload with a fresh v7 uuid and bakes the full public URL into the fact's `data.src` — replacing an image always writes a new file, never overwrites. But `removeBlock` (`src/replicache/mutations.ts:514`), `removeGalleryImage` (`:874`), and `app/api/ai/blocks/[blockId]/route.ts:70` call `storage.remove()` synchronously the moment a block is deleted. Meanwhile `actions/deleteLeaflet.ts` never touches storage, so whole-leaflet deletion already leaks blobs permanently.

10. **Query-plan rule applies to the versions list.** "Newest N versions for this leaflet" is exactly the `.order()` + `.limit()` + row-restricting embed shape that `npm run check-query-plans` flags. Filter on `document_versions`' own indexed columns or use a fenced SQL function.

11. **Scale.** Typical docs are tens to low-hundreds of facts; the perf stress fixture (3000 blocks, `perf/docs.json`) is ~9,000–12,000 facts. Snapshots of ordinary docs are tens–hundreds of KB, and successive versions are highly similar.

12. **`get_facts` returns bare fact rows, in nondeterministic order.** It's `RETURNS SETOF facts` — a recursive CTE with hash-deduped `UNION` and no `ORDER BY` — so sort by fact id before hashing the closure. It carries no `entities` rows, and `facts.entity → entities.id` is `ON DELETE CASCADE`: restoring a deleted block means re-creating its `entities` row first (its id is in the snapshot's facts; its `set` comes from `permission_token_rights.entity_set`, since every entity in a leaflet shares the one set). Entities with zero facts of their own (bare reference targets) never appear in the closure at all — `copyLeafletContents.ts:41-43` handles this same blind spot. Also, the generated `database.types.ts` types `get_facts` without `author_did` (the column postdates the types block), so a serializer typed off it silently drops authorship — hand-fix the types.

## Why raw facts, and not the alternatives

**Snapshot raw facts, not `processBlocksToPages` output.** The published-record format (`src/utils/factsToPagesRecord.ts`) is lossy and has **no reverse path** — nothing in the codebase converts records back to facts. A record-based version could be viewed but never restored, and viewing it would go through the *published* renderer (`PostContent.tsx`), a parallel component tree that must be kept in sync with the editor by hand (the whole reason the `mirror-editor-block-styles` skill exists). Raw facts give a pixel-identical view for free and keep restore possible.

Alternatives considered and rejected:

| Approach | Why not |
|---|---|
| **Append-only fact history** (Datomic-style assert/retract rows, or Postgres temporal triggers) | Elegant fit for the EAV model, poor fit for the write path: doubles work *inside* the advisory lock on every fact write, and the 300ms text debounce fills history with near-duplicate multi-KB ydoc encodings unless text is special-cased — at which point you've built snapshots anyway for the attribute that holds all the bytes. Extra rows in `facts` would also bloat `facts_entity_idx` and the partial reference index the recursive closure walk depends on. Worth revisiting only if fine-grained per-fact attribution becomes a hard requirement. |
| **Mutation log / event sourcing** | Worst fit. Replay requires mutator semantics frozen forever (ours evolve, and push already silently skips errored mutations). And since `assertFact` carries full fact values — including full ydoc states — the "log" degenerates into fact history with extra machinery. Google Docs makes this work because their ops are tiny OT deltas; ours aren't. |
| **Yjs-native snapshots** (`Y.snapshot` + `gc: false`) | The only route to char-level attributed diffs, but requires `gc: false` for each doc's whole life (deleted content retained forever, unbounded growth), the y-prosemirror tooling is officially experimental with known binding bugs, and it covers *only text* — block structure, ordering, images, and theme live in facts. Industry survey found essentially nobody runs this at scale: Liveblocks, PartyKit, AFFiNE, and Evernote all store periodic full encodings instead. At most a future add-on for text diff views. |
| **Content-addressed facts / structural sharing** (Dolt-style) | The right *upgrade path*, not the starting point. Store facts by content hash and let a version be a list of hashes, so unchanged facts are stored once across all versions. It retrofits cleanly onto this design without changing the read or restore paths — which is exactly why the version format should stay "an array of facts" rather than a derived rendering. Skip for v1; plain snapshots are cheap at our doc sizes. |

## Cut policy

Versions are cut **only in response to a user action**. There is no timer, no edit-stream observer, and no background cutting job.

- **Named**: the user saves a version, with a title. This is the whole feature in v1.
- **Safety versions**, cut immediately before a **restore**. Restore is the one destructive operation here, and cutting first is what makes "restore = a new version on top, never rewind" true. Still user-triggered — it's part of the restore action, not a background policy.
- Skip the cut if the closure hash is unchanged since the latest version, so repeated saves with no edits in between don't accumulate identical rows.

Confluence is the closest precedent for explicit-only versioning: continuous autosave for durability, but a version is only cut on publish — specifically so a collaborative session doesn't produce hundreds of micro-versions. The broader industry pattern (Notion's 10-min/2-min-idle cadence, Figma's 30-min checkpoints, Tiptap's 30s-if-changed) all decouple user-visible versions from the durability layer, which is what we're doing too; we're just choosing the user as the trigger instead of a clock.

**Consequences of explicit-only**, worth being clear-eyed about:

- Users who never save a version get no history, and there is no recovery from an accidental deletion or a bad paste. Undo remains the only safety net for unsaved work, and it's client-side and in-memory (`src/undoManager.ts`) — lost on reload or any Replicache client rebuild.
- Version volume is bounded by user behavior rather than by wall-clock, so **retention and thinning are not needed in v1**. Storage growth is self-limiting.
- The blob-lifetime problem does not go away: an explicit version referencing a since-deleted image has exactly the same requirements as an automatic one. The blob work below is unchanged.

### Adding automatic cuts later

If we do want them, the seam is small and this design doesn't foreclose it: flush marks the leaflet dirty, and a debounced Inngest job (keyed per leaflet, so an editing session coalesces into one cut) calls the same `cutVersion` with `kind: "auto"`. That would then bring retention/thinning with it. Everything else — schema, viewer, restore, blob GC — is already shaped to accept it.

## Expected behavior

- A **Versions** entry in the editor's actions list opens a modal listing every saved version of the leaflet, newest first, each showing its name and the date it was saved.
- From that modal the user can save a new version, giving it a name. Nothing is versioned unless they do.
- A version can be **viewed** read-only at a stable URL, rendering exactly as the editor would have rendered it — same blocks, same canvas layout, same theme, same fonts — with all editing affordances absent.
- While viewing a version, the header clearly says so — in the same place a publication draft is marked `DRAFT` — showing the version's name and date, plus a control to return to the current document.
- A version can be **restored** in place (a safety version is cut first, as part of the restore) or **opened as a new leaflet** (a pure fork, zero risk to the original).
- Restoring never truncates history: the pre-restore state remains viewable.
- Images in old versions keep rendering as long as the version is retained, including images deleted from the live document. If a blob is genuinely gone, the block degrades to its thumbhash placeholder rather than a broken image.
- Versions are immutable; the viewer page is indefinitely cacheable.

## Changes

### Schema

- New `document_versions` table: `id uuid pk`, `token uuid → permission_tokens.id ON DELETE CASCADE`, `created_at timestamptz`, `kind text` (`named` | `pre_restore` — leave room for `auto`), `name text null`, `author_did text null`, `closure_hash text`, `snapshot jsonb null`, `snapshot_path text null` (future escape hatch: a Supabase storage object for oversized snapshots), `fact_count int`, `byte_size int`. Index on `(token, created_at desc)`.
- Keying on `token` (not `root_entity`) is deliberate: the editor URL *is* the edit token, the modal is write-gated, and `deleteLeaflet` removes the `permission_tokens` row so versions cascade away with the doc. Accepted limitation: a doc's other tokens (e.g. view tokens over the same entity set) can't see versions cut via the edit token.
- New `document_version_blob_refs`: `(version uuid → document_versions.id ON DELETE CASCADE, path text)`, indexed both ways. Populated at cut time from the closure's `image`-type facts.
- New `blob_cleanup_queue`: `(path text pk, queued_at timestamptz)`.
- Mirror all three in `drizzle/schema.ts` and hand-add the blocks to `supabase/database.types.ts` (wholesale regen breaks tsc — see the `generate-db-types` drift note).

### Cutting versions

- `src/versioning/cutVersion.ts` (a plain lib, not a `"use server"` file — every exported async function in one of those is client-callable): `get_facts(root)` → **sort by fact id** (constraint 12: output order is planner-dependent) → hash → bail if unchanged → insert row → insert blob refs. Select `author_did` explicitly or fix the stale `get_facts` block in `database.types.ts` first, or the serializer drops it silently.
- A thin server action in `actions/` wraps it, checks write permission on the token, resolves the session DID for `author_did`, and returns a `Result<T>`.
- **No changes to the push path, flush, or Inngest.** Versioning is entirely off the write path.
- The client needs no Replicache mutation for this — versions aren't synced document state. A pending in-flight save can be reflected with local UI state; the versions list is fetched (SWR) rather than mirrored into Replicache.
- One ordering caveat: the fact closure is read from Postgres, so a version saved mid-typing captures the last *pushed* state, not unflushed local edits (`block/text` persists on a 300ms debounce). Flush pending mutations client-side before invoking the action, or accept the small window.

### UI

An entry in the editor's actions list opens a modal listing saved versions, with a control to save a new one.

**The action entry.** The actions list is duplicated in two files and both need the entry:

- Desktop: `LeafletSidebar` in `app/(app)/(editor)/[leaflet_id]/Sidebar.tsx`
- Mobile: `LeafletFooter` in `app/(app)/(editor)/[leaflet_id]/Footer.tsx`

Place it next to `<PostSettings />` in both. Entries are not `MenuItem`s — each is a component rendering `ActionButton` (`components/ActionBar/ActionButton.tsx`, a `forwardRef` taking `icon` / `label` / `secondary` / `active`). Gate on `entity_set.permissions.write`, as both lists already do.

```jsx
<Modal asChild sheetOnMobile className="max-w-sm w-full"
  title="Version History"
  trigger={<ActionButton icon={<HistorySmall />} label="Versions" />}>
```

Per CLAUDE.md, the trigger must be a real button component (never a raw `<button>`) and `asChild` is required. `ActionButton` forwards its ref, so this works. Two notes:

- **No existing action uses `Modal` as its trigger** — every current one uses `Popover` or `Menu`. `Modal` (`components/Modal.tsx`) supports `trigger` + `asChild` identically, so this is a natural extension rather than a new pattern, but it is the first of its kind.
- `ActionButton` reads `PopoverOpenContext` to hold the sidebar expanded while its popover is open. `Modal` doesn't provide that context, so a collapsed sidebar won't stay expanded behind the dialog. Harmless for a centered modal; worth a look during implementation.

**Modal API** (`components/Modal.tsx`): `{ className, open, onOpenChange, asChild, trigger, title, children, actionButton, sheetOnMobile, sheetClassName }`. There is **no `onClose`** — use `onOpenChange`. A close button is built in. Set `sheetOnMobile` so it renders as a `MobileSheet` on small screens; `components/Blocks/ImageAltModal.tsx` is the best example of that plus an input and enter-to-submit.

**Modal contents.**

- A list container (`flex flex-col gap-2`) of version rows, newest first. There is no shared row component — each surface hand-rolls one (the `domain-settings` skill exists because of exactly this drift). Follow `MembershipRow` (`app/(app)/(identity)/(home-pages)/(writer)/settings/MembershipsTab.tsx` — the writer settings page, not the pub dashboard) for a title + timestamp + action row: `opaque-container`, timestamp in `text-tertiary text-sm`.
- Each row: the version **name**, its **date**, and per-row actions (**View**, and later **Restore** / **Open as new leaflet**). "View" navigates to the viewer route, which leaves the editor and so closes the modal.
- Empty state via `components/EmptyState.tsx` (`container="opaque"`) — with explicit-only versioning, a first-time user always lands here, so the copy should explain that versions are saved manually.
- **Save control**: a name `Input` (`components/Input.tsx`, which is unstyled by design — add `className="input-with-border"`) plus a `ButtonPrimary`. Follow the form pattern in `.../settings/domains/AddDomainForm.tsx`: a `<form onSubmit>` with `preventDefault`, `autoFocus` on the input, and a footer `flex justify-end` with the submit button disabled while empty or in flight, showing `DotLoader` while saving. (One quirk not to copy: `AddDomainForm` only clears its loading state on the error path.) This can live in the modal's `actionButton` slot or as a footer row; a footer row is simpler since it needs a text field.

**Naming and dates.** `created_at` is already in the schema, set server-side — the client never supplies it. Render it with `useLocalizedDate` (`src/hooks/useLocalizedDate.ts`, Luxon + request-header timezone, hydration-safe) for the absolute date, and optionally `timeAgo` (`src/utils/timeAgo.ts`) for a relative label on recent entries. `name` stays nullable in the schema; if the user leaves it blank, fall back to rendering the formatted date as the row title rather than storing a generated string, so the name column means "the user named this."

**Data fetching.** Copy the server-action-as-SWR-fetcher pattern from `ShareOptions/index.tsx`:

```ts
let { data: versions, mutate } = useSWR(`versions-${permission_token.id}`, () => getVersions(permission_token.id));
```

Fetch lazily when the modal opens rather than on every editor load. After a successful save, `mutate()` to refresh the list. Versions are not Replicache-backed — they aren't synced document state, so no mutation and no mirror entry.

**New icon.** There is no clock or history icon in `components/Icons/`. Add `HistorySmall.tsx` (24x24, named export, `Props` from `./Props`, `fill="currentColor"`). Existing near-misses if you'd rather not draw one: `RefreshSmall` (circular arrows, reads as revert), `ArchiveSmall`, `BlockCalendarSmall`.

### Viewer

- Route `app/(app)/(editor)/[leaflet_id]/versions/[version_id]/page.tsx` (RSC): load the version row by primary key **and verify `version.token` matches the `[leaflet_id]` param** (the token in the URL is the capability; a bare version uuid must not grant access), else `notFound()`. No `get_facts` recursion, no Replicache. The parent `(editor)` layout is safe to inherit — it's synchronous and fetches nothing — but the live page's `force-dynamic` / `force-no-store` config is per-page, so the version page declares its own cacheable config (versions are immutable).
- Render the **same provider stack as `Leaflet.tsx`** — `ReplicacheProvider` with `initialFactsOnly disablePull initialFacts={snapshotFacts}`, plus `EntitySetProvider` and `ThemeProvider` — but pass a synthetic permission token whose `permission_token_rights[0]` has `write: false`. `initialFactsOnly` is the load-bearing prop: it alone skips client construction (`src/replicache/index.tsx:140`); `disablePull` only turns off the poke channel and pull interval, so a viewer passing only `disablePull` would build a live Replicache client. That one flag puts every block into its existing read-only branch: no ProseMirror mount, no toolbars, no drag handles. `EntitySetProvider` needs the entity_set id, so the synthetic token must carry a matching one.
- Supply an empty `PageSWRDataProvider` / static leaflet data context, as the home-page preview cards do.
- Multi-page docs and canvases work unchanged (page navigation is UI state over the same fact reads).
- Add a `readOnly` assertion or context flag: with `rep === null`, stray `rep?.mutate` calls silently no-op rather than erroring, so nothing currently catches a component that half-works.
- Image components in the viewer should fall back to the thumbhash on load error.
- Guard `components/Pages/index.tsx:25` — it dereferences `rootPage` non-optionally (`useCardBorderHidden(rootPage.id)`), so a snapshot missing its `root/page` fact crashes the viewer; make it optional before shipping.
- Segment metadata inherits: `[leaflet_id]/icon.tsx` and `opengraph-image.tsx` apply to descendant routes, so each version view runs `icon.tsx`'s `get_facts` over the *live* doc. Acceptable, or stub metadata files in the `versions` segment.
- Custom domains can't reach the route: `middleware.ts:155-168` matches custom-domain paths exactly and rewrites everything else to `/not-found`. The viewer is main-domain-only unless middleware learns the `/versions/` sub-path.
- Precedent caveat: the home-card path (`LeafletCardReplicache`) proves the hook fallbacks, but it renders `BlockPreview` / preview-canvas components — not the full `Pages` tree — and only for logged-in viewers, fetching facts via the depth-3-capped `get_facts_for_roots`. Static facts under the real editor tree is well-supported by the fallbacks but unexercised in production; budget verification time, and never reuse the depth-capped RPC for versions.

**Header indicator and getting back.** The viewer must state plainly that it is showing a saved version, in the same header surface where a publication draft is marked `DRAFT`, and offer a way back to the live document.

- The `DRAFT` pill lives in `components/Pages/PublicationMetadata.tsx`, passed as the `pubLink` slot of `PostHeaderLayout` (`.../[rkey]/PostHeader/PostHeader.tsx`). It's a hand-rolled chip — `font-bold text-tertiary px-1 h-[20px] text-sm flex place-items-center bg-border-light rounded-md` — sitting in normal flow at the top of the first page's content, above the title. Not fixed, not floating, not a toolbar. It's mounted from `components/Pages/Page.tsx:99` under `props.first && pageType === "doc" && !publicationPage`.
- **Do not add the version indicator as a pill inside `PublicationMetadata`.** That component early-returns `if (!pub) return null`, so it renders nothing at all for a standalone leaflet — and versioning applies to every leaflet, not just publication drafts. Add a sibling at the same mount point in `Page.tsx`, so it lands in the same place visually but renders independently of publication data.
- There is **no shared badge/pill/chip component** in the codebase — `MembersBadge` and `Toast` are the nearest things and neither is generic, and the `DRAFT` pill's classes are unique to its call site. Either copy those classes or factor a small shared chip and adopt it in both places; copying is consistent with how the codebase does this today, but it's one more instance of the drift the `domain-settings` skill warns about.
- The banner carries the version's **name and date** alongside the label, so the reader knows *which* version they're looking at without going back to the modal.
- **Back to current** belongs in this banner, not in the action rail. The viewer's synthetic token has `write: false`, and both the desktop `Sidebar` and mobile `Footer` are gated on `entity_set.permissions.write` — so the editing chrome won't render in the viewer at all (which is what we want), leaving the banner as the only navigation surface. A link to `/[leaflet_id]` returns to the live document; use `GoBackSmall` for consistency with `BackToPubButton`.
- **Canvas leaflets need a decision**: `Canvas.tsx` renders `PublicationMetadata` inside an info popover rather than in page flow, so a banner placed at the `Page.tsx` mount point won't appear there. The indicator and the way back both need somewhere visible on a canvas.

### Restore

Restore is a **forward operation**: it never rewinds history, and it never changes entity ids. Stable ids are what make cross-version diffing possible later — a version diff is a fact-set diff keyed by `(entity, attribute)`, and for text, all versions share one yjs op history.

- Cut a `pre_restore` safety version first.
- **"Open as new leaflet"**: reuse `copyLeafletContents` (entity-id remap + image storage copy) with `createLeaflet`'s CTE shape, feeding it snapshot facts instead of live ones. Note it currently copies `block/text` values verbatim, so a fork and its source share yjs client ids — fine for a pure fork, fix if forks can ever merge back.
- **In-place restore** diffs the snapshot against the live closure and applies server-side through `cachedServerMutationContext` + `flush()`, the way the AI block routes do (`app/api/ai/blocks/route.ts:69-79` — the codebase's only precedent for a server route mutating a live leaflet). Take the same advisory lock push uses (constraint 2 — reuse the identical `tokenHash`) and `broadcastPoke(rootEntity)` after flush so clients re-pull.
  - **Surviving text blocks get a compensating update, not an overwrite** (constraint 5). Load the *current* encoding into a `Y.Doc`, decode the snapshot encoding into a scratch doc, then in one `transact`: delete the fragment's children and insert `.clone()`s of the snapshot fragment's children (clones are unintegrated copies with formatting and attributes intact — `editYjsText`'s plaintext replace isn't sufficient; restore must preserve marks and structure). Encode full state and assert. The result is a superset of the current stored state, so the flush-time merge yields exactly it, and live clients' `Y.applyUpdate` converges to the restored content instead of union-duplicating.
  - **Deleted blocks resurrect with their original entity ids** from the snapshot: re-create the `entities` row first (id from the snapshot's facts, `set` from `permission_token_rights.entity_set`; flush's entity insert is `onConflictDoNothing`, so this is idempotent), then write the snapshot's `block/text` encoding verbatim — there's no merge base and no live client holds that doc. Insert order is `entities → facts`, per the CTE chain in `copyLeafletContents.ts:96-112`.
  - **Everything else** (ordering references, alignment, images, theme) is a plain upsert/retract diff, reusing existing fact ids where the fact survives.
  - Stamp restored and resurrected text docs with `stampDocSchemaVersion` (`components/Blocks/TextBlock/schemaVersion.tsx`) — `createYjsText` doesn't, and unstamped docs read as version 0.

Accepted tradeoffs, stated so they don't surprise anyone:

- **Concurrent typing during restore can splice in.** Yjs keeps a concurrent insert alive inside a deleted range, and the peer-to-peer yjs channel (`src/yjsRealtime.tsx`) flows client-to-client without touching the server; the advisory lock plus poke narrows the window but can't close it. The result is still convergent, and the `pre_restore` version covers the pathological case.
- **Encodings only grow.** Each restore appends compensating ops and tombstones rather than removing content, so `block/text` values ratchet up slowly across repeated restores. Harmless at our doc sizes.

### Blobs

Turn blob deletion from synchronous into garbage collection:

- **Stop deleting in the mutation.** `removeBlock` (`mutations.ts:514`), `removeGalleryImage` (`:874`), and `app/api/ai/blocks/[blockId]/route.ts:70` enqueue into `blob_cleanup_queue` instead of calling `storage.remove()`. This is a strict improvement independent of versioning — **it fixes two existing bugs**: undo of an image-block deletion currently restores the facts but not the blob, and the remove fires during mutation execution inside `runOnServer`, before flush and before the push transaction commits — a rolled-back or rejected push has already deleted the blob.
- **Index refs at cut time** (above) so GC never has to scan snapshots.
- **GC job** (Inngest, periodic): a queued path is deletable only when no live fact references it *and* no `document_version_blob_refs` row points at it. Both are indexed lookups; the live-fact recheck guards undo and duplication races. The live-fact check must be global across all leaflets, not scoped to one: `copyAsset` falls back to *sharing* the source blob when a storage copy fails (`copyLeafletContents.ts:122-135`), so one path can be referenced by multiple documents.
- Deleting a version (or a whole leaflet) cascades its blob refs away, making any newly-orphaned blob collectable on the next pass. So blob storage stays bounded by the versions actually kept — and if automatic cuts plus retention arrive later, that continues to hold with no changes here.
- This also gives us, for the first time, a sound way to collect the blobs that `deleteLeaflet` has always leaked — provided `deleteLeaflet` enqueues its closure's image paths before deleting them. The queue is GC's only input; paths nothing enqueues stay leaked.

Scope note: only `minilink-user-assets` is affected. Link-preview thumbnails (`url-previews`) are never deleted, so snapshot refs stay valid. Bluesky post embeds reference external CDNs (they can rot, but that's the same exposure published posts already have). PDS blobs from publishing aren't part of draft fact closures. Members-only gated copies (`src/utils/gatedDocumentImages.ts`) are derived from the originals, so snapshots should — and naturally do — reference the ungated originals.

## Risks and open questions

- **Schema drift over time.** Today's components must render facts written months ago. We mostly have this property already (old leaflets never migrate), but versioning makes it a hard requirement: an attribute rename or data-shape change would need snapshot upgraders or tolerant readers. The yjs `schemaVersion` stamp (`components/Blocks/TextBlock/schemaVersion.tsx`) already handles this for text by degrading to read-only rendering — which is exactly what a viewer wants.
- **Live-ish blocks in a viewer.** Polls read votes from live tables, so an old version shows *current* votes (arguably correct — decide explicitly). Bluesky post blocks embed their data in the fact, so they render as-of-snapshot. Buttons and page links should get the existing `preview` treatment so they can't navigate out of the viewer.
- **No safety net for unsaved work** is the accepted tradeoff of explicit-only versioning (see "Consequences" above). If support requests for lost work show up, that's the signal to add automatic cuts.
- **Discoverability carries more weight than usual.** Nothing else creates versions, so if the actions-list entry goes unnoticed the feature is inert for that user. Worth watching once it ships.
- **The `entity_sets` orphan leak** (deleting a leaflet deletes its entities but not the `entity_sets` row) is pre-existing and untouched here; worth noting since restore creates new sets.

## Suggested phasing

1. **Blob deferral alone** — queue instead of `storage.remove()`, plus the GC job with only the live-fact check. Ships a real bug fix, no versioning dependency, and de-risks the largest unknown.
2. **Cut + store versions** — schema, `cutVersion`, the server action, blob refs. Verify snapshot sizes against real documents.
3. **UI** — the `HistorySmall` icon, the actions-list entry in both Sidebar and Footer, and the modal with the versions list and save form.
4. **Viewer** — the read-only route, linked from each row in the modal, with the saved-version header banner and its back-to-current link.
5. **Restore** — "open as new leaflet" first (pure fork, low risk), then in-place restore with the compensating-update mechanics.

Deferred: automatic cuts, and the retention/thinning that would come with them.
