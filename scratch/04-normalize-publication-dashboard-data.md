# Simplification 4: Pre-normalize Publication Dashboard Data

## Summary

Move document normalization into `get_publication_data` RPC handler so consumers don't repeatedly call `normalizeDocumentRecord()` on raw data. This mirrors the pattern we established in `getPostPageData`.

## Current State

`get_publication_data` returns raw database shapes, and consumers normalize documents inline:

```typescript
// In PublishedPostsLists.tsx
.sort((a, b) => {
  const aRecord = normalizeDocumentRecord(a.documents?.data);
  const bRecord = normalizeDocumentRecord(b.documents?.data);
  // sorting logic
})
.map((doc) => {
  const postRecord = normalizeDocumentRecord(doc.documents.data);
  if (!postRecord) return null;
  // render logic
})
```

```typescript
// In DraftList.tsx
.map((l) => {
  let normalizedDocData = null;
  if (l.documents?.data) {
    normalizedDocData = normalizeDocumentRecord(l.documents.data);
    if (!normalizedDocData) return null;
  }
  // ...
})
```

**Problems:**
1. Same documents normalized multiple times (in sort, then in map)
2. Normalization scattered across consumer components
3. Raw `Json` types leak into components requiring casts
4. `useNormalizedPublicationRecord()` exists but no equivalent for documents

## Desired State

`get_publication_data` pre-normalizes all documents and returns clean types:

```typescript
// In get_publication_data.ts
return {
  result: {
    publication: {
      ...publication,
      // Pre-normalized documents
      documents: publication.documents_in_publications
        .map(dip => {
          const normalized = normalizeDocumentRecord(dip.documents?.data);
          if (!normalized) return null;
          return {
            uri: dip.documents.uri,
            record: normalized,
            commentsCount: dip.documents.comments_on_documents[0]?.count || 0,
            mentionsCount: dip.documents.document_mentions_in_bsky[0]?.count || 0,
          };
        })
        .filter(Boolean),
      // Pre-normalized drafts (leaflets without published docs)
      drafts: publication.leaflets_in_publications
        .filter(l => !l.documents)
        .filter(l => !l.archived)
        .map(l => ({
          leaflet: l.leaflet,
          title: l.title,
          permission_tokens: l.permission_tokens,
        })),
    },
    leaflet_data,
  }
};
```

Consumers become simple:

```typescript
// In PublishedPostsLists.tsx
const { data } = usePublicationData();
const { documents } = data.publication;

{documents
  .sort((a, b) => new Date(b.record.publishedAt).getTime() - new Date(a.record.publishedAt).getTime())
  .map((doc) => (
    <PostItem key={doc.uri} doc={doc} />
  ))}
```

## Files to Update

### Update RPC Handler
- `app/api/rpc/[command]/get_publication_data.ts` - Pre-normalize documents, restructure return type

### Update Provider (derive types)
- `app/lish/[did]/[publication]/dashboard/PublicationSWRProvider.tsx` - Export derived types from RPC return type

### Update Consumers
- `app/lish/[did]/[publication]/dashboard/PublishedPostsLists.tsx` - Use pre-normalized documents
- `app/lish/[did]/[publication]/dashboard/DraftList.tsx` - Use pre-normalized drafts
- `app/lish/[did]/[publication]/dashboard/settings/PostOptions.tsx` - Minor cleanup
- `app/lish/createPub/UpdatePubForm.tsx` - If accessing raw data

## Type Strategy

Derive all types from the RPC return type (same pattern as DocumentContext):

```typescript
// In PublicationSWRProvider.tsx
export type GetPublicationDataReturnType = Awaited<ReturnType<typeof get_publication_data.handler>>;
export type PublicationData = NonNullable<GetPublicationDataReturnType["result"]>;
export type PublishedDocument = PublicationData["publication"]["documents"][number];
export type Draft = PublicationData["publication"]["drafts"][number];
```

## Migration Strategy

1. Add new normalized fields to `get_publication_data` return value alongside existing fields
2. Update `PublicationSWRProvider` to export derived types
3. Migrate consumers one at a time to use new fields
4. Remove old raw fields once all consumers migrated

## Benefits

1. **Single normalization point** - Documents normalized once in RPC handler
2. **Clean types** - No `Json` casts in consumer components
3. **Simpler consumers** - Just map over pre-normalized arrays
4. **Consistent pattern** - Matches `getPostPageData` / `DocumentContext` approach
5. **Better performance** - No redundant normalization in sort + map

## Considerations

- SWR mutations need to work with new shape
- `mutatePublicationData` helper may need updates
- Some consumers build complex nested structures for `LeafletList` - may need careful migration
