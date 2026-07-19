# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Leaflet is a full-stack TypeScript web app for shared writing and social publishing, built on Bluesky (AT Protocol). Users create collaborative documents ("Leaflets") and publish them as blog posts/newsletters ("Publications") that others can follow.

## Tech Stack

- **Frontend**: React 19 + Next.js 16 (App Router, Turbopack)
- **Database**: PostgreSQL via Supabase + Drizzle ORM
- **Real-time sync**: Replicache for optimistic updates and offline support
- **Editor**: ProseMirror with Yjs CRDT
- **Social**: AT Protocol (@atproto packages) for Bluesky integration
- **Jobs**: Inngest for async serverless functions

## Commands

```bash
npm run dev                     # Start Next.js dev server (port 3000)
npm run start-appview-dev       # Start AT Protocol appview service
npm run start-feed-service-dev  # Start feed subscription service
npx tsc                         # TypeScript type checking (used in CI)
npm run generate-db-types       # Regenerate Supabase types after schema changes
npm run lexgen                  # Regenerate AT Protocol types from lexicons
```

## Architecture

### Data Flow

1. **Client mutations** go through Replicache (`src/replicache/mutations.ts`) for optimistic local updates
2. **Server actions** in `actions/` persist changes to Supabase
3. **CVR sync** reconciles client and server state via Replicache

### Document Model

Documents are composed of **blocks** (text, image, embed, code, poll, etc.). Block components live in `components/Blocks/`. Blocks are rendered in linear lists by `components/Blocks/index.tsx` and in an xy canvas by `components/Canvas.tsx`.

### AT Protocol / Bluesky

- **Lexicons** (`lexicons/`) define schemas for reading and writing records to the AT Protocol network and users' PDSs
- **Appview** (`appview/`) consumes the firehose to index published content
- **Feeds** (`feeds/`) provides subscription feeds for publications

### Lexicon Workflow

The source of truth for lexicon schemas is the TypeScript files in `lexicons/src/` (e.g. `facet.ts`, `publication.ts`, `blocks.ts`). The JSON files in `lexicons/pub/` are **generated output** — do not edit them directly, as `npm run lexgen` will overwrite them.

To add or modify a lexicon:
1. Edit the relevant source file in `lexicons/src/`
2. Run `npm run lexgen` to regenerate both the JSON schemas and the TypeScript API types in `lexicons/api/`

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `actions/` - Server actions (mutations, auth, subscriptions)
- `components/` - React components
- `src/` - Shared utilities, hooks, Replicache setup
- `appview/` - AT Protocol firehose consumer for indexing
- `feeds/` - Feed service for publication subscriptions
- `lexicons/` - AT Protocol schema definitions
- `supabase/migrations/` - Database schema

### Patterns

- **Server actions**: Export async functions with `'use server'` directive, return `Result<T>` from `src/result.ts`
- **Replicache mutations**: Named handlers in `src/replicache/mutations.ts`, keep server mutations idempotent. When adding one:
  - **Move/replace a fact with a single `assertFact` that reuses the existing fact id** — never `retractFact(id)` then `assertFact({id})`. The retract+assert pair records two undo entries with an intermediate state where the fact is gone, so undo/redo flickers the block out of existence; one `assertFact` (cardinality-`many` + explicit id) captures the old value as a single clean undo entry. Reserve `retractFact` for genuine deletions (usually paired with `deleteEntity`).
  - **Group a multi-mutation user action into one undo step** with `undoManager.withUndoGroup(async () => { ... })`, awaiting every mutation inside — undo entries are recorded asynchronously in mutator bodies, so a fire-and-forget or un-awaited mutation lands as its own separate Cmd-Z step.
  - **Pass `ignoreUndo: true`** for derived/follow-up writes that shouldn't be independently undoable (e.g. async link/image enrichment after a paste, the yjs `block/text` doc persistence).
- **React contexts**: `DocumentProvider`, `LeafletContentProvider` for page-level data
- **Inngest functions**: Async jobs in `app/api/inngest/functions/`
- **Icons**: Icon components live in `components/Icons/`. Each icon is a named export in its own file (e.g. `RefreshSmall.tsx`), imports `Props` from `./Props`, spreads `{...props}` on the `<svg>` element, and uses `fill="currentColor"` instead of hardcoded colors like `fill="black"`.
- **Popovers and menus**: Use the existing `Popover` (`components/Popover`), `Menu`, and `MenuItem` (`components/Menu`) components — do not create new popover/menu primitives. Avoid using buttons inside Popover or Modal triggers unless using a specific button component. If button is being used as trigger, always add an "asChild" prop to the Menu or Popover
- **Supabase query plans**: Never combine `.order()` on a table's own column with `.limit()` and a row-restricting embed (`!inner` or an embed-path filter) in one query — PostgREST compiles the embed into a LATERAL join that forces Postgres to walk the order column's index across the whole table probing the embed per row (this has caused repeated production full-table scans). Filter on the from-table's own indexed columns, start the query from the join table, or use a fenced SQL function for newest-N-across-a-join (examples: `get_publication_feed_docs`, `get_tag_page_document_uris`). CI enforces this via `npm run check-query-plans`; details and recipes in the `supabase-query-plans` skill (`.claude/skills/supabase-query-plans/`).
- **Default theme**: The default theme colors (accent/background/primary/highlights) are hardcoded in several disconnected places (`themeDefaults.ts`, `themeUtils.ts`, `app/globals.css` `:root`, `emails/shared.tsx`, `PubPresetPicker.tsx`) with no shared import, so they drift easily. When changing any default color, use the `update-default-theme` skill (`.claude/skills/update-default-theme/`) which lists every place to update and keeps them in sync.

### Comments

Don't describe in a comment what the code already says, and don't capture counterfactuals — comments shouldn't be hysteretic. Don't narrate what changed, what it used to do, what you considered and rejected, or why something isn't done another way. Comment only on the non-obvious why that the code itself can't convey.
