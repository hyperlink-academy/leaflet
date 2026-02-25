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
npm run lint                    # ESLint
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
- **Replicache mutations**: Named handlers in `src/replicache/mutations.ts`, keep server mutations idempotent
- **React contexts**: `DocumentProvider`, `LeafletContentProvider` for page-level data
- **Inngest functions**: Async jobs in `app/api/inngest/functions/`
