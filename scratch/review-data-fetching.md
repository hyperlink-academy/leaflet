# Data Fetching Files Migration Review

Review of files implementing site.standard.* schema normalization in data fetching functions.

---

## 1. app/(home-pages)/reader/getReaderFeed.ts

### Summary
Normalizes both document and publication records, filtering out posts with unrecognized document formats.

### Correct Usage
- Uses `normalizeDocumentRecord()` on `post.data`
- Uses `normalizePublicationRecord()` on `pub?.record`
- Properly filters out posts where `normalizedData` is null via `.filter((post): post is Post => post !== null)`
- Type definitions updated to use `NormalizedDocument | null` and `NormalizedPublication | null`

### Issues Found

**Issue 1: Type inconsistency - documents.data allows null but filtering already occurred**

The `Post` type defines `documents.data` as `NormalizedDocument | null`:
```typescript
documents: {
  data: NormalizedDocument | null;
  // ...
};
```

However, the code already filters out posts where `normalizedData` is null (line 59 returns null, line 83 filters). This means `documents.data` will never actually be null in the returned posts. The type could be tightened to `NormalizedDocument` for consumers, but this is a minor issue that provides defensive typing.

**Status: Minor - Acceptable defensive typing**

### Verdict: PASS

---

## 2. app/(home-pages)/reader/getSubscriptions.ts

### Summary
Normalizes publication records for subscriptions, filtering out subscriptions with unrecognized publication formats.

### Correct Usage
- Uses `normalizePublicationRecord()` on `pub.publications?.record`
- Properly filters out null results
- Type updated to `NormalizedPublication` (non-nullable, correct since filtered)

### Issues Found

**Issue 1: Type inconsistency - documents data not normalized**

The `PublicationSubscription` type still uses `Json` for nested document data:
```typescript
documents_in_publications: {
  documents: { data?: Json; indexed_at: string } | null;
}[];
```

This is inconsistent - if the publication record is normalized, shouldn't the document data also be normalized?

**Impact:** Medium - Consumers of this type may try to access document data expecting normalized fields. However, looking at the usage, it appears documents are only used for `indexed_at` timestamps in this context, so the document data itself may not be used.

**Recommendation:** Either normalize the document data or document that it remains raw Json.

**Issue 2: Missing import cleanup**

Line 6 still imports `Json` from supabase types:
```typescript
import { Json } from "supabase/database.types";
```

This import is still needed because `PublicationSubscription.documents_in_publications.documents.data` uses `Json`. If document normalization is added, this import may become unused.

**Status: OK - import is still used**

### Verdict: PASS with minor concern about nested document typing

---

## 3. app/(home-pages)/discover/getPublications.ts

### Summary
Normalizes publication records for the discover page using the row-level helpers.

### Correct Usage
- Uses `normalizePublicationRow()` which handles the full row transformation
- Uses `hasValidPublication()` type guard for filtering
- Clean, idiomatic usage of the helper functions

### Issues Found

**Issue 1: Cursor calculation uses pre-normalized data**

The cursor is calculated from `page` (pre-normalization) rather than `normalizedPage`:
```typescript
const nextCursor =
  page.length === limit && startIndex + limit < allPubs.length
    ? order === "recentlyUpdated"
      ? {
          indexed_at: page[page.length - 1].documents_in_publications[0]?.indexed_at,
          uri: page[page.length - 1].uri,
        }
```

**Impact:** This could cause issues. If the last item(s) in `page` are filtered out by `hasValidPublication()`, the cursor will point to a different position than expected.

**Scenario:**
- `page` has 25 items
- Last 3 items have invalid publication records
- `normalizedPage` has 22 items
- Cursor points to item 25, but client thinks they got 22 items
- Next page request may skip items or return duplicates

**Recommendation:** Calculate cursor from `normalizedPage` instead of `page`, or ensure the cursor check accounts for the filter.

**Issue 2: Return type uses `any[]`**

```typescript
): Promise<{ publications: any[]; nextCursor: Cursor | null }>
```

This loses type safety. Should be updated to reflect the normalized publication type.

**Recommendation:** Update return type to use proper typing:
```typescript
): Promise<{ publications: PublicationRowWithNormalizedRecord<...>[]; nextCursor: Cursor | null }>
```

### Verdict: NEEDS ATTENTION - Cursor calculation bug potential

---

## 4. app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts

### Summary
Normalizes both document and publication records for profile posts.

### Correct Usage
- Uses `normalizeDocumentRecord()` on `doc.data`
- Uses `normalizePublicationRecord()` on `pub.record`
- Filters out documents with invalid data via `continue`
- Reuses the `Post` type from getReaderFeed

### Issues Found

**Issue 1: Publication normalization happens without null check affecting downstream**

When creating the post, the publication record is normalized inline:
```typescript
post.publication = {
  href: getPublicationURL(pub),
  pubRecord: normalizePublicationRecord(pub.record),
  uri: pub.uri,
};
```

If `normalizePublicationRecord` returns `null`, the post still gets added with `pubRecord: null`. This is consistent with the `Post` type which allows `pubRecord: NormalizedPublication | null`, so this is acceptable behavior.

However, there's an asymmetry: invalid document data causes the entire post to be skipped, but invalid publication data only results in `pubRecord: null`. This may be intentional (documents are required, publications are optional), but worth noting.

**Status: Acceptable - intentional asymmetry based on Post type**

**Issue 2: getPublicationURL receives raw pub object**

```typescript
href: getPublicationURL(pub),
```

Looking at `getPublicationURL`, it accepts the raw publication and normalizes internally. This means the record is normalized twice - once here for `pubRecord` and once inside `getPublicationURL`. This is wasteful but not incorrect.

**Recommendation:** Consider passing the already-normalized record to avoid double normalization, though this would require updating `getPublicationURL`'s signature.

**Status: Minor - Performance optimization opportunity**

### Verdict: PASS

---

## 5. app/(home-pages)/tag/[tag]/getDocumentsByTag.ts

### Summary
Normalizes both document and publication records for tag-based document queries.

### Correct Usage
- Uses `normalizeDocumentRecord()` on `doc.data`
- Uses `normalizePublicationRecord()` on `pub?.record`
- Filters out documents where normalization fails
- Uses proper type guard in filter: `(p): p is Post => p !== null`

### Issues Found

**Issue 1: Redundant null check on pub**

Line 49:
```typescript
const normalizedPubRecord = normalizePublicationRecord(pub?.record);
```

At this point, `pub` is guaranteed to be non-null because of the check on line 39:
```typescript
if (!pub) {
  return null;
}
```

The optional chaining `pub?.record` is unnecessary. Should be `pub.record`.

**Status: Minor - Unnecessary optional chaining**

**Issue 2: Same double normalization issue as getProfilePosts**

```typescript
const post: Post = {
  publication: {
    href: getPublicationURL(pub),  // normalizes internally
    pubRecord: normalizedPubRecord, // already normalized
```

**Status: Minor - Same performance note as #4**

### Verdict: PASS

---

## Summary

| File | Status | Critical Issues |
|------|--------|-----------------|
| getReaderFeed.ts | PASS | None |
| getSubscriptions.ts | PASS | Minor: nested document typing |
| getPublications.ts | NEEDS ATTENTION | Cursor bug potential |
| getProfilePosts.ts | PASS | Minor: double normalization |
| getDocumentsByTag.ts | PASS | Minor: unnecessary optional chaining |

### Critical Issue to Address

**getPublications.ts - Cursor calculation bug:**

The cursor is calculated from `page` before normalization filtering, but the returned data is `normalizedPage` after filtering. This creates a mismatch that could cause pagination issues.

**Suggested fix:**
```typescript
// Create next cursor from normalizedPage, not page
const nextCursor =
  normalizedPage.length === limit
    ? order === "recentlyUpdated"
      ? {
          indexed_at: normalizedPage[normalizedPage.length - 1].documents_in_publications[0]?.indexed_at,
          uri: normalizedPage[normalizedPage.length - 1].uri,
        }
      : {
          count: normalizedPage[normalizedPage.length - 1].publication_subscriptions[0]?.count || 0,
          uri: normalizedPage[normalizedPage.length - 1].uri,
        }
    : null;
```

Also need to update the condition `startIndex + limit < allPubs.length` to account for potential filtering in future pages.

### Minor Improvements

1. **Type cleanup:** Update `getPublications.ts` return type from `any[]` to proper typed array
2. **Performance:** Consider passing pre-normalized records to `getPublicationURL` to avoid double normalization
3. **Consistency:** Consider normalizing document data in `getSubscriptions.ts` if it's accessed downstream
4. **Cleanup:** Remove unnecessary optional chaining in `getDocumentsByTag.ts` line 49
