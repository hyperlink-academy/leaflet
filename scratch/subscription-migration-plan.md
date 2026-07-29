# Subscription Migration Plan: site.standard.graph.subscription

## Overview

Migrate subscription handling to support both `pub.leaflet.graph.subscription` and `site.standard.graph.subscription` lexicons, following the same pattern as documents/publications.

## Current State

### Schema Comparison

Both formats are nearly identical:

```typescript
// pub.leaflet.graph.subscription
interface Record {
  $type: 'pub.leaflet.graph.subscription'
  publication: string  // AT-URI of the publication
}

// site.standard.graph.subscription
interface Record {
  $type: 'site.standard.graph.subscription'
  publication: string  // AT-URI of the publication
}
```

### Current Storage

- Table: `publication_subscriptions`
- Columns: `uri`, `identity`, `publication`, `record` (JSON), `created_at`
- Both formats stored in same table (appview already handles this)

### Current Usage

1. **Write path** (`subscribeToPublication.ts`): Creates `pub.leaflet.graph.subscription` records
2. **Read path** (`getSubscriptions.ts`): Reads from `publication_subscriptions`, normalizes the *publication* record (not subscription record)
3. **Appview** (`appview/index.ts`): Already indexes both formats into `publication_subscriptions`

---

## Migration Structure

### 1. Add Normalization Functions (lexicons/src/normalize.ts)

```typescript
import type * as PubLeafletGraphSubscription from "../api/types/pub/leaflet/graph/subscription";
import type * as SiteStandardGraphSubscription from "../api/types/site/standard/graph/subscription";

// Normalized type - use site.standard as canonical
export type NormalizedSubscription = SiteStandardGraphSubscription.Record;

/**
 * Checks if the record is a pub.leaflet.graph.subscription
 */
export function isLeafletSubscription(
  record: unknown
): record is PubLeafletGraphSubscription.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return (
    r.$type === "pub.leaflet.graph.subscription" ||
    // Legacy: has publication but no $type
    (typeof r.publication === "string" && !("$type" in r))
  );
}

/**
 * Checks if the record is a site.standard.graph.subscription
 */
export function isStandardSubscription(
  record: unknown
): record is SiteStandardGraphSubscription.Record {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return r.$type === "site.standard.graph.subscription";
}

/**
 * Normalizes a subscription record from either format.
 * Since both formats are identical, this is mostly for type consistency.
 */
export function normalizeSubscription(
  record: unknown
): NormalizedSubscription | null {
  if (!record || typeof record !== "object") return null;

  if (isStandardSubscription(record)) {
    return record;
  }

  if (isLeafletSubscription(record)) {
    return {
      $type: "site.standard.graph.subscription",
      publication: record.publication,
    };
  }

  return null;
}
```

### 2. Add Database Helpers (src/utils/normalizeRecords.ts)

```typescript
import {
  normalizeSubscription,
  type NormalizedSubscription,
} from "lexicons/src/normalize";

export function normalizeSubscriptionRecord(
  record: Json | unknown
): NormalizedSubscription | null {
  return normalizeSubscription(record);
}

export function normalizeSubscriptionRow<T extends { record: Json | unknown }>(
  row: T
): Omit<T, "record"> & { record: NormalizedSubscription | null } {
  return {
    ...row,
    record: normalizeSubscriptionRecord(row.record),
  };
}

export function hasValidSubscription<
  T extends { record: NormalizedSubscription | null }
>(row: T): row is T & { record: NormalizedSubscription } {
  return row.record !== null;
}

// Re-export
export {
  normalizeSubscription,
  isLeafletSubscription,
  isStandardSubscription,
  type NormalizedSubscription,
} from "lexicons/src/normalize";
```

### 3. Files to Update

#### Low Priority (subscription record itself rarely accessed)

Since subscriptions are simple and mostly used for their existence (not their content), most files don't need changes. The `record` field is typically only used to verify the subscription exists.

**Files that access subscription.record directly:**

| File | Usage | Action |
|------|-------|--------|
| `getSubscriptions.ts` | Just passes through, doesn't read fields | No change needed |
| `subscribeToPublication.ts` | Creates new records (always pub.leaflet) | No change needed |
| `appview/index.ts` | Already handles both formats | Already done |

**Optional: Type safety improvements**

If we want strict typing, we could update `PublicationSubscription` type in `getSubscriptions.ts`:

```typescript
export type PublicationSubscription = {
  authorProfile?: { handle: string };
  // publication record is normalized (existing)
  record: NormalizedPublication;
  uri: string;
  // Could add subscription record if needed:
  // subscriptionRecord: NormalizedSubscription;
  documents_in_publications: { ... }[];
};
```

---

## Key Differences from Document/Publication Migration

| Aspect | Documents/Publications | Subscriptions |
|--------|----------------------|---------------|
| Schema complexity | Different fields | Identical fields |
| Read access | Frequent field access | Rarely access record fields |
| Normalization value | High (field mapping) | Low (just $type change) |
| Risk if skipped | Broken field access | None (fields identical) |

---

## Recommendation

**Minimal migration approach:**

1. Add normalization functions for completeness and type safety
2. Don't update existing read paths unless they start accessing subscription record fields
3. Keep write path as pub.leaflet (or decide to switch to site.standard)

**Full migration approach (if consistency is priority):**

1. Add all normalization functions
2. Update types to use `NormalizedSubscription`
3. Add normalization calls where subscription records are read
4. Consider switching write path to site.standard

---

## Write Path Decision

Currently `subscribeToPublication.ts` creates `pub.leaflet.graph.subscription` records. Options:

1. **Keep as-is**: Continue creating pub.leaflet records, normalization handles reading
2. **Switch to site.standard**: Update to create site.standard records for new subscriptions

If switching to site.standard:

```typescript
// In subscribeToPublication.ts
let record = await agent.site.standard.graph.subscription.create(
  { repo: credentialSession.did!, rkey: TID.nextStr() },
  { publication }
);
```

---

## Testing Checklist

- [ ] Verify appview indexes both subscription formats (already done)
- [ ] Verify getSubscriptions works with both formats
- [ ] Verify subscribe/unsubscribe works
- [ ] Verify subscription count displays correctly
- [ ] Verify feed generation uses subscriptions correctly
