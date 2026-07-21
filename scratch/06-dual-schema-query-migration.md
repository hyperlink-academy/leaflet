# Dual-Schema Query Migration Plan

## Overview

Migrate all document and publication queries to support both `pub.leaflet.*` and `site.standard.*` URI schemas. Records with the same DID and rkey under either schema are semantically equivalent, with `site.standard` preferred.

## Key Changes

1. **Use `.or()` filters** - Single query matching either URI schema
2. **Remove `.single()`** - Queries may return multiple results (one per schema)
3. **Update normalize functions** - Accept arrays, pick preferred result (site.standard)
4. **FlatMap nested relations** - Combine relations from all results

---

## Step 1: Update `src/utils/uriHelpers.ts`

Add helper for publication name/URI queries:

```typescript
import { AtUri } from "@atproto/syntax";
import { ids } from "lexicons/api/lexicons";

// Existing - keep as-is
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

// NEW: For querying publication by name OR either URI schema
export function publicationNameOrUriFilter(did: string, name: string): string {
  const standard = AtUri.make(did, ids.SiteStandardPublication, name).toString();
  const legacy = AtUri.make(did, ids.PubLeafletPublication, name).toString();
  return `name.eq.${name},uri.eq.${standard},uri.eq.${legacy}`;
}
```

---

## Step 2: Update `src/utils/normalizeRecords.ts`

Add array-accepting versions that pick the preferred result:

```typescript
import { ids } from "lexicons/api/lexicons";

// ... existing imports and functions ...

/**
 * Given an array of document query results, pick the preferred one (site.standard)
 * and normalize it. Returns null if no valid results.
 */
export function pickAndNormalizeDocument<T extends { uri: string; data: unknown }>(
  results: T[] | null | undefined
): { row: T; normalized: NormalizedDocument } | null {
  if (!results || results.length === 0) return null;

  // Prefer site.standard URI
  const preferred = results.find(r => r.uri.includes(ids.SiteStandardDocument))
    ?? results[0];

  const normalized = normalizeDocumentRecord(preferred.data);
  if (!normalized) return null;

  return { row: preferred, normalized };
}

/**
 * Given an array of publication query results, pick the preferred one (site.standard)
 * and normalize it. Returns null if no valid results.
 */
export function pickAndNormalizePublication<T extends { uri: string; record: unknown }>(
  results: T[] | null | undefined
): { row: T; normalized: NormalizedPublication } | null {
  if (!results || results.length === 0) return null;

  // Prefer site.standard URI
  const preferred = results.find(r => r.uri.includes(ids.SiteStandardPublication))
    ?? results[0];

  const normalized = normalizePublicationRecord(preferred.record);
  if (!normalized) return null;

  return { row: preferred, normalized };
}
```

---

## Step 3: Update Publication Queries

### `app/lish/[did]/[publication]/page.tsx`

**Before:**
```typescript
let uri;
if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
  uri = AtUri.make(did, "pub.leaflet.publication", publication_name).toString();
}

let [{ data: publication }, { data: profile }] = await Promise.all([
  supabaseServerClient
    .from("publications")
    .select(`*,
      publication_subscriptions(*),
      documents_in_publications(documents(
        *,
        comments_on_documents(count),
        document_mentions_in_bsky(count)
      ))
    `)
    .eq("identity_did", did)
    .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
    .single(),
  agent.getProfile({ actor: did }),
]);

const record = normalizePublicationRecord(publication?.record);
```

**After:**
```typescript
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizePublication, normalizeDocumentRecord } from "src/utils/normalizeRecords";

let [{ data: publications }, { data: profile }] = await Promise.all([
  supabaseServerClient
    .from("publications")
    .select(`*,
      publication_subscriptions(*),
      documents_in_publications(documents(
        *,
        comments_on_documents(count),
        document_mentions_in_bsky(count)
      ))
    `)
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name)),
  agent.getProfile({ actor: did }),
]);

const result = pickAndNormalizePublication(publications);
if (!result) return <PubNotFound />;

const { row: publication, normalized: record } = result;

// FlatMap nested relations
const subscriptions = (publications ?? []).flatMap(p => p.publication_subscriptions ?? []);
const documents = (publications ?? [])
  .flatMap(p => p.documents_in_publications ?? [])
  .filter(dip => dip.documents)
  .map(dip => ({
    ...dip.documents,
    normalized: normalizeDocumentRecord(dip.documents.data),
  }))
  .filter(d => d.normalized);
```

### `app/lish/[did]/[publication]/layout.tsx`

**Before:**
```typescript
uri = AtUri.make(did, "pub.leaflet.publication", publication_name).toString();
// ... query with hardcoded URI
```

**After:**
```typescript
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizePublication } from "src/utils/normalizeRecords";

const { data: publications } = await supabaseServerClient
  .from("publications")
  .select("*")
  .eq("identity_did", did)
  .or(publicationNameOrUriFilter(did, publication_name));

const result = pickAndNormalizePublication(publications);
if (!result) return notFound();

const { row: publication, normalized } = result;
```

### `app/api/rpc/[command]/get_publication_data.ts`

**Before:**
```typescript
let uri;
if (/^(?!\.$|\.\.S)[A-Za-z0-9._:~-]{1,512}$/.test(publication_name)) {
  uri = AtUri.make(did, "pub.leaflet.publication", publication_name).toString();
}
let { data: publication, error } = await supabase
  .from("publications")
  .select(`*,
    documents_in_publications(documents(...)),
    publication_subscriptions(...),
    publication_domains(*),
    leaflets_in_publications(...)
  `)
  .or(`name.eq."${publication_name}", uri.eq."${uri}"`)
  .eq("identity_did", did)
  .single();
```

**After:**
```typescript
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizePublication, normalizeDocumentRecord } from "src/utils/normalizeRecords";

let { data: publications, error } = await supabase
  .from("publications")
  .select(`*,
    documents_in_publications(documents(...)),
    publication_subscriptions(...),
    publication_domains(*),
    leaflets_in_publications(...)
  `)
  .eq("identity_did", did)
  .or(publicationNameOrUriFilter(did, publication_name));

const result = pickAndNormalizePublication(publications);
if (!result) return { result: { publication: null, documents: [], drafts: [], leaflet_data: [] } };

const { row: publication } = result;

// FlatMap nested relations from all results
const allSubscriptions = (publications ?? []).flatMap(p => p.publication_subscriptions ?? []);
const allDomains = (publications ?? []).flatMap(p => p.publication_domains ?? []);
const allLeaflets = (publications ?? []).flatMap(p => p.leaflets_in_publications ?? []);
const allDocumentsInPubs = (publications ?? []).flatMap(p => p.documents_in_publications ?? []);

// Pre-normalize documents
const documents = allDocumentsInPubs
  .map(dip => {
    if (!dip.documents) return null;
    const normalized = normalizeDocumentRecord(dip.documents.data);
    if (!normalized) return null;
    return {
      uri: dip.documents.uri,
      record: normalized,
      // ... other fields
    };
  })
  .filter(Boolean);
```

### `app/lish/[did]/[publication]/generateFeed.ts`

**Before:**
```typescript
uri = AtUri.make(did, "pub.leaflet.publication", publication_name).toString();
```

**After:**
```typescript
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizePublication } from "src/utils/normalizeRecords";

const { data: publications } = await supabaseServerClient
  .from("publications")
  .select(...)
  .eq("identity_did", did)
  .or(publicationNameOrUriFilter(did, publication_name));

const result = pickAndNormalizePublication(publications);
```

### `app/lish/[did]/[publication]/icon/route.ts`

Same pattern as above.

---

## Step 4: Update Document Queries

### `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts`

**Before:**
```typescript
let { data: document } = await supabaseServerClient
  .from("documents")
  .select(`
    data, uri,
    comments_on_documents(*, bsky_profiles(*)),
    documents_in_publications(publications(*,
      documents_in_publications(documents(uri, data)),
      publication_subscriptions(*))
    ),
    document_mentions_in_bsky(*),
    leaflets_in_publications(*)
  `)
  .or(documentUriFilter(did, rkey))
  .single();

if (!document) return null;

const normalizedDocument = normalizeDocumentRecord(document.data);
```

**After:**
```typescript
import { documentUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizeDocument, normalizePublicationRecord } from "src/utils/normalizeRecords";

let { data: documents } = await supabaseServerClient
  .from("documents")
  .select(`
    data, uri,
    comments_on_documents(*, bsky_profiles(*)),
    documents_in_publications(publications(*,
      documents_in_publications(documents(uri, data)),
      publication_subscriptions(*))
    ),
    document_mentions_in_bsky(*),
    leaflets_in_publications(*)
  `)
  .or(documentUriFilter(did, rkey));

const result = pickAndNormalizeDocument(documents);
if (!result) return null;

const { row: document, normalized: normalizedDocument } = result;

// FlatMap nested relations from all document results
const allDocs = documents ?? [];

const comments = allDocs.flatMap(d => d.comments_on_documents ?? []);
const mentions = allDocs.flatMap(d => d.document_mentions_in_bsky ?? []);
const leaflets = allDocs.flatMap(d => d.leaflets_in_publications ?? []);

// FlatMap through to publications and their subscriptions
const documentsInPublications = allDocs.flatMap(d => d.documents_in_publications ?? []);
const publications = documentsInPublications
  .map(dip => dip.publications)
  .filter(Boolean);

const subscriptions = publications.flatMap(p => p.publication_subscriptions ?? []);

// Use first publication for context
const rawPub = publications[0];
const normalizedPublication = normalizePublicationRecord(rawPub?.record);
```

### `app/p/[didOrHandle]/[rkey]/page.tsx`

**Before:**
```typescript
let { data: document } = await supabaseServerClient
  .from("documents")
  .select("*, documents_in_publications(publications(*))")
  .or(documentUriFilter(did, params.rkey))
  .single();
```

**After:**
```typescript
import { documentUriFilter } from "src/utils/uriHelpers";
import { pickAndNormalizeDocument } from "src/utils/normalizeRecords";

let { data: documents } = await supabaseServerClient
  .from("documents")
  .select("*, documents_in_publications(publications(*))")
  .or(documentUriFilter(did, params.rkey));

const result = pickAndNormalizeDocument(documents);
if (!result) return <NotFound />;

const { row: document, normalized } = result;
```

### `app/p/[didOrHandle]/[rkey]/opengraph-image.ts`

Same pattern - remove `.single()`, use `pickAndNormalizeDocument`.

### `app/lish/[did]/[publication]/[rkey]/opengraph-image.ts`

Same pattern.

---

## Step 5: Update `app/lish/uri/[uri]/route.ts`

This file already uses `isDocumentCollection()` and `isPublicationCollection()` helpers. However, queries still use exact URI match. Update to handle both schemas:

**For publication lookup:**
```typescript
// Current - exact match
.eq("uri", atUriString)

// Updated - if we have a specific URI, also check the alternate schema
// Or accept that exact URI lookups only find that exact URI
```

For this route, exact URI matching is probably correct since we're resolving a specific AT URI. No changes needed.

---

## Summary of Files to Update

| File | Changes |
|------|---------|
| `src/utils/uriHelpers.ts` | Add `publicationNameOrUriFilter()` |
| `src/utils/normalizeRecords.ts` | Add `pickAndNormalizeDocument()`, `pickAndNormalizePublication()` |
| `app/lish/[did]/[publication]/page.tsx` | Use new helpers, remove `.single()`, flatMap relations |
| `app/lish/[did]/[publication]/layout.tsx` | Use new helpers, remove `.single()` |
| `app/api/rpc/[command]/get_publication_data.ts` | Use new helpers, remove `.single()`, flatMap relations |
| `app/lish/[did]/[publication]/generateFeed.ts` | Use new helpers, remove `.single()` |
| `app/lish/[did]/[publication]/icon/route.ts` | Use new helpers, remove `.single()` |
| `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` | Remove `.single()`, use `pickAndNormalizeDocument()`, flatMap |
| `app/p/[didOrHandle]/[rkey]/page.tsx` | Remove `.single()`, use `pickAndNormalizeDocument()` |
| `app/p/[didOrHandle]/[rkey]/opengraph-image.ts` | Remove `.single()`, use `pickAndNormalizeDocument()` |
| `app/lish/[did]/[publication]/[rkey]/opengraph-image.ts` | Remove `.single()`, use `pickAndNormalizeDocument()` |

---

## Testing Checklist

- [ ] Document with `pub.leaflet.document` URI can be viewed
- [ ] Document with `site.standard.document` URI can be viewed
- [ ] Publication with `pub.leaflet.publication` URI shows all documents
- [ ] Publication with `site.standard.publication` URI shows all documents
- [ ] Comments display correctly for documents under either URI
- [ ] Mentions/backlinks display for documents under either URI
- [ ] Publication subscriptions merge correctly
- [ ] OpenGraph images generate for both URI schemas
- [ ] RSS feeds work for publications under either URI
