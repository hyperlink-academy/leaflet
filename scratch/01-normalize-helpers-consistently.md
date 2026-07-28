# Simplification 1: Use Normalize Helpers Consistently

## Summary

Replace inline normalization patterns with the existing `normalizeDocumentRow` and `normalizePublicationRow` helpers from `src/utils/normalizeRecords.ts`.

## Current State

Several data fetchers do inline normalization with repetitive patterns:

```typescript
// In getPublications.ts, getReaderFeed.ts, getSubscriptions.ts, etc.
const normalizedPage = page
  .map((pub) => {
    const normalizedRecord = normalizePublicationRecord(pub.record);
    if (!normalizedRecord) return null;
    return {
      ...pub,
      record: normalizedRecord,
    };
  })
  .filter(
    (pub): pub is NonNullable<typeof pub> & { record: NormalizedPublication } =>
      pub !== null
  );
```

## Desired State

Use the existing helpers that already handle this pattern:

```typescript
import { normalizePublicationRow } from "src/utils/normalizeRecords";

const normalizedPage = page
  .map(normalizePublicationRow)
  .filter((pub) => pub.record !== null);
```

## Files to Update

- `app/(home-pages)/discover/getPublications.ts`
- `app/(home-pages)/reader/getReaderFeed.ts`
- `app/(home-pages)/reader/getSubscriptions.ts`
- `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts`
- `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts`
- `app/api/rpc/[command]/get_profile_data.ts`

## Why First

This is a low-risk preparatory cleanup that:
- Reduces code duplication
- Makes patterns consistent before larger architectural changes
- Doesn't change any behavior or types
