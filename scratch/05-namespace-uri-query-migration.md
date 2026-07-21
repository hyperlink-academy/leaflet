# Namespace URI Query Migration Plan

## Overview

When migrating from `pub.leaflet.*` to `site.standard.*` namespaces, we need to support querying records by either namespace. Records published by the same DID with the same rkey in `site.standard.*` are semantically equivalent to those in `pub.leaflet.*`, with `site.standard` being preferred.

This document covers two categories of changes needed:

1. **Database Query Changes** - Where URIs are used to query tables
2. **Logic/Routing Changes** - Where code branches based on collection type

---

## Category 1: Database Query Changes

These are places where a URI (containing namespace) is used to query the `documents` or `publications` tables. These need to support querying by either namespace, preferring `site.standard`.

### Files Requiring Query Changes

| File | Line | Current Query Pattern |
|------|------|----------------------|
| `app/p/[didOrHandle]/[rkey]/page.tsx` | 27-30 | `.eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))` |
| `app/p/[didOrHandle]/[rkey]/opengraph-image.ts` | 31-35 | `.eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))` |
| `app/lish/[did]/[publication]/[rkey]/page.tsx` | 15-21 | `.eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))` |
| `app/lish/[did]/[publication]/[rkey]/opengraph-image.ts` | 19-21 | `.eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))` |
| `app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer.tsx` | 40 | `getPostPageData(AtUri.make(did, ids.PubLeafletDocument, rkey))` |
| `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` | 27 | `.eq("uri", uri)` (receives hardcoded URI from callers) |

### Proposed Solution: URI Filter Helper

Create a small helper that returns the Supabase `.or()` filter string for both namespaces. This keeps each query site's select statement and typing intact:

```typescript
// src/utils/uriHelpers.ts

import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";

/**
 * Returns an OR filter string for Supabase queries to match either namespace URI.
 */
export function documentUriFilter(did: string, rkey: string): string {
  const standard = AtUri.make(did, ids.SiteStandardDocument, rkey).toString();
  const legacy = AtUri.make(did, ids.PubLeafletDocument, rkey).toString();
  return `uri.eq.${standard},uri.eq.${legacy}`;
}

export function publicationUriFilter(did: string, rkey: string): string {
  const standard = AtUri.make(did, ids.SiteStandardPublication, rkey).toString();
  const legacy = AtUri.make(did, ids.PubLeafletPublication, rkey).toString();
  return `uri.eq.${standard},uri.eq.${legacy}`;
}
```

### Migration Steps for Query Changes

1. Create `src/utils/uriHelpers.ts` with the helper functions above
2. Update each query to use `.or()` with the filter helper:

**Example migration for `page.tsx:27-30`:**
```typescript
// Before
let { data: document } = await supabaseServerClient
  .from("documents")
  .select("*, documents_in_publications(publications(*))")
  .eq("uri", AtUri.make(did, ids.PubLeafletDocument, params.rkey))
  .single();

// After
import { documentUriFilter } from "src/utils/uriHelpers";

let { data: document } = await supabaseServerClient
  .from("documents")
  .select("*, documents_in_publications(publications(*))")
  .or(documentUriFilter(did, params.rkey))
  .single();
```

**Example migration for `DocumentPageRenderer.tsx:40`:**
```typescript
// Before
getPostPageData(AtUri.make(did, ids.PubLeafletDocument, rkey).toString())

// After - update getPostPageData signature to accept (did, rkey) instead of uri
getPostPageData(did, rkey)

// Then inside getPostPageData.ts, use the filter:
.or(documentUriFilter(did, rkey))
```

### Handling "Prefer site.standard" Requirement

When both records exist, we want `site.standard` to win. Options:

1. **Order results and take first**: Add `.order("uri", { ascending: false })` since `site.standard` > `pub.leaflet` alphabetically, then `.limit(1)`
2. **Post-query filter**: Fetch both, prefer the one with `site.standard` in the URI
3. **Accept either**: If records are semantically identical, it may not matter which we get

For most read paths, option 3 is likely fine since normalization handles the data format differences.

---

## Category 2: Logic/Routing Changes

These are places where code branches based on the collection type string. These need to recognize both `pub.leaflet.*` and `site.standard.*` as valid.

### Files Requiring Logic Changes

| File | Lines | Current Check |
|------|-------|---------------|
| `app/lish/uri/[uri]/route.ts` | 22, 43 | `uri.collection === "pub.leaflet.publication"` / `"pub.leaflet.document"` |
| `app/api/pub_icon/route.ts` | 39, 53 | `uri.collection === "pub.leaflet.document"` / `"pub.leaflet.publication"` |
| `src/utils/mentionUtils.ts` | 17, 20 | `uri.collection === "pub.leaflet.publication"` / `"pub.leaflet.document"` |
| `components/AtMentionLink.tsx` | 19-20 | `aturi.collection === "pub.leaflet.publication"` / `"pub.leaflet.document"` |
| `components/Blocks/TextBlock/schema.ts` | 152-159 | Multiple collection type checks |
| `app/lish/[did]/[publication]/[rkey]/Interactions/Comments/commentAction.ts` | 183-194 | Collection type checks for mentions |
| `actions/publishToPublication.ts` | 883, 897 | Collection type checks |
| `app/api/inngest/functions/index_post_mention.ts` | 40, 57-59 | Uses `ids.PubLeafletDocument` when creating URIs |

### Proposed Solution: Type Guard Helpers

Create helper predicates that recognize both namespaces:

```typescript
// src/utils/collectionHelpers.ts (or add to normalize.ts)

import { ids } from "lexicons/api/lexicons";

export function isDocumentCollection(collection: string): boolean {
  return (
    collection === ids.PubLeafletDocument ||
    collection === ids.SiteStandardDocument
  );
}

export function isPublicationCollection(collection: string): boolean {
  return (
    collection === ids.PubLeafletPublication ||
    collection === ids.SiteStandardPublication
  );
}

// For cases where we need to know which specific namespace
export function isSiteStandardCollection(collection: string): boolean {
  return collection.startsWith("site.standard.");
}

export function isPubLeafletCollection(collection: string): boolean {
  return collection.startsWith("pub.leaflet.");
}
```

### Migration Steps for Logic Changes

1. Create the helper predicates
2. Replace direct string comparisons with helper calls:

**Example migration for `mentionUtils.ts:17-20`:**
```typescript
// Before
if (uri.collection === "pub.leaflet.publication") {
  return `/lish/${uri.host}/${uri.rkey}`;
} else if (uri.collection === "pub.leaflet.document") {
  return `/lish/uri/${encodeURIComponent(atUri)}`;
}

// After
if (isPublicationCollection(uri.collection)) {
  return `/lish/${uri.host}/${uri.rkey}`;
} else if (isDocumentCollection(uri.collection)) {
  return `/lish/uri/${encodeURIComponent(atUri)}`;
}
```

---

## Files Already Handled (No Changes Needed)

These files already use normalization and don't query by hardcoded namespace:

- `appview/index.ts` - Firehose consumer handles both namespaces
- `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts` - Uses `.like("uri", \`at://${did}/%\`)` (namespace-agnostic)
- `app/(home-pages)/discover/getPublications.ts` - Fetches all, uses normalization
- `app/(home-pages)/reader/getReaderFeed.ts` - Uses normalization
- `src/notifications.ts` - Uses normalization for hydration

---

## Implementation Order

1. **Create helper utilities first**
   - `src/utils/uriHelpers.ts` - URI construction and filter helpers
   - `src/utils/collectionHelpers.ts` (or add to existing normalize.ts) - type guards

2. **Update logic/routing checks** (Category 2)
   - These are simpler string replacement changes
   - Start with `mentionUtils.ts` and `AtMentionLink.tsx` (used in rendering)
   - Then `app/lish/uri/[uri]/route.ts` and `app/api/pub_icon/route.ts`

3. **Update database queries** (Category 1)
   - Start with `getPostPageData.ts` since it's the core data fetcher
   - Update page components to use the new pattern
   - Update opengraph-image routes

4. **Test thoroughly**
   - Ensure records in both namespaces are findable
   - Verify that site.standard takes precedence when both exist
   - Check that routing/rendering works for both namespace URIs

---

## Notes

- The `unstable_validate` route is excluded from this migration per requirements
- All changes should maintain backward compatibility - existing `pub.leaflet.*` URIs must continue to work
- New records should be created in `site.standard.*` namespace (handled by publish actions, not this migration)
