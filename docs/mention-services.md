# Arbitrary At-Mention Services

## Overview

Mention services allow users to configure external XRPC services that appear in the `@` mention autocomplete. When typing `@`, configured services show as tab-into-able options (like publications). Inside a service scope, search queries are proxied to the service's endpoint and results can be inserted as inline mentions.

## Lexicons

**Source**: `lexicons/src/mentionService.ts`
**Generated JSON**: `lexicons/parts/page/mention/service.json`, `lexicons/parts/page/mention/config.json`
**Build**: `lexicons/build.ts` (handles `parts.page.*` namespace output path separately from `pub.leaflet.*`)

### `parts.page.mention.service`

Record type (key: `tid`) declaring a mention service:

- `name` (string, required) — display name
- `description` (string, optional)
- `endpoint` (string, uri, required) — URL accepting `?search=<string>`, returns `{ results: [{uri, name, href?}] }`

### `parts.page.mention.config`

Singleton record (key: `literal:self`) storing a user's enabled services:

- `services` (array of at-uri strings) — AT URIs pointing to `parts.page.mention.service` records

## Database

**Migration**: `supabase/migrations/20260323000000_add_mention_services.sql`

Two tables, both storing all data in a `record` JSONB column:

- `mention_services` — PK: `uri`, indexed on `identity_did`
- `mention_service_configs` — PK: `uri`, unique on `identity_did`

## Appview Ingestion

**File**: `appview/index.ts`

Both `parts.page.mention.service` and `parts.page.mention.config` are in `filterCollections`. The `handleEvent` function validates minimally (checks `name`/`endpoint` exist for services, `services` array for configs) then upserts `{uri, identity_did, record}` into the respective table. Deletes remove by URI.

## RPC Endpoints

All registered in `app/api/rpc/[command]/route.ts`.

### `get_user_mention_services`

**File**: `app/api/rpc/[command]/get_user_mention_services.ts`

- Input: `{ did: string }`
- Reads `mention_service_configs.record` to get the services array, then fetches matching `mention_services` rows
- Returns `{ services: [{uri, name, description?, endpoint_url}] }` (extracted from JSONB)

### `proxy_mention_search`

**File**: `app/api/rpc/[command]/proxy_mention_search.ts`

- Input: `{ service_uri: string, search: string }`
- Looks up the service's `endpoint` from JSONB, appends `?search=` param
- 5-second timeout, max 50 results
- Returns `{ results: [{uri, name, href?}] }`

## Mention UI

**File**: `components/Mention.tsx`

### Types

```
Mention union includes:
  | { type: "service"; serviceUri; name; description? }     — listed in default scope, never inserted
  | { type: "service_result"; uri; name; href? }            — inserted into editor

MentionScope union includes:
  | { type: "service"; serviceUri; name }
```

### `useMentionSuggestions` hook

- **Default scope**: fetches actors + publications as before, also calls `get_user_mention_services` (cached in a ref so it doesn't re-fetch per keystroke). Services always appear in the list regardless of query.
- **Service scope**: calls `proxy_mention_search` with the search query, maps results to `service_result` mentions.

### `MentionAutocomplete` component

- Sort order: `did` → `publication` → `post` → `service` → `service_result`
- **Tab** on a `service` item enters service scope (same pattern as publication Tab-to-enter)
- **Enter** on a `service_result` selects and inserts it
- Placeholder shows `"Search {service.name}..."` when in service scope
- `ServiceEntry` component renders name + description + arrow scope button
- `ServiceSearchResult` component renders result name (like `PostResult`)
- `ScopeHeader` handles `service` scope with a back button showing "Results from {name}"

## Editor Integration

### ProseMirror Schema

**File**: `components/Blocks/TextBlock/schema.ts`

The `atMention` node now has an `href` attribute (`default: undefined`). `parseDOM` reads `data-href`, `toDOM` writes it. The `toDOM` also wraps `AtUri` parsing in a try/catch so non-AT URIs from services don't throw.

### Insertion

**File**: `app/[leaflet_id]/publish/BskyPostEditorProsemirror.tsx` — `addMentionToEditor()`

New case for `mention.type === "service_result"`: creates an `atMention` node with `{atURI: mention.uri, text: mention.name, href: mention.href}`.

### Draft Rendering

**File**: `components/Blocks/TextBlock/RenderYJSFragment.tsx`

Reads `href` from the YJS `atMention` element and passes it to `AtMentionLink`.

## Published Rendering

### Facet Schema

**File**: `lexicons/src/facet.ts`

The `atMention` facet feature now has an optional `href` property alongside `atURI`.

### Facet Serialization

**File**: `actions/publishToPublication.ts` (around line 922)

When converting `atMention` YJS nodes to facets during publish, includes `href` from the node attribute if present.

### URL Resolution

**File**: `src/utils/mentionUtils.ts` — `atUriToUrl()`

Before returning `#` for unknown collections, tries to parse the URI as an HTTP(S) URL and returns it directly if valid. Also handles the case where `AtUri` parsing throws (non-AT URIs from services).

### Link Component

**File**: `components/AtMentionLink.tsx`

Accepts optional `href` prop. If `atUriToUrl()` returns `#` (unresolvable AT URI), falls back to `href`. Wraps `AtUri` parsing in try/catch for non-AT URIs.

### Published Text Rendering

**File**: `app/lish/[did]/[publication]/[rkey]/Blocks/TextBlockCore.tsx`

Passes `isAtMention.href` from the facet to `AtMentionLink`.

## Open Items

- The `useMentionSuggestions` hook passes an empty string for `did` when calling `get_user_mention_services` — needs to be wired to the authenticated user's DID from auth context.
- No mention service implementations exist yet — the infrastructure is ready for external services to be built against the `?search=` query interface.
