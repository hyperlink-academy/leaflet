# Dashboard and Publication Management - Migration Review

This document reviews the dashboard and publication management components for correct implementation of the site.standard.* schema migration.

---

## Summary

Overall, the migration is well-implemented with consistent use of normalization functions. There are a few issues and suggestions for improvement.

### Critical Issues
1. **PublishedPostsLists.tsx** - Uses `doc.record` directly without normalization (accessing pre-normalized data from RPC)

### Potential Issues
1. **PostOptions.tsx** - Preferences fields may not exist in all formats (minor)
2. **page.tsx (publication)** - Sort callback normalizes documents multiple times (performance)

---

## File-by-File Review

### 1. DraftList.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/DraftList.tsx`

**Status:** GOOD

**Analysis:**
- Uses `useNormalizedPublicationRecord()` hook to get normalized data
- Properly checks for null before rendering (`if (!normalizedPubRecord) return null`)
- Does not access any publication record fields directly (only uses it for existence check)

**Code Pattern:**
```typescript
const normalizedPubRecord = useNormalizedPublicationRecord();
if (!pub_data?.publication) return null;
// ...
if (!normalizedPubRecord) return null;
```

**No issues found.**

---

### 2. PublicationDashboard.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/PublicationDashboard.tsx`

**Status:** GOOD

**Analysis:**
- Receives `record: NormalizedPublication` as a prop (already normalized by parent)
- Properly typed with `NormalizedPublication` import
- Accesses normalized fields correctly: `record.theme?.showPageBackground`, `record?.theme?.backgroundImage`

**Code Pattern:**
```typescript
import { type NormalizedPublication } from "src/utils/normalizeRecords";

export default function PublicationDashboard({
  publication,
  record,
}: {
  record: NormalizedPublication;
  publication: Exclude<...>;
}) {
```

**No issues found.**

---

### 3. PublicationSWRProvider.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/PublicationSWRProvider.tsx`

**Status:** GOOD

**Analysis:**
- Imports `normalizePublicationRecord` and `NormalizedPublication` type
- Provides `useNormalizedPublicationRecord()` hook for consistent access
- Uses `useMemo` for efficient normalization caching
- Properly returns `NormalizedPublication | null`

**Code Pattern:**
```typescript
export function useNormalizedPublicationRecord(): NormalizedPublication | null {
  const { data } = usePublicationData();
  return useMemo(
    () => normalizePublicationRecord(data?.publication?.record),
    [data?.publication?.record]
  );
}
```

**No issues found. Good implementation of centralized normalization.**

---

### 4. PublishedPostsLists.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/PublishedPostsLists.tsx`

**Status:** NEEDS REVIEW - Potential Issue

**Analysis:**
- Uses `useNormalizedPublicationRecord()` for publication record (GOOD)
- Accesses `doc.record` directly without calling `normalizeDocumentRecord()` (POTENTIAL ISSUE)

**Observed Pattern:**
```typescript
const sortedDocuments = [...documents].sort((a, b) => {
  const aDate = a.record.publishedAt  // Direct access to doc.record
    ? new Date(a.record.publishedAt)
    : new Date(0);
  // ...
});
// ...
<h3 className="text-primary grow leading-snug">
  {doc.record.title}
</h3>
// ...
{doc.record.publishedAt ? (
  <PublishedDate dateString={doc.record.publishedAt} />
) : null}
```

**Issue:** The component accesses `doc.record.title`, `doc.record.publishedAt`, `doc.record.description`, and `doc.record.tags` directly.

**Investigation Needed:** The `PublishedDocument` type comes from `PublicationSWRProvider`. Need to check if the RPC `get_publication_data` returns pre-normalized data. Looking at the type:
```typescript
export type PublishedDocument = NonNullable<PublicationData>["documents"][number];
```

This suggests the documents are returned from an RPC that may already transform the data. **If the RPC pre-normalizes documents**, this is acceptable. **If not**, these direct accesses will fail for `site.standard.document` records which have different field locations.

**Recommendation:** Verify that `get_publication_data` RPC normalizes document records before returning them. If not, apply `normalizeDocumentRecord()` to each document's data.

---

### 5. dashboard/page.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/page.tsx`

**Status:** GOOD

**Analysis:**
- Uses `normalizePublicationRecord()` in both `generateMetadata` and the main component
- Properly checks for null: `if (!publication || ... || !record)`
- Passes normalized record to child component

**Code Pattern:**
```typescript
const record = normalizePublicationRecord(publication?.record);

if (!publication || identity.atp_did !== publication.identity_did || !record)
  return <PubNotFound />;
// ...
<PublicationDashboard publication={publication} record={record} />
```

**No issues found.**

---

### 6. settings/PostOptions.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/dashboard/settings/PostOptions.tsx`

**Status:** GOOD (minor suggestion)

**Analysis:**
- Uses `useNormalizedPublicationRecord()` hook
- Properly accesses optional preferences with null-safe access: `record?.preferences?.showComments`
- Form submission checks for null: `if (!pubData || !record) return`

**Code Pattern:**
```typescript
const record = useNormalizedPublicationRecord();

let [showComments, setShowComments] = useState(
  record?.preferences?.showComments === undefined
    ? true
    : record.preferences.showComments,
);
```

**Minor Note:** The useState initializers handle undefined preferences correctly. The NormalizedPublication type has optional `preferences` field, and the code handles this properly.

**No issues found.**

---

### 7. generateFeed.ts
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/generateFeed.ts`

**Status:** GOOD

**Analysis:**
- Uses `normalizePublicationRecord()` for publication
- Uses `normalizeDocumentRecord()` for each document
- Uses `hasLeafletContent()` type guard correctly
- Accesses normalized fields: `pubRecord.url`, `record.title`, `record.publishedAt`

**Code Pattern:**
```typescript
const pubRecord = normalizePublicationRecord(publication?.record);
if (!publication || !pubRecord)
  return new NextResponse(null, { status: 404 });

// ...

const record = normalizeDocumentRecord(doc.documents?.data);
if (!record) return;

let blocks: PubLeafletPagesLinearDocument.Block[] = [];
if (hasLeafletContent(record) && record.content.pages[0]) {
  const firstPage = record.content.pages[0];
  if (PubLeafletPagesLinearDocument.isMain(firstPage)) {
    blocks = firstPage.blocks || [];
  }
}
```

**Excellent implementation:**
- Correctly uses `hasLeafletContent()` before accessing `record.content.pages`
- Uses `pubRecord.url` instead of constructing from `base_path`
- Null checks after normalization

**No issues found.**

---

### 8. icon/route.ts
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/icon/route.ts`

**Status:** GOOD

**Analysis:**
- Uses `normalizePublicationRecord()`
- Properly checks for icon: `if (!record?.icon)`
- Accesses icon.ref correctly

**Code Pattern:**
```typescript
const record = normalizePublicationRecord(publication?.record);
if (!record?.icon) return redirect("/icon.png");

let cid = (record.icon.ref as unknown as { $link: string })["$link"];
```

**No issues found.**

---

### 9. layout.tsx
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/layout.tsx`

**Status:** GOOD

**Analysis:**
- Uses `normalizePublicationRecord()`
- Uses optional chaining for potentially null record: `pubRecord?.name`, `pubRecord?.url`
- Correctly uses `pubRecord.url` for feed URLs (not constructing from base_path)

**Code Pattern:**
```typescript
const pubRecord = normalizePublicationRecord(publication?.record);

return {
  title: pubRecord?.name || "Untitled Publication",
  description: pubRecord?.description || "",
  // ...
  alternates: pubRecord?.url
    ? {
        types: {
          "application/rss+xml": `${pubRecord.url}/rss`,
          // ...
        },
      }
    : undefined,
};
```

**No issues found.**

---

### 10. page.tsx (Publication Home)
**Path:** `/home/jared/work/2025/leaflet/app/lish/[did]/[publication]/page.tsx`

**Status:** GOOD (with performance suggestion)

**Analysis:**
- Uses `normalizePublicationRecord()` for publication record
- Uses `normalizeDocumentRecord()` for document records
- Properly handles null after normalization: `if (!doc_record) return null`
- Accesses correct normalized fields

**Code Pattern:**
```typescript
const record = normalizePublicationRecord(publication?.record);

// In sort callback and map:
const aRecord = normalizeDocumentRecord(a.documents?.data);
const bRecord = normalizeDocumentRecord(b.documents?.data);
// ...
const doc_record = normalizeDocumentRecord(doc.documents.data);
if (!doc_record) return null;
```

**Performance Note:** The current implementation calls `normalizeDocumentRecord()` multiple times for the same documents:
1. Twice in the sort callback (for each comparison, documents may be normalized multiple times)
2. Once in the map callback

**Suggestion:** Normalize documents once upfront:
```typescript
const normalizedDocs = publication.documents_in_publications
  .filter((d) => !!d?.documents)
  .map((d) => ({
    ...d,
    normalizedRecord: normalizeDocumentRecord(d.documents?.data),
  }))
  .filter((d) => d.normalizedRecord !== null);

// Then sort and map using d.normalizedRecord
```

**No correctness issues, but room for optimization.**

---

## Type Safety Analysis

### NormalizedPublication Fields Used
| Field | Files Using |
|-------|-------------|
| `name` | dashboard/page.tsx, layout.tsx, generateFeed.ts |
| `url` | layout.tsx, generateFeed.ts |
| `description` | layout.tsx, generateFeed.ts, page.tsx |
| `icon` | icon/route.ts, page.tsx |
| `theme` | page.tsx, PublicationDashboard.tsx |
| `theme?.showPageBackground` | DraftList.tsx, PublicationDashboard.tsx, PublishedPostsLists.tsx |
| `theme?.backgroundImage` | PublicationDashboard.tsx |
| `preferences?.showComments` | PostOptions.tsx, page.tsx, PublishedPostsLists.tsx |
| `preferences?.showMentions` | PostOptions.tsx, page.tsx, PublishedPostsLists.tsx |
| `preferences?.showPrevNext` | PostOptions.tsx |
| `preferences?.showInDiscover` | PostOptions.tsx |

All fields exist on `site.standard.publication.Record` and are accessed with proper optional chaining.

### NormalizedDocument Fields Used
| Field | Files Using |
|-------|-------------|
| `title` | generateFeed.ts, page.tsx, PublishedPostsLists.tsx |
| `description` | generateFeed.ts, page.tsx, PublishedPostsLists.tsx |
| `publishedAt` | generateFeed.ts, page.tsx, PublishedPostsLists.tsx |
| `tags` | page.tsx, PublishedPostsLists.tsx |
| `content` | generateFeed.ts (via hasLeafletContent) |

All fields exist on `site.standard.document.Record` and are accessed correctly.

---

## Recommendations

### High Priority
1. **Verify PublishedPostsLists.tsx data source:** Confirm that the RPC endpoint normalizes document data before returning. If not, add normalization calls.

### Medium Priority
2. **Optimize page.tsx sorting:** Consider normalizing documents once before sorting/mapping to avoid redundant normalization calls.

### Low Priority
3. **Consider adding type guards in PublicationSWRProvider:** The `PublishedDocument` type could benefit from validation to ensure runtime safety.

---

## Conclusion

The migration is well-executed with consistent patterns:
- Normalization functions are imported from `src/utils/normalizeRecords`
- Null checks are performed after normalization
- Field access uses the normalized type structure
- Type imports are correct (`NormalizedPublication`, `NormalizedDocument`)

The only area requiring verification is whether the RPC-provided document data in `PublishedPostsLists.tsx` is pre-normalized, as it accesses `doc.record` fields directly rather than calling `normalizeDocumentRecord()`.
