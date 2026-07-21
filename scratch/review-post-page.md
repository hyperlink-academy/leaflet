# Post Page Migration Review: site.standard.* Schema Support

## Overview

This review covers the migration of post page components from the old `PostPageContext` to the new split context approach using `DocumentContext` and `LeafletContentContext`. The migration aims to support the new `site.standard.*` schema alongside the existing `pub.leaflet.*` schema.

### Key Changes
- **DELETED**: `PostPageContext.tsx`
- **ADDED**: `contexts/DocumentContext.tsx` and `contexts/LeafletContentContext.tsx`
- **New Hooks**: `useDocument()` and `useLeafletContent()`

---

## New Context Files

### contexts/DocumentContext.tsx

**Path**: `/home/jared/work/2025/leaflet/contexts/DocumentContext.tsx`

**Assessment**: Well-designed

The DocumentContext provides:
- `uri` - Document URI
- `normalizedDocument` - Pre-normalized document data
- `normalizedPublication` - Pre-normalized publication data
- `theme` - Theme settings
- `prevNext` - Navigation links
- `quotesAndMentions` - Combined quotes and mentions
- `publication` - Full publication context
- `comments` - Comments on document
- `mentions` - Document mentions
- `leafletId` - Associated leaflet ID

**Exported Types**:
- `CommentOnDocument`
- `DocumentMention`
- `QuotesAndMentions`
- `PublicationContext`

**Hooks**:
- `useDocument()` - Throws if not within provider
- `useDocumentOptional()` - Returns null if not within provider

### contexts/LeafletContentContext.tsx

**Path**: `/home/jared/work/2025/leaflet/contexts/LeafletContentContext.tsx`

**Assessment**: Well-designed

The LeafletContentContext provides:
- `pages` - Array of document pages (linear or canvas)

**Note**: The `Page` type is derived from `PubLeafletContent.Main["pages"][number]` which may need updating when `site.standard.content` pages are also supported.

---

## File-by-File Review

### 1. page.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/page.tsx`

**Changes**:
- Uses `normalizeDocumentRecord` to get normalized data for metadata generation
- Delegates to `DocumentPageRenderer` for actual rendering

**Assessment**: CORRECT

The page.tsx is a server component that:
1. Properly uses `normalizeDocumentRecord` for metadata extraction
2. Accesses `docRecord.title` and `docRecord.description` correctly
3. Falls back to the new `DocumentPageRenderer` for rendering

**No issues found.**

---

### 2. DocumentPageRenderer.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/DocumentPageRenderer.tsx`

**Changes**:
- Imports `DocumentProvider` and `LeafletContentProvider`
- Uses `getDocumentPages` helper to extract pages from normalized document
- Wraps the component tree with both providers

**Assessment**: CORRECT

Key observations:
1. Correctly uses `document.normalizedDocument` to get normalized data
2. Uses `getDocumentPages(record)` to extract pages - this is the proper abstraction
3. Provides context values correctly:
   ```tsx
   <DocumentProvider value={document}>
     <LeafletContentProvider value={{ pages }}>
   ```
4. Passes `document.theme` to `PublicationThemeProvider`

**No issues found.**

---

### 3. PostPages.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/PostPages.tsx`

**Changes**:
- Uses `useLeafletContent()` to get pages
- Uses `useDocument()` to get `quotesAndMentions`
- Still receives `document` as a prop for backward compatibility

**Assessment**: MOSTLY CORRECT with minor observations

**Observations**:
1. **Line 225-227**: Uses both context and props:
   ```tsx
   const { pages } = useLeafletContent();
   const { quotesAndMentions } = useDocument();
   const record = document?.normalizedDocument;
   ```
   This is a transitional pattern - `document` is still passed as a prop but context is also used.

2. **Line 280**: Uses `document.comments_on_documents` directly:
   ```tsx
   comments={
     pubRecord?.preferences?.showComments === false
       ? []
       : document.comments_on_documents
   }
   ```
   This could use `useDocument().comments` for consistency, but the current approach works since `document` is the same data.

**Potential improvement**: Could fully migrate to context and remove the `document` prop, but this is a minor issue.

---

### 4. PostPrevNextButtons.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/PostPrevNextButtons.tsx`

**Changes**:
- Uses `useDocument()` to get `prevNext` and `publication`

**Assessment**: CORRECT

```tsx
const { prevNext, publication } = useDocument();
```

Clean migration. No issues.

---

### 5. PostHeader/PostHeader.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/PostHeader/PostHeader.tsx`

**Changes**:
- Still receives `data` (PostPageData) as a prop
- Uses `document?.normalizedDocument` for record access
- Calls updated `getQuoteCount` and `getCommentCount` with arrays

**Assessment**: CORRECT but uses hybrid approach

**Observations**:
1. **Line 26**: Correctly accesses normalized document:
   ```tsx
   const record = document?.normalizedDocument;
   ```

2. **Line 28**: Still accesses raw relational data:
   ```tsx
   let pub = props.data?.documents_in_publications[0]?.publications;
   ```
   This could be simplified to use `useDocument().publication`.

3. **Lines 90-91**: Correctly passes arrays to count functions:
   ```tsx
   quotesCount={getQuoteCount(document?.quotesAndMentions || []) || 0}
   commentsCount={getCommentCount(document?.comments_on_documents || []) || 0}
   ```

**Note**: The file accesses `document.leaflets_in_publications[0]` (line 55) which could use `useDocument().leafletId` instead.

---

### 6. LinearDocumentPage.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/LinearDocumentPage.tsx`

**Changes**:
- Uses `useLeafletContent()` to get pages
- Passes arrays to `getCommentCount` and `getQuoteCount`

**Assessment**: CORRECT

**Observations**:
1. **Line 48**: Uses context for pages:
   ```tsx
   const { pages } = useLeafletContent();
   ```

2. **Lines 90-91**: Correctly passes arrays:
   ```tsx
   commentsCount={getCommentCount(document.comments_on_documents, pageId) || 0}
   quotesCount={getQuoteCount(document.quotesAndMentions, pageId) || 0}
   ```

3. **Line 54**: Debug log should be removed:
   ```tsx
   console.log("prev/next?: " + preferences.showPrevNext);
   ```

**Issue**: Debug console.log on line 54 should be removed before merging.

---

### 7. CanvasPage.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/CanvasPage.tsx`

**Changes**:
- Passes arrays to `getCommentCount` and `getQuoteCount`

**Assessment**: CORRECT

**Observations**:
1. **Lines 72-73**: Correctly passes arrays:
   ```tsx
   commentsCount={getCommentCount(document.comments_on_documents, pageId)}
   quotesCount={getQuoteCount(document.quotesAndMentions, pageId)}
   ```

No issues found.

---

### 8. Blocks/PublishedPageBlock.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/Blocks/PublishedPageBlock.tsx`

**Changes**:
- Uses `useDocument()` for theme, uri, comments, and mentions
- Removed `useContext(PostPageContext)` pattern

**Assessment**: CORRECT

**Key changes**:
1. **Line 158**: Theme access:
   ```tsx
   const { theme } = useDocument();
   ```

2. **Lines 197-203**: Interactions component uses context:
   ```tsx
   const { uri: document_uri, comments: allComments, mentions } = useDocument();
   let comments = allComments.filter(
     (c) => (c.record as PubLeafletComment.Record)?.onPage === props.pageId,
   ).length;
   let quotes = mentions.filter((q) =>
     q.link.includes(props.pageId),
   ).length;
   ```

**Note**: The `mentions` filtering uses `.link` property which exists on `DocumentMention` type. This is correct.

---

### 9. Interactions/Interactions.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/Interactions/Interactions.tsx`

**Changes**:
- Uses `useDocument()` instead of `useContext(PostPageContext)`
- Updated `getQuoteCount` and `getCommentCount` signatures
- Updated `EditButton` to take explicit props instead of whole document

**Assessment**: CORRECT

**Key changes**:

1. **Lines 113, 171**: Uses `useDocument()`:
   ```tsx
   const { uri: document_uri, quotesAndMentions, normalizedDocument } = useDocument();
   ```

2. **Line 124**: Tags access:
   ```tsx
   const tags = normalizedDocument.tags;
   ```

3. **Lines 333-334**: Updated function signature:
   ```tsx
   export function getQuoteCount(quotesAndMentions: { uri: string; link?: string }[], pageId?: string) {
     return getQuoteCountFromArray(quotesAndMentions, pageId);
   }
   ```

4. **Lines 358-366**: Updated function signature:
   ```tsx
   export function getCommentCount(comments: CommentOnDocument[], pageId?: string) {
   ```

5. **Lines 369-387**: EditButton takes explicit props:
   ```tsx
   const EditButton = (props: {
     publication: { identity_did: string } | null;
     leafletId: string | null;
   }) => {
   ```

**Note**: The `EditButton` refactor improves type safety by making dependencies explicit.

---

### 10. Interactions/Quotes.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/Interactions/Quotes.tsx`

**Changes**:
- Uses `useDocument()` for `uri`
- Uses `useLeafletContent()` for `pages`

**Assessment**: CORRECT

**Key changes**:

1. **Lines 68, 181**: Uses context:
   ```tsx
   const { uri: document_uri } = useDocument();
   ```

2. **Lines 182, 184-192**: Uses LeafletContentContext:
   ```tsx
   const { pages } = useLeafletContent();

   let page: PubLeafletPagesLinearDocument.Main | undefined = (
     props.position.pageId
       ? pages.find(
           (p) =>
             (p as PubLeafletPagesLinearDocument.Main).id ===
             props.position.pageId,
         )
       : pages[0]
   ) as PubLeafletPagesLinearDocument.Main;
   ```

**Observation**: The page finding logic works correctly for both single-page and multi-page documents.

---

### 11. QuoteHandler.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/QuoteHandler.tsx`

**Changes**:
- Uses `useDocument()` for `uri` and `publication`

**Assessment**: CORRECT

**Key changes**:

1. **Line 150**: Uses context:
   ```tsx
   const { uri: document_uri, publication } = useDocument();
   ```

2. **Line 168**: Accesses publication record:
   ```tsx
   let pubRecord = publication?.record;
   ```

Clean migration with no issues.

---

### 12. useHighlight.tsx

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/useHighlight.tsx`

**Changes**: None - this file doesn't use context

**Assessment**: N/A

This file uses URL params and Zustand state, not context. No migration needed.

---

### 13. opengraph-image.ts

**Path**: `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/[rkey]/opengraph-image.ts`

**Changes**:
- Uses `normalizeDocumentRecord` to access cover image

**Assessment**: CORRECT

**Key changes**:

1. **Lines 7, 25**: Uses normalize helper:
   ```tsx
   import { normalizeDocumentRecord } from "src/utils/normalizeRecords";
   // ...
   const docRecord = normalizeDocumentRecord(jsonToLex(document.data));
   if (docRecord?.coverImage) {
   ```

Server component correctly uses the normalization utilities.

---

## Summary of Findings

### Issues to Address

1. **LinearDocumentPage.tsx (Line 54)**: Debug `console.log` should be removed:
   ```tsx
   console.log("prev/next?: " + preferences.showPrevNext);
   ```

### Minor Observations (Non-blocking)

1. **PostPages.tsx**: Uses both context and props for some data - this is fine for the transition but could be cleaned up later.

2. **PostHeader.tsx**: Still accesses `documents_in_publications[0]?.publications` directly when `useDocument().publication` is available.

3. **LeafletContentContext.tsx**: The `Page` type is derived from `PubLeafletContent` - may need updating when `site.standard.content` pages are supported.

### Correct Patterns Observed

1. All components correctly use `useDocument()` for:
   - `uri` (document URI)
   - `normalizedDocument` (typed document data)
   - `normalizedPublication` (typed publication data)
   - `theme`
   - `prevNext`
   - `quotesAndMentions`
   - `publication`
   - `comments`
   - `mentions`
   - `leafletId`

2. All components correctly use `useLeafletContent()` for:
   - `pages` (document pages array)

3. Function signature updates are correct:
   - `getQuoteCount(quotesAndMentions[], pageId?)` - takes array directly
   - `getCommentCount(comments[], pageId?)` - takes array directly

4. Type exports from `DocumentContext` are properly used:
   - `CommentOnDocument` type is imported where needed

### Type Safety Assessment

The migration maintains type safety by:
1. Using `NormalizedDocument` and `NormalizedPublication` types
2. Exporting helper types like `CommentOnDocument`
3. Making function dependencies explicit (e.g., `EditButton` props)

### Migration Completeness

- All files listed have been migrated from `PostPageContext` to the new context pattern
- The deleted `PostPageContext.tsx` is no longer imported anywhere in these files
- The new contexts are properly provided in `DocumentPageRenderer.tsx`

---

## Recommendations

1. **Required**: Remove debug console.log in LinearDocumentPage.tsx
2. **Optional**: Consider fully migrating PostHeader.tsx to use `useDocument().publication` instead of accessing `documents_in_publications` directly
3. **Future**: Update LeafletContentContext Page type when site.standard.content is supported
