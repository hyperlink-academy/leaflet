# site.standard.* Migration Review

## Overview
This migration adds support for the `site.standard.*` lexicon schema alongside the existing `pub.leaflet.*` schema. The goal is to unify how documents and publications are stored and accessed through a normalization layer.

## Architecture Analysis

### Core Strategy: Normalization Layer
The migration uses a **read-time normalization** approach:
- Both `pub.leaflet.*` and `site.standard.*` records are stored in the same database tables (`documents`, `publications`)
- When reading, a normalization layer converts both formats to the canonical `site.standard.*` format
- The canonical format (`NormalizedDocument`, `NormalizedPublication`) is what components consume

**Key Files:**
- `lexicons/src/normalize.ts` - Core normalization functions and types
- `src/utils/normalizeRecords.ts` - Database-aware wrappers for normalization

### Database Schema
The schema adds new tables but continues to use existing tables for both formats:
- `site_standard_publications` - New table (but appears unused in migration?)
- `site_standard_documents` - New table (but appears unused in migration?)
- `site_standard_documents_in_publications` - Junction table
- `site_standard_subscriptions` - New subscription table

**Question:** Why are new tables added if both formats use the existing `documents` and `publications` tables?

### Appview (Firehose Consumer)
The appview (`appview/index.ts`) now:
- Listens for `site.standard.*` collections on the firehose
- Stores both `pub.leaflet.*` and `site.standard.*` records in the **same** tables
- Uses the same storage structure (documents/publications tables)

### Context Refactoring
Major change: `PostPageContext.tsx` is **deleted** and replaced with:
- `DocumentContext.tsx` - Provides normalized document/publication data
- `LeafletContentContext.tsx` - Provides leaflet-specific content (pages)

This separation allows:
- Components to access normalized data without knowing the source format
- Content-specific handling to be isolated

## Key Questions/Concerns

### 1. Database Table Strategy (CLARIFIED)
The schema has **two parallel storage strategies**:

**Strategy 1 - Live Appview (firehose)**:
- Both `pub.leaflet.*` and `site.standard.*` records → existing `documents` and `publications` tables
- Uses normalization layer to read both formats uniformly

**Strategy 2 - Backfill Script** (`scripts/backfill-site-standard.ts`):
- Only `site.standard.*` records → new `site_standard_*` tables
- For historical data backfill from the network

**CONCERN**: This creates data duplication/inconsistency:
- Live `site.standard.*` records go to `documents` table
- Backfilled `site.standard.*` records go to `site_standard_documents` table
- No code appears to READ from the `site_standard_*` tables

**Questions to resolve**:
- Is the backfill script meant to populate the main tables instead?
- Are the `site_standard_*` tables temporary or for a future migration phase?
- Will there be code to merge/unify these tables?

### 2. Legacy Data Handling
The normalization functions (`isLeafletDocument`, etc.) include fallback detection:
```typescript
// Legacy records without $type but with pages array
(Array.isArray(r.pages) && typeof r.author === "string")
```
This suggests there may be legacy data without proper `$type` discrimination.

### 3. Null Safety in Normalization
Multiple places call `normalizeDocumentRecord` which can return `null`. Need to verify all call sites handle null properly.

### 4. Theme Handling
The migration preserves theme in two places:
- `normalizedPublication?.theme` - publication-level theme
- `normalizedDocument?.theme` - document-level theme (for backwards compat)

Components use: `let theme = normalizedPublication?.theme || normalizedDocument?.theme`

### 5. Field Mapping Changes
Key field mappings in normalization:
- `publication` (leaflet) → `site` (standard)
- `postRef` (leaflet) → `bskyPostRef` (standard)
- `pages` (leaflet) → `content: { $type: "pub.leaflet.content", pages }` (standard)
- `base_path` (leaflet) → `url` (standard) with `https://` prefix

---

## Files Changed Review Status

### Core Infrastructure (Reviewed)
- [x] `src/utils/normalizeRecords.ts` - Clean wrapper implementation
- [x] `lexicons/src/normalize.ts` - Core normalization logic
- [x] `drizzle/schema.ts` - New tables added
- [x] `drizzle/relations.ts` - Relations for new tables
- [x] `appview/index.ts` - Firehose handling for both formats
- [x] `contexts/DocumentContext.tsx` - New context
- [x] `contexts/LeafletContentContext.tsx` - New context

### Data Fetching (Needs Review)
- [x] `app/lish/[did]/[publication]/[rkey]/getPostPageData.ts` - Key data fetcher
- [ ] `app/(home-pages)/reader/getReaderFeed.ts`
- [ ] `app/(home-pages)/reader/getSubscriptions.ts`
- [ ] `app/(home-pages)/discover/getPublications.ts`
- [ ] `app/(home-pages)/p/[didOrHandle]/getProfilePosts.ts`
- [ ] `app/(home-pages)/tag/[tag]/getDocumentsByTag.ts`

### Component Updates (Needs Review)
- [ ] Notification components (6 files)
- [ ] Post page components (multiple files)
- [ ] Dashboard components
- [ ] Theme components

### API Routes (Needs Review)
- [ ] `app/api/rpc/[command]/get_profile_data.ts`
- [ ] `app/api/rpc/[command]/get_publication_data.ts`
- [ ] `app/lish/feeds/[...path]/route.ts`
- [ ] Other routes

---

## Delegated Reviews

See separate sections for detailed file-by-file reviews.
