# Code Review: site.standard.* Schema Migration - API Routes and Miscellaneous Files

This review examines the migration changes for adding site.standard.* schema support across API routes, publishing actions, and other miscellaneous files.

---

## API Routes

### `/home/jared/work/2025/leaflet/app/api/pub_icon/route.ts`

**Status: GOOD with minor observation**

**Correct usage:**
- Uses `normalizePublicationRecord()` to normalize the publication record (lines 52, 66)
- Properly checks for null: `if (!normalizedPub?.icon)` (line 73)
- Correct field access: `normalizedPub.icon`, `normalizedPub.name` (lines 75, 99)

**Observation:**
- Line 39: The collection check is still `uri.collection === "pub.leaflet.document"` - this will only work for pub.leaflet documents. If site.standard documents are introduced, this would need updating. However, this is likely acceptable for now since the migration focuses on normalization of existing data.

---

### `/home/jared/work/2025/leaflet/app/api/rpc/[command]/get_profile_data.ts`

**Status: EXCELLENT**

**Correct usage:**
- Uses `normalizePublicationRow()` and `hasValidPublication()` helper functions (lines 67-69)
- Clean filtering pattern with type guards
- Proper import of both helpers from `src/utils/normalizeRecords`

**Code quality:**
```typescript
const normalizedPublications = (publications || [])
  .map(normalizePublicationRow)
  .filter(hasValidPublication);
```
This is the ideal pattern for normalizing database rows.

---

### `/home/jared/work/2025/leaflet/app/api/rpc/[command]/get_publication_data.ts`

**Status: GOOD**

**Correct usage:**
- Uses `normalizeDocumentRecord()` to normalize document data (line 66)
- Proper null check: `if (!normalized) return null;` (line 67)
- Returns both the normalized record and original data for compatibility

**Minor observation:**
- Line 72: Returns `data: dip.documents.data` which is the raw data. This is intentional for backward compatibility, but consumers should be aware they need to use the `record` field (normalized) instead.

---

### `/home/jared/work/2025/leaflet/app/lish/feeds/[...path]/route.ts`

**Status: GOOD**

**Correct usage:**
- Uses `normalizeDocumentRecord()` to normalize document data (line 40)
- Proper null check with optional chaining: `if (!normalizedDoc?.bskyPostRef)` (line 41)
- Correct field access: `normalizedDoc.bskyPostRef.uri`

---

### `/home/jared/work/2025/leaflet/app/lish/uri/[uri]/route.ts`

**Status: GOOD**

**Correct usage:**
- Uses `normalizePublicationRecord()` in both code paths (lines 34, 53)
- Proper null checks: `if (!normalizedPub?.url)` (lines 35, 57)
- Correct field access: `normalizedPub.url`

---

### `/home/jared/work/2025/leaflet/app/p/[didOrHandle]/[rkey]/opengraph-image.ts`

**Status: GOOD with observation**

**Correct usage:**
- Uses `normalizeDocumentRecord()` with jsonToLex wrapper (line 38)
- Proper null check: `if (docRecord?.coverImage)` (line 39)
- Correct field access: `docRecord.coverImage.ref`

**Observation:**
- Line 38: Uses `jsonToLex(document.data)` before normalization. This is necessary because the database stores JSON and jsonToLex hydrates blob refs. The normalization function should handle this, but it's good to be explicit.

---

### `/home/jared/work/2025/leaflet/app/p/[didOrHandle]/[rkey]/page.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizeDocumentRecord()` to normalize document data (line 35)
- Proper null check: `if (!docRecord) return { title: "404" };` (line 36)
- Correct field access for metadata: `docRecord.title`, `docRecord.description`

**Observation:**
- Line 40: Accesses `document.documents_in_publications[0]?.publications?.name` for publication name, which is the raw database structure. This is fine since the publication record itself isn't being used for other normalized fields.

---

## Publishing Actions

### `/home/jared/work/2025/leaflet/actions/publishToPublication.ts`

**Status: GOOD with observations**

**Correct usage:**
- Uses `normalizeDocumentRecord()` to read existing document data (line 155)
- Proper null check with conditional: `if (normalizedDoc)` (line 156)
- Uses `normalizeDocumentRecord()` again for mention handling (line 906)

**Observations:**
1. Lines 159-166: When reading existing record fields for preservation, it correctly extracts from `normalizedDoc.publishedAt`, `normalizedDoc.theme`, etc.
2. Line 192-218: When creating the new record, it uses `PubLeafletDocument.Record` type - this is correct as the system writes in pub.leaflet format.
3. The code preserves the theme from the normalized document, which is correct for backward compatibility.

---

### `/home/jared/work/2025/leaflet/app/[leaflet_id]/actions/PublishButton.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizePublicationRecord()` to normalize publication record (line 373)
- The result is passed to `PubIcon` component which expects `NormalizedPublication | null`

**Note:**
- This is a client component, so the normalization happens client-side with the JSON record from the identity provider.

---

### `/home/jared/work/2025/leaflet/app/[leaflet_id]/actions/ShareOptions/index.tsx`

**Status: GOOD (No normalization needed)**

- This file uses `useLeafletPublicationData()` which provides pre-normalized data
- Accesses `normalizedDocument` through the hook
- No direct normalization calls needed

---

### `/home/jared/work/2025/leaflet/app/[leaflet_id]/publish/PublishPost.tsx`

**Status: EXCELLENT**

**Correct usage:**
- Receives `record?: NormalizedPublication | null` as a prop (line 34)
- Type-safe access to `props.record?.url`, `props.record.name` (lines 130, 298, 323, 354)
- Proper null checks throughout

**Note:**
- The component expects pre-normalized data, which is the correct pattern for components receiving data from server-side.

---

### `/home/jared/work/2025/leaflet/app/[leaflet_id]/publish/page.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizePublicationRecord()` on the server side (line 121)
- Passes the normalized record to `PublishPost` component
- Handles `null` case by passing directly to component

---

### `/home/jared/work/2025/leaflet/app/lish/createPub/UpdatePubForm.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `useNormalizedPublicationRecord()` hook from the SWR provider (lines 35, 207)
- Proper null checks: `if (!record) return null;` (line 209)
- Correct field access: `record.name`, `record.description`, `record.icon`, `record.url`, `record.preferences`

**Observation:**
- Line 249: Accesses `record.url.replace(/^https?:\/\//, "")` - this assumes `url` is always present on normalized records. The normalization function returns `null` if `base_path` is missing (which translates to `url`), so this should be safe after the null check.

---

### `/home/jared/work/2025/leaflet/app/lish/createPub/getPublicationURL.ts`

**Status: GOOD**

**Correct usage:**
- Uses `normalizePublicationRecord()` to normalize the record (lines 20, 36)
- Uses `isLeafletPublication()` type guard for raw record access (line 28)
- Proper null handling with optional chaining

**Design note:**
- This file handles both normalized and raw records gracefully, falling back to raw `base_path` for legacy compatibility.

---

### `/home/jared/work/2025/leaflet/app/lish/createPub/updatePublication.ts`

**Status: GOOD with observation**

**Correct usage:**
- Uses `normalizePublicationRecord()` to read existing publication data (lines 151, 247)
- Extracts normalized fields for building new pub.leaflet records

**Observation:**
- Lines 157-173, 253-267: When rebuilding the record, it extracts fields from `normalizedPub` and constructs a new `PubLeafletPublication.Record`. This is correct because the system writes in pub.leaflet format.
- The code correctly handles the conversion from `url` back to `base_path` (lines 153-155, 248-251).

---

## Components

### `/home/jared/work/2025/leaflet/components/ActionBar/Publications.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizePublicationRecord()` to normalize publication records (line 91)
- Proper null check: `if (!record) return;` (line 92)
- `PubIcon` component correctly typed to accept `NormalizedPublication | null`

---

### `/home/jared/work/2025/leaflet/components/Blocks/PublicationPollBlock.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `getDocumentPages()` helper to extract pages from normalized document (line 33)
- Proper null check: `if (!normalizedDocument) return false;` (line 31)
- Uses `normalizedDocument` from `useLeafletPublicationData()` hook

---

### `/home/jared/work/2025/leaflet/components/Canvas.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizedPublication` from `useLeafletPublicationData()` hook (line 164)
- Proper null checks: `if (!normalizedPublication) return null;` (line 167)
- Correct field access: `normalizedPublication.preferences?.showComments`

---

### `/home/jared/work/2025/leaflet/components/PageSWRDataProvider.tsx`

**Status: EXCELLENT**

**Correct usage:**
- Uses `useMemo()` to memoize normalization of publication and document records (lines 83-90)
- Both `normalizePublicationRecord()` and `normalizeDocumentRecord()` are used
- Returns pre-normalized data to consumers

**Design quality:**
- This is the central hook that provides normalized data to most components
- Excellent pattern for avoiding repeated normalization calls

---

### `/home/jared/work/2025/leaflet/components/Pages/PublicationMetadata.tsx`

**Status: GOOD**

**Correct usage:**
- Uses pre-normalized data from `useLeafletPublicationData()` hook (lines 24, 208, 234)
- Correct field access: `normalizedDocument?.publishedAt`, `normalizedPublication?.preferences`
- Proper null handling throughout

---

### `/home/jared/work/2025/leaflet/components/PostListing.tsx`

**Status: GOOD with type assertion**

**Usage:**
- Lines 22-26: Uses type assertions for `pubRecord` and `postRecord`
```typescript
let pubRecord = props.publication?.pubRecord as NormalizedPublication | undefined;
let postRecord = props.documents.data as NormalizedDocument | null;
```

**Observation:**
- These are type assertions, not normalization calls. The data should already be normalized before being passed to this component (from `getReaderFeed`). This pattern assumes the caller has already normalized the data.
- Line 29: Proper null check: `if (!postRecord) return null;`

---

### `/home/jared/work/2025/leaflet/components/ThemeManager/PubThemeSetter.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `useNormalizedPublicationRecord()` hook (lines 38, 249, 317)
- Proper null checks and field access
- Uses `PubLeafletThemeBackgroundImage.isMain()` type guard for theme background

---

### `/home/jared/work/2025/leaflet/components/ThemeManager/PublicationThemeProvider.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `useNormalizedPublicationRecord()` hook (lines 59, 109)
- `usePubTheme()` function accepts `PubLeafletPublication.Record["theme"]` which matches the normalized type
- Proper null handling with optional chaining

---

### `/home/jared/work/2025/leaflet/components/ThemeManager/ThemeProvider.tsx`

**Status: GOOD**

**Correct usage:**
- Uses `normalizedPublication` from `useLeafletPublicationData()` hook (line 42)
- Passes normalized theme to `PublicationThemeProvider` (line 47)

---

## Other Files

### `/home/jared/work/2025/leaflet/feeds/index.ts`

**Status: GOOD**

**Correct usage:**
- Uses `normalizeDocumentRecord()` to normalize document data (line 139)
- Proper null check with optional chaining: `if (!normalizedDoc?.bskyPostRef)` (line 140)
- Correct field access: `normalizedDoc.bskyPostRef.uri`

---

### `/home/jared/work/2025/leaflet/src/utils/getPublicationMetadataFromLeafletData.ts`

**Status: GOOD (Documentation file)**

- This file returns raw JSON from the database
- Documentation in JSDoc comments correctly directs consumers to use normalization functions
- Type definitions include comments about needing to normalize

---

### `/home/jared/work/2025/leaflet/app/(home-pages)/p/[didOrHandle]/ProfileHeader.tsx`

**Status: GOOD**

**Correct usage:**
- Receives pre-normalized `publications: { record: NormalizedPublication; uri: string }[]` (line 17)
- Type-safe access: `record.url`, `record.name`, `record.theme`
- Proper field access in `PublicationCard` component

---

## Summary

### Overall Assessment: GOOD

The migration shows consistent and correct usage of the normalization utilities across all reviewed files.

### Patterns Observed:

1. **Server-side normalization**: API routes and server components correctly call `normalizeDocumentRecord()` or `normalizePublicationRecord()` before returning data.

2. **Client-side via hooks**: Client components use the `useLeafletPublicationData()` and `useNormalizedPublicationRecord()` hooks which provide pre-normalized data.

3. **Null handling**: All files properly check for null after normalization using optional chaining (`?.`) or explicit null checks.

4. **Type safety**: Normalized types (`NormalizedDocument`, `NormalizedPublication`) are used consistently for type annotations.

### Potential Issues Found: NONE CRITICAL

### Minor Observations:

1. **Collection type checks**: Some files still check for `pub.leaflet.document` collection type. If `site.standard.document` collection is introduced at the ATProto level, these checks may need updating.

2. **Type assertions in PostListing**: Uses type assertions rather than normalization calls, assuming pre-normalized data. This is acceptable if the data flow guarantees normalization upstream.

3. **Theme preservation**: The migration correctly preserves the original `theme` field in normalized documents for backward compatibility with theme-dependent components.

### Recommendations:

1. Continue the pattern of normalizing data at the boundary (API routes, server components) and passing normalized types to downstream components.

2. Consider adding runtime validation in development mode to catch cases where un-normalized data is accidentally passed where normalized data is expected.

3. Document the data flow in a README or architecture document to ensure future developers understand where normalization should occur.
