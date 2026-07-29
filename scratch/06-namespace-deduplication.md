# Namespace Deduplication Plan

## Overview

When records exist in both `site.standard.*` and `pub.leaflet.*` namespaces with the same (did, rkey), queries can return duplicates or fail. This document covers:

1. **Single-record queries** using `.single()` that will error if duplicates exist
2. **List queries** that could silently return duplicate records

---

## Category 1: Single-Record Queries That Will Error

These queries use `.or()` to match either namespace but call `.single()`, which throws if multiple rows match.

| File | Lines | Current Pattern |
|------|-------|-----------------|
| `app/p/[didOrHandle]/[rkey]/page.tsx` | 26-30 | `.or(documentUriFilter(...)).single()` |
| `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` | 13-29 | `.or(documentUriFilter(...)).single()` |
| `app/api/inngest/functions/index_post_mention.ts` | 42-46, 70-74 | `.or(documentUriFilter(...)).single()` |

### Solution

Replace `.single()` with `.order().limit(1)` to prefer `site.standard`:

```typescript
// Before
.or(documentUriFilter(did, rkey))
.single()

// After - order descending so site.standard.* sorts before pub.leaflet.*
.or(documentUriFilter(did, rkey))
.order("uri", { ascending: false })
.limit(1)
.single()
```

Since `site.standard` > `pub.leaflet` alphabetically, descending order returns `site.standard` first.

---

## Category 2: List Queries Returning Duplicates

These queries return multiple records and could include the same (did, rkey) in both namespaces.

### 2a. Profile/Feed Queries

| File | Line | Query Pattern |
|------|------|---------------|
| `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts` | 30 | `.like("uri", \`at://${did}/%\`)` |
| `app/(home-pages)/reader/getReaderFeed.ts` | 29 | Subscription join |
| `feeds/index.ts` | 78, 95, 107 | Various feed queries |

### 2b. Search/Discovery Queries

| File | Line | Query Pattern |
|------|------|---------------|
| `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts` | 25 | `.contains("data->tags", ...)` |
| `app/api/rpc/[command]/search_loose_leafs.ts` | 22 | `.ilike("data->>title", ...)` |
| `app/(home-pages)/discover/getPublications.ts` | 26 | `.or()` on preferences |

### 2c. Notification Hydration

| File | Lines | Query Pattern |
|------|-------|---------------|
| `src/notifications.ts` | 185, 229, 265, 271, 370, 376 | `.in("uri", [...])` |

### Solution: Deduplication Helper

Create a helper to dedupe results by (did, rkey), preferring `site.standard`:

```typescript
// src/utils/dedupeByRkey.ts

import { AtUri } from "@atproto/syntax";

/**
 * Deduplicate records by (did, rkey), preferring site.standard namespace.
 * Records must have a `uri` field containing an AT URI.
 */
export function dedupeByRkey<T extends { uri: string }>(records: T[]): T[] {
  const seen = new Map<string, T>();

  for (const record of records) {
    const uri = new AtUri(record.uri);
    const key = `${uri.host}:${uri.rkey}`;
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, record);
    } else {
      // Prefer site.standard over pub.leaflet
      if (uri.collection.startsWith("site.standard.")) {
        seen.set(key, record);
      }
    }
  }

  return Array.from(seen.values());
}
```

### Usage

```typescript
// In getProfilePosts.ts
let { data: documents } = await supabaseServerClient
  .from("documents")
  .select(...)
  .like("uri", `at://${did}/%`);

const deduped = dedupeByRkey(documents || []);
```

---

## Implementation Checklist

### Phase 1: Fix Single-Record Queries (High Priority)

These will crash if duplicates exist:

- [ ] `app/p/[didOrHandle]/[rkey]/page.tsx` - Add `.order("uri", { ascending: false }).limit(1)` before `.single()`
- [ ] `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` - Same fix
- [ ] `app/api/inngest/functions/index_post_mention.ts` (2 locations) - Same fix

### Phase 2: Add Deduplication Helper

- [ ] Create `src/utils/dedupeByRkey.ts`

### Phase 3: Apply to List Queries (Medium Priority)

Apply `dedupeByRkey()` to results:

- [ ] `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts`
- [ ] `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts`
- [ ] `app/api/rpc/[command]/search_loose_leafs.ts`
- [ ] `app/(home-pages)/discover/getPublications.ts`
- [ ] `app/(home-pages)/reader/getReaderFeed.ts`
- [ ] `feeds/index.ts` (3 locations)
- [ ] `src/notifications.ts` (6 locations)

---

## Notes

- The `dedupeByRkey` helper assumes records have a `uri` field. Adjust type constraint if needed for different schemas.
- For publication queries, the same pattern applies - create `dedupePublicationsByRkey` if needed or make the helper generic.
- Notification hydration builds Maps keyed by URI, so deduplication there may need to happen at the Map-building stage rather than post-query.
