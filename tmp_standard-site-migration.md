# site.standard Lexicon Migration Summary

## Overview

This migration adds support for the new `site.standard.*` lexicons alongside the existing `pub.leaflet.*` lexicons. Both record formats are now stored in the same database tables and normalized to a common interface for consumption.

## Key Changes

### 1. Appview Updates (`appview/index.ts`)

The firehose consumer now writes `site.standard.*` records directly to the main tables:

- `site.standard.document` → `documents` table
- `site.standard.publication` → `publications` table
- `site.standard.graph.subscription` → `publication_subscriptions` table

This means both `pub.leaflet.*` and `site.standard.*` records coexist in the same tables, differentiated by their `$type` field.

### 2. Normalization Layer (`src/utils/normalizeRecords.ts`)

Created a normalization layer that converts both record formats to a common interface:

```typescript
// Normalized types
type NormalizedDocument = SiteStandardDocument.Record & { theme?: PubLeafletPublication.Theme }
type NormalizedPublication = SiteStandardPublication.Record

// Helper functions
normalizeDocumentRecord(data: Json | unknown): NormalizedDocument | null
normalizePublicationRecord(record: Json | unknown): NormalizedPublication | null
getDocumentPages(doc: NormalizedDocument): Page[]
```

**Field mappings handled by normalization:**

| pub.leaflet | site.standard | Normalized |
|-------------|---------------|------------|
| `content.pages` | `pages` | `pages` |
| `content.title` | `title` | `title` |
| `bskyPostRef` | `postRef` | `postRef` |
| `base_path` | `url` (full URL) | `url` |

### 3. Data Sources Pre-Normalize Records

Contexts and data fetchers now return pre-normalized data so consumers don't need to normalize themselves:

**Hooks updated:**
- `useLeafletPublicationData()` → returns `normalizedDocument` and `normalizedPublication`
- `useNormalizedPublicationRecord()` → new hook for publication dashboard context

**Server-side data fetchers updated:**
- `getPostPageData.ts` → returns `normalizedDocument` and `normalizedPublication`
- `get_profile_data.ts` → normalizes publication records before returning
- `getSubscriptions.ts` → normalizes publication records
- `getPublications.ts` → normalizes publication records
- `getReaderFeed.ts` → uses normalized types in `Post` type
- `src/notifications.ts` → hydration functions return normalized fields

### 4. Removed Type Casts

Removed 70+ casts to `PubLeafletDocument.Record` and `PubLeafletPublication.Record` across 40+ files. Components now use the normalized types instead.

### 5. Updated Components

All components that consume document/publication data now:
1. Use pre-normalized data from contexts/hooks when available
2. Call normalization functions only when iterating over collections
3. Handle `null` returns from normalization (unrecognized formats) by not rendering

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Firehose                              │
│  (pub.leaflet.* and site.standard.* records)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    appview/index.ts                          │
│  Writes both formats to same tables (documents,             │
│  publications, publication_subscriptions)                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Database Tables                            │
│  documents.data, publications.record contain raw JSON       │
│  with $type field indicating format                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Data Fetchers / Contexts                        │
│  Call normalizeDocumentRecord() / normalizePublicationRecord()│
│  Return pre-normalized data to consumers                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Components                                │
│  Use NormalizedDocument / NormalizedPublication types       │
│  No direct casts to pub.leaflet types                       │
└─────────────────────────────────────────────────────────────┘
```

## Files Modified

### Core Infrastructure
- `appview/index.ts` - Firehose consumer writes site.standard to main tables
- `src/utils/normalizeRecords.ts` - New normalization utilities
- `lexicons/src/normalize.ts` - Core normalization functions

### Data Providers
- `components/PageSWRDataProvider.tsx` - `useLeafletPublicationData()` returns normalized data
- `app/lish/[did]/[publication]/dashboard/PublicationSWRProvider.tsx` - Added `useNormalizedPublicationRecord()`
- `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` - Returns normalized data

### Server-Side Data Fetchers
- `app/api/rpc/[command]/get_profile_data.ts`
- `app/(home-pages)/reader/getSubscriptions.ts`
- `app/(home-pages)/discover/getPublications.ts`
- `app/(home-pages)/reader/getReaderFeed.ts`
- `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts`
- `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts`

### Notification System
- `src/notifications.ts` - All hydration functions return normalized fields
- `components/Notifications/*.tsx` - Use pre-normalized data from props

### Various Components
- Removed casts to `PubLeafletDocument.Record` and `PubLeafletPublication.Record`
- Updated to use `NormalizedDocument` and `NormalizedPublication` types

## Handling Unrecognized Formats

When `normalizeDocumentRecord()` or `normalizePublicationRecord()` encounters a record that doesn't match either `pub.leaflet.*` or `site.standard.*` formats, it returns `null`. Components should handle this by not rendering:

```typescript
const normalized = normalizeDocumentRecord(data);
if (!normalized) return null; // Don't render unrecognized formats
```

## Testing

TypeScript compilation passes without errors. The normalization functions include type guards to safely handle both record formats.
