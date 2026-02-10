# Notification Components Migration Review

This document reviews the migration of notification components to support `site.standard.*` schema via normalization functions.

---

## Summary

The migration adds `normalizeDocumentRecord` and `normalizePublicationRecord` calls in `src/notifications.ts` to hydrate notifications with normalized data. The notification components then consume these normalized fields (`normalizedDocument`, `normalizedPublication`, etc.) instead of accessing raw record data directly.

**Overall Assessment**: The migration is well-structured but has several issues related to null handling and potential runtime errors.

---

## File Reviews

### 1. `src/notifications.ts`

**Changes Made**:
- Added imports for `normalizeDocumentRecord`, `normalizePublicationRecord`, `NormalizedDocument`, `NormalizedPublication`
- Added `normalizedDocument` and `normalizedPublication` fields to hydrated notification objects
- For mention notifications, also added `normalizedMentionedPublication` and `normalizedMentionedDocument`

**Issues Found**:

1. **Type Safety - Return types not updated** (Medium Severity)

   The hydration functions return inferred types, but TypeScript may not correctly infer that `normalizedDocument` and `normalizedPublication` can be `null`. The functions call `normalizeDocumentRecord()` and `normalizePublicationRecord()` which explicitly return `NormalizedDocument | null` and `NormalizedPublication | null`, so this should be correctly inferred, but explicit typing would be safer.

2. **Missing null checks for nested access** (Low Severity)

   At line 110-111 and similar places:
   ```typescript
   normalizedPublication: normalizePublicationRecord(
     commentData.documents?.documents_in_publications[0]?.publications?.record,
   ),
   ```

   This correctly uses optional chaining, which is good. However, if `documents_in_publications` is an empty array, `[0]` returns `undefined`, which is properly handled.

3. **Potential inconsistency in comment vs document normalization** (Low Severity)

   For comment notifications (line 108-111), the document is accessed via `commentData.documents?.data`, but the publication is accessed via `commentData.documents?.documents_in_publications[0]?.publications?.record`. This is correct but the asymmetric access pattern should be documented.

**Positive Observations**:
- Proper use of optional chaining throughout
- Normalization is applied consistently to all notification types
- The `filter((n) => n !== null)` pattern ensures null notifications are excluded

---

### 2. `app/(home-pages)/notifications/CommentNotication.tsx`

**Changes Made**:
- Uses `props.normalizedDocument` instead of accessing raw record data
- Uses `props.normalizedPublication` for publication data
- Accesses `pubRecord.url` and `pubRecord.name` on normalized data

**Issues Found**:

1. **Good null check** (Positive)

   Line 20: `if (!docRecord) return null;`

   This correctly handles the case where normalization fails.

2. **Safe access pattern** (Positive)

   Line 42: `postTitle={docRecord.title}` - Since the null check is performed earlier, this is safe.

3. **Optional chaining on pubRecord** (Positive)

   Line 31-33:
   ```typescript
   const href = pubRecord
     ? `${pubRecord.url}/${rkey}?interactionDrawer=comments`
     : `/p/${did}/${rkey}?interactionDrawer=comments`;
   ```

   Correctly handles null publication.

**No issues found** - This component handles normalization correctly.

---

### 3. `app/(home-pages)/notifications/CommentMentionNotification.tsx`

**Changes Made**:
- Uses `props.normalizedDocument`, `props.normalizedPublication`
- Uses `props.normalizedMentionedDocument`, `props.normalizedMentionedPublication`

**Issues Found**:

1. **Missing null check for docRecord** (High Severity)

   Unlike `CommentNotication.tsx`, this component does NOT check if `docRecord` is null before rendering:
   ```typescript
   const docRecord = props.normalizedDocument;
   // ... no null check ...
   content={
     <ContentLayout postTitle={docRecord?.title} pubRecord={pubRecord}>
   ```

   Line 66 uses optional chaining (`docRecord?.title`), which is good, but the component should probably return null early if `docRecord` is null, similar to other components.

2. **Inconsistent null handling for mentioned document** (Medium Severity)

   Line 48:
   ```typescript
   } else if (props.mention_type === "document" && mentionedDocRecord) {
   ```

   This checks `mentionedDocRecord` exists before using it, which is correct. However, line 52:
   ```typescript
   <span className="italic">{mentionedDocRecord.title}</span>
   ```

   This is safe because of the condition, but accessing `.title` directly (not `.title?`) means if the condition logic changes, it could cause runtime errors.

3. **Inconsistent null check for mentioned publication** (Low Severity)

   Line 45:
   ```typescript
   <span className="italic">{mentionedPubRecord?.name}</span>
   ```

   Uses optional chaining, which is safer and good.

**Recommendation**: Add early return if `docRecord` is null for consistency with other components.

---

### 4. `app/(home-pages)/notifications/FollowNotification.tsx`

**Changes Made**:
- Uses `props.normalizedPublication` for publication data

**Issues Found**:

1. **Missing null check for publication** (Medium Severity)

   Line 25:
   ```typescript
   href={pubRecord ? pubRecord.url : "#"}
   ```

   Line 29:
   ```typescript
   {displayName} subscribed to {pubRecord?.name}!
   ```

   The component handles null `pubRecord` for the href (falls back to "#"), but renders `pubRecord?.name` which could show nothing if null. This might result in text like "Someone subscribed to !" which is awkward.

**Recommendation**: Consider returning null or showing a fallback message if `pubRecord` is null, since a subscription notification without a publication name is not meaningful.

---

### 5. `app/(home-pages)/notifications/MentionNotification.tsx`

**Changes Made**:
- Uses `props.normalizedDocument`, `props.normalizedPublication`
- Uses `props.normalizedMentionedDocument`, `props.normalizedMentionedPublication`

**Issues Found**:

1. **Good null check** (Positive)

   Line 10: `if (!docRecord) return null;`

   Correctly handles null normalized document.

2. **Safe access patterns** (Positive)

   Line 35, 43: Properly checks existence before accessing normalized mentioned items.

3. **Field access is correct** (Positive)

   Uses `docRecord.title`, `docRecord.description`, `pubRecord.url`, `pubRecord.name` which are all valid fields on normalized types.

**No issues found** - This component handles normalization correctly.

---

### 6. `app/(home-pages)/notifications/Notification.tsx`

**Changes Made**:
- Added import for `NormalizedPublication` type
- `ContentLayout` prop `pubRecord` typed as `NormalizedPublication | null`

**Issues Found**:

1. **Type annotation is correct** (Positive)

   Line 63:
   ```typescript
   pubRecord?: NormalizedPublication | null;
   ```

   This correctly types the prop to accept null.

2. **Safe access in ContentLayout** (Positive)

   Lines 77-86:
   ```typescript
   {props.pubRecord && (
     <>
       ...
       <a href={props.pubRecord.url} ...>
         {props.pubRecord.name}
       </a>
     </>
   )}
   ```

   The conditional rendering ensures `pubRecord` is non-null before accessing its properties.

**No issues found** - This component handles normalization correctly.

---

### 7. `app/(home-pages)/notifications/QuoteNotification.tsx`

**Changes Made**:
- Uses `props.normalizedDocument` and `props.normalizedPublication`

**Issues Found**:

1. **Good null check** (Positive)

   Line 14: `if (!docRecord) return null;`

2. **Safe access patterns** (Positive)

   Line 32: `postTitle={docRecord.title}` - Safe due to earlier null check
   Line 32: `pubRecord={pubRecord}` - Passed to ContentLayout which handles null

**No issues found** - This component handles normalization correctly.

---

### 8. `app/(home-pages)/notifications/ReplyNotification.tsx`

**Changes Made**:
- Uses `props.normalizedDocument` and `props.normalizedPublication`

**Issues Found**:

1. **Good null check** (Positive)

   Line 20: `if (!docRecord) return null;`

2. **Potential issue with parentRecord** (Low Severity - Pre-existing)

   Line 27:
   ```typescript
   const parentRecord = props.parentData?.record as PubLeafletComment.Record;
   ```

   Line 63:
   ```typescript
   plaintext={parentRecord.plaintext}
   ```

   If `props.parentData` is undefined (which is possible since `parentData` is optional in the hydrated type), `parentRecord` would be undefined, causing a runtime error at line 63. This is a pre-existing issue not introduced by this migration, but should be noted.

3. **Safe access on normalized data** (Positive)

   Lines 51, 41-42 use `docRecord.title` and `pubRecord.url` correctly with proper null handling.

**No new issues found from migration** - The normalized data is used correctly.

---

## Summary of Issues

| Severity | File | Issue |
|----------|------|-------|
| High | CommentMentionNotification.tsx | Missing null check for `docRecord` before render |
| Medium | FollowNotification.tsx | Awkward UX when `pubRecord` is null (shows "subscribed to !") |
| Medium | src/notifications.ts | Return types could be more explicitly typed |
| Low | CommentMentionNotification.tsx | Direct `.title` access (within condition but fragile) |
| Low | ReplyNotification.tsx | Pre-existing: `parentRecord` can be undefined |

## Recommendations

1. **CommentMentionNotification.tsx**: Add `if (!docRecord) return null;` at the start of the component for consistency.

2. **FollowNotification.tsx**: Either add a null check to return null when `pubRecord` is null, or provide a fallback name like "your publication".

3. **Consider explicit type annotations** in `src/notifications.ts` for the returned hydrated notification objects to make the nullable normalized fields more apparent to consumers.

4. **Pre-existing issue**: Review `ReplyNotification.tsx` for handling of undefined `parentData`.

---

## Positive Observations

1. **Consistent normalization pattern**: All notification types normalize their document and publication data in the hydration layer (`src/notifications.ts`), keeping the components focused on presentation.

2. **Proper use of optional chaining**: Most components use `?.` appropriately when accessing potentially null normalized data.

3. **Type re-exports**: The `src/utils/normalizeRecords.ts` file properly re-exports types, making imports clean for consumers.

4. **Good separation of concerns**: Normalization happens in the data layer, not in the presentation components.
