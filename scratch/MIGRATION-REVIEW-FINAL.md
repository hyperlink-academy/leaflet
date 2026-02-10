# site.standard.* Schema Migration - Final Review Report

## Executive Summary

This migration adds support for the `site.standard.*` lexicon schema alongside the existing `pub.leaflet.*` schema. The approach uses a **read-time normalization layer** that converts both formats to a canonical `site.standard.*` format for consumption.

**Overall Assessment: GOOD with several issues to address before merging.**

---

## Architecture Overview

### Core Strategy
1. **Single Table Storage**: Both `pub.leaflet.*` and `site.standard.*` records are stored in the same database tables (`documents`, `publications`)
2. **Normalization Layer**: `normalizeDocument()` and `normalizePublication()` convert both formats to canonical `NormalizedDocument` and `NormalizedPublication` types
3. **Context Refactoring**: `PostPageContext` replaced with `DocumentContext` + `LeafletContentContext`

### Key Files
- `lexicons/src/normalize.ts` - Core normalization functions
- `src/utils/normalizeRecords.ts` - Database-aware wrappers
- `contexts/DocumentContext.tsx` - Document/publication context
- `contexts/LeafletContentContext.tsx` - Leaflet content (pages) context

---

## Critical Issues to Address

### 1. Pagination Bug in `getPublications.ts` (HIGH)
**File**: `app/(home-pages)/discover/getPublications.ts`

The cursor is calculated from `page` (pre-normalization) but returned data is `normalizedPage` (post-filtering). This causes pagination issues:

```typescript
// BUG: Cursor based on pre-filtered data
const nextCursor =
  page.length === limit && startIndex + limit < allPubs.length
    ? { indexed_at: page[page.length - 1]... }  // <-- should use normalizedPage
```

**Impact**: Skipped or duplicate items in pagination when items are filtered out.

**Fix**: Calculate cursor from `normalizedPage` instead of `page`.

### 2. Missing Null Check in `CommentMentionNotification.tsx` (HIGH)
**File**: `app/(home-pages)/notifications/CommentMentionNotification.tsx`

Unlike other notification components, this one does NOT check if `docRecord` is null before rendering:

```typescript
const docRecord = props.normalizedDocument;
// No null check - could cause runtime errors
content={<ContentLayout postTitle={docRecord?.title} ...>}
```

**Fix**: Add `if (!docRecord) return null;` at the start.

### 3. Debug Console.log Left in Code (MEDIUM)
**File**: `app/lish/[did]/[publication]/[rkey]/LinearDocumentPage.tsx:54`

```typescript
console.log("prev/next?: " + preferences.showPrevNext);
```

**Fix**: Remove debug log before merging.

---

## Architectural Notes

### Table Strategy (Clarified)
The `site_standard_*` tables and backfill script are from a previous attempt. These tables will be cleaned up later and their data merged into the main tables.

**Current approach**: Both `pub.leaflet.*` and `site.standard.*` records are stored in the main `documents` and `publications` tables, with the normalization layer handling read-time conversion.

---

## Minor Issues

### 4. Awkward UX in `FollowNotification.tsx` (LOW)
When `pubRecord` is null, displays "subscribed to !" with no publication name.

**Fix**: Return null or show fallback text when `pubRecord` is null.

### 5. Return Type Uses `any[]` in `getPublications.ts` (LOW)
```typescript
): Promise<{ publications: any[]; nextCursor: Cursor | null }>
```

**Fix**: Use proper typed array.

### 6. Double Normalization Performance (LOW)
`getPublicationURL()` normalizes internally, but callers often already have normalized data.

**Files affected**: `getProfilePosts.ts`, `getDocumentsByTag.ts`

**Fix**: Consider passing pre-normalized record to `getPublicationURL`.

### 7. Unnecessary Optional Chaining (LOW)
**File**: `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts:49`

```typescript
const normalizedPubRecord = normalizePublicationRecord(pub?.record);
// pub is guaranteed non-null at this point
```

### 8. Verify RPC Pre-normalization (NEEDS VERIFICATION)
**File**: `app/lish/[did]/[publication]/dashboard/PublishedPostsLists.tsx`

Accesses `doc.record.title` directly without normalization. Need to verify that `get_publication_data` RPC returns pre-normalized data.

---

## Positive Observations

### Consistent Patterns
1. **Normalization at boundaries**: API routes and server components normalize data before returning
2. **Hooks for client components**: `useNormalizedPublicationRecord()`, `useLeafletPublicationData()` provide pre-normalized data
3. **Type safety**: `NormalizedDocument` and `NormalizedPublication` types used consistently
4. **Null handling**: Most files properly check for null after normalization

### Good Implementations
- `generateFeed.ts` - Excellent use of `hasLeafletContent()` type guard
- `PublicationSWRProvider.tsx` - Clean centralized normalization with `useMemo`
- `PageSWRDataProvider.tsx` - Excellent memoized normalization pattern
- Context split (`DocumentContext` + `LeafletContentContext`) - Clean separation of concerns

---

## Files Review Summary

| Category | Files | Status |
|----------|-------|--------|
| Data Fetching | 5 | 4 PASS, 1 NEEDS FIX |
| Notifications | 8 | 6 PASS, 2 NEED FIX |
| Post Page | 13 | 12 PASS, 1 NEEDS FIX |
| Dashboard | 10 | 9 PASS, 1 NEEDS VERIFICATION |
| API Routes | 7 | All PASS |
| Publishing | 10 | All PASS |
| Components | 11 | All PASS |
| Other | 4 | All PASS |

**Total: 68 files reviewed**

---

## Recommendations

### Before Merging
1. Fix pagination bug in `getPublications.ts`
2. Add null check in `CommentMentionNotification.tsx`
3. Remove debug console.log in `LinearDocumentPage.tsx`
4. Verify `get_publication_data` RPC pre-normalizes documents

### Post-Merge
1. Clarify the purpose of `site_standard_*` tables
2. Consider unifying or removing duplicate table strategy
3. Add documentation for normalization patterns
4. Consider runtime validation in dev mode to catch un-normalized data

---

## Detailed Review Files

See individual review files in `/scratch/`:
- `review-data-fetching.md`
- `review-notifications.md`
- `review-post-page.md`
- `review-dashboard.md`
- `review-api-misc.md`
