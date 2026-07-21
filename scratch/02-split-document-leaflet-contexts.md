# Simplification 2: Split DocumentContext and LeafletContentContext

## Summary

Separate the current `PostPageContext` into two contexts:
1. **DocumentContext** - Always available, contains document metadata
2. **LeafletContentContext** - Only provided when content type is `pub.leaflet.content`

This moves the content-type check from ~15 scattered components to a single branching point.

## Current State

Components throughout the tree do their own format checking:

```typescript
// In LinearDocumentPage.tsx, PostPages.tsx, Quotes.tsx, etc.
const record = document?.normalizedDocument;
const pages = record ? getDocumentPages(record) : undefined;
if (!document || !record || !pages) return null;
```

This pattern is:
- Repetitive (~15 call sites)
- Error-prone (easy to forget the check)
- Not future-proof (each site needs updating for new content types)

## Desired State

### New Context Definitions

```typescript
// contexts/DocumentContext.tsx

type DocumentContextValue = {
  uri: string;
  normalizedDocument: NormalizedDocument;
  normalizedPublication: NormalizedPublication | null;
  theme: Theme | null;
  prevNext?: { prev?: { uri: string; title: string }; next?: { uri: string; title: string } };
  quotesAndMentions: QuotesAndMentions;
};

const DocumentContext = createContext<DocumentContextValue | null>(null);

export function useDocument() {
  const ctx = useContext(DocumentContext);
  if (!ctx) throw new Error("useDocument must be within DocumentProvider");
  return ctx;
}
```

```typescript
// contexts/LeafletContentContext.tsx

type LeafletContentContextValue = {
  pages: Page[];
};

const LeafletContentContext = createContext<LeafletContentContextValue | null>(null);

export function useLeafletContent() {
  const ctx = useContext(LeafletContentContext);
  if (!ctx) throw new Error("useLeafletContent must be within LeafletContentProvider");
  return ctx;
}

// Optional: non-throwing version for components that handle both cases
export function useLeafletContentOptional() {
  return useContext(LeafletContentContext);
}
```

### Branching Point

```typescript
// In DocumentPageRenderer.tsx or similar top-level component

function DocumentRenderer({ document }: { document: PostPageData }) {
  const { normalizedDocument, normalizedPublication } = document;

  if (!normalizedDocument) {
    return <NotFound />;
  }

  const documentContextValue = {
    uri: document.uri,
    normalizedDocument,
    normalizedPublication,
    theme: document.theme,
    prevNext: document.prevNext,
    quotesAndMentions: document.quotesAndMentions,
  };

  // Branch based on content type
  if (hasLeafletContent(normalizedDocument)) {
    return (
      <DocumentContext.Provider value={documentContextValue}>
        <LeafletContentContext.Provider value={{ pages: normalizedDocument.content.pages }}>
          <LeafletDocumentPage />
        </LeafletContentContext.Provider>
      </DocumentContext.Provider>
    );
  }

  // Future: handle other content types
  // if (hasSomeOtherContent(normalizedDocument)) {
  //   return <SomeOtherDocumentPage />;
  // }

  return <UnsupportedContentType type={normalizedDocument.content?.$type} />;
}
```

### Simplified Child Components

```typescript
// Before
function LinearDocumentPage({ document }: Props) {
  const record = document?.normalizedDocument;
  const pages = record ? getDocumentPages(record) : undefined;
  if (!document || !record || !pages) return null;

  // use pages...
}

// After
function LinearDocumentPage() {
  const { pages } = useLeafletContent();  // guaranteed non-null
  const { theme, normalizedPublication } = useDocument();

  // use pages directly...
}
```

## Files to Update

### New Files
- `contexts/DocumentContext.tsx`
- `contexts/LeafletContentContext.tsx`

### Update Branching Points
- `app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer.tsx`
- `app/lish/[did]/[publication]/[rkey]/page.tsx`
- `app/p/[didOrHandle]/[rkey]/page.tsx`

### Simplify Consumers (remove getDocumentPages checks)
- `app/lish/[did]/[publication]/[rkey]/LinearDocumentPage.tsx`
- `app/lish/[did]/[publication]/[rkey]/PostPages.tsx`
- `app/lish/[did]/[publication]/[rkey]/PostHeader/PostHeader.tsx`
- `app/lish/[did]/[publication]/[rkey]/Interactions/Quotes.tsx`
- `components/Blocks/PublicationPollBlock.tsx`
- `components/Canvas.tsx`
- `components/Pages/PublicationMetadata.tsx`

## Benefits

1. **Single point of format checking** - Content type is checked once, not 15 times
2. **Type safety** - Components using `useLeafletContent()` know pages is non-null
3. **Future-proof** - New content types get their own branch and components
4. **Explicit contracts** - Components declare their content-type dependency via which context they consume
5. **Better errors** - Throwing in `useLeafletContent()` catches developer mistakes (wrong component in wrong context)

## Migration Strategy

1. Create the new context files
2. Update `DocumentPageRenderer` to be the branching point
3. Migrate child components one at a time, replacing `getDocumentPages` checks with `useLeafletContent()`
4. Remove `getDocumentPages` calls from the codebase
5. Eventually deprecate the old `PostPageContext` pattern
