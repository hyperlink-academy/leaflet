# Simplification 3: Remove rawData from DocumentContext

## Summary

Replace the `rawData` escape hatch in `DocumentContextValue` with explicit fields for the specific data components need. This makes the context's contract clearer and avoids leaking database response shapes.

## Current State

`DocumentContextValue` includes a `rawData` field that exposes the entire `PostPageData` object:

```typescript
export type DocumentContextValue = {
  uri: string;
  normalizedDocument: NormalizedDocument;
  normalizedPublication: NormalizedPublication | null;
  theme: PubLeafletPublication.Theme | null;
  prevNext?: { prev?: {...}; next?: {...} };
  quotesAndMentions: QuotesAndMentions;
  rawData: NonNullable<PostPageData>;  // escape hatch
};
```

Components access `rawData` for specific relational data:

| Component | Accesses | Purpose |
|-----------|----------|---------|
| Interactions.tsx | `rawData.documents_in_publications[0]?.publications` | Subscription CTA, publication info |
| Interactions.tsx | `rawData.leaflets_in_publications[0]` | Check if user is author (edit button) |
| Interactions.tsx | `rawData.data.tags` | Display tags (should use `normalizedDocument.tags`) |
| PostPrevNextButtons.tsx | `rawData.documents_in_publications[0]?.publications` | Build prev/next URLs |
| QuoteHandler.tsx | `rawData.documents_in_publications[0]?.publications?.record` | Check showComments preference |
| PublishedPageBlock.tsx | `rawData.comments_on_documents` | Count comments per page |
| PublishedPageBlock.tsx | `rawData.document_mentions_in_bsky` | Count quotes per page |

## Desired State

Replace `rawData` with explicit fields:

```typescript
export type DocumentContextValue = {
  uri: string;
  normalizedDocument: NormalizedDocument;
  normalizedPublication: NormalizedPublication | null;
  theme: PubLeafletPublication.Theme | null;
  prevNext?: { prev?: {...}; next?: {...} };
  quotesAndMentions: QuotesAndMentions;

  // Explicit relational data (replaces rawData)
  publication: {
    uri: string;
    name: string;
    identity_did: string;
    record: PubLeafletPublication.Record | null;
    publication_subscriptions: PublicationSubscription[];
  } | null;
  comments: CommentOnDocument[];
  mentions: DocumentMentionInBsky[];
  leafletId: string | null;  // from leaflets_in_publications[0]?.leaflet
  // Note: tags already available via normalizedDocument.tags
};
```

## Files to Update

### Update Context Definition
- `contexts/DocumentContext.tsx` - Add new fields, remove rawData

### Update Context Provider
- `app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer.tsx` - Populate new fields

### Update Consumers
- `app/lish/[did]/[publication]/[rkey]/Interactions/Interactions.tsx`
- `app/lish/[did]/[publication]/[rkey]/PostPrevNextButtons.tsx`
- `app/lish/[did]/[publication]/[rkey]/QuoteHandler.tsx`
- `app/lish/[did]/[publication]/[rkey]/Blocks/PublishedPageBlock.tsx`

## Example Consumer Changes

```typescript
// Before
const { rawData } = useDocument();
let pub = rawData?.documents_in_publications[0]?.publications;
let comments = rawData.comments_on_documents.filter(...);

// After
const { publication, comments } = useDocument();
let filteredComments = comments.filter(...);
```

## Benefits

1. **Explicit contract** - Clear what data is available without inspecting PostPageData
2. **No database shape leakage** - Components don't depend on Supabase query structure
3. **Easier refactoring** - Can change database queries without breaking consumers
4. **Better TypeScript inference** - Narrower types, no deep property access chains
5. **Testability** - Easier to mock context in tests

## Migration Strategy

1. Add new explicit fields to `DocumentContextValue` alongside `rawData`
2. Update `DocumentPageRenderer` to populate new fields
3. Migrate consumers one at a time to use new fields
4. Remove `rawData` once all consumers are migrated
