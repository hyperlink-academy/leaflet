# Data Restoration Plan for did:plc:x2xmijn2egk5g67u3cwkddzy

## Overview

User's `site.standard.publication/*` and `site.standard.document/*` records were deleted from their PDS by an external system. The appview firehose ingested these deletes, cascading deletions through our database. We have a point-in-time backup and need to restore.

**User DID:** `did:plc:x2xmijn2egk5g67u3cwkddzy`
**Backup DB:** `https://bjhtnewlvuekinenkoga.supabase.co`

## Key Insight: Table Structure

The `site_standard_*` tables are **legacy**. The firehose writes site.standard records to the main tables:
- `site.standard.publication/*` → `publications` table
- `site.standard.document/*` → `documents` table

So we restore to `publications` and `documents`, not the legacy `site_standard_*` tables.

---

## What Was Deleted

### PDS Records (need recreation)
- `site.standard.publication/*` records
- `site.standard.document/*` records

### Database Tables (cascaded deletes)

**From publications(uri) - CASCADE:**
| Table | What to Restore |
|-------|-----------------|
| `publications` | User's site.standard publications |
| `documents_in_publications` | Publication-document links |
| `publication_subscriptions` | Other users' subscriptions TO user's publications |
| `publication_domains` | Custom domain mappings |
| `leaflets_in_publications` | Leaflet-publication links |

**From documents(uri) - CASCADE:**
| Table | What to Restore |
|-------|-----------------|
| `documents` | User's site.standard documents |
| `documents_in_publications` | Publication-document links |
| `recommends_on_documents` | Other users' recommends on user's docs |
| `comments_on_documents` | Comments on user's docs |
| `document_mentions_in_bsky` | Bsky post mentions of user's docs |
| `leaflets_to_documents` | Leaflet-document links |

**SET NULL (not deleted):**
| Table | Column | Behavior |
|-------|--------|----------|
| `leaflets_in_publications` | `doc` | Set to NULL (row kept) |

### NOT Deleted
- `identities` - user's identity intact
- `pub.leaflet.*` records in PDS - old schema untouched
- `pub.leaflet.*` records in DB - old records still exist
- `permission_tokens` - leaflets still exist

---

## Phase 1: Data Extraction Script

Create `scripts/extract-backup-data.ts` to pull data from backup database.

### Queries to Run

```typescript
const DID = "did:plc:x2xmijn2egk5g67u3cwkddzy";

// 1. Publications (site.standard only)
SELECT * FROM publications
WHERE uri LIKE 'at://' || $1 || '/site.standard.publication/%';

// 2. Documents (site.standard only)
SELECT * FROM documents
WHERE uri LIKE 'at://' || $1 || '/site.standard.document/%';

// 3. Documents in Publications (for site.standard publications)
SELECT * FROM documents_in_publications
WHERE publication LIKE 'at://' || $1 || '/site.standard.publication/%';

// 4. Publication Subscriptions (OTHER users subscribed to user's publications)
SELECT * FROM publication_subscriptions
WHERE publication LIKE 'at://' || $1 || '/site.standard.publication/%';

// 5. Recommends on user's documents (OTHER users' recommends)
SELECT * FROM recommends_on_documents
WHERE document LIKE 'at://' || $1 || '/site.standard.document/%';

// 6. Comments on user's site.standard documents
SELECT * FROM comments_on_documents
WHERE document LIKE 'at://' || $1 || '/site.standard.document/%';

// 7. Document mentions in bsky
SELECT * FROM document_mentions_in_bsky
WHERE document LIKE 'at://' || $1 || '/site.standard.document/%';

// 8. Leaflets in publications (site.standard only)
SELECT * FROM leaflets_in_publications
WHERE publication LIKE 'at://' || $1 || '/site.standard.publication/%';

// 9. Leaflets to documents (site.standard only)
SELECT * FROM leaflets_to_documents
WHERE document LIKE 'at://' || $1 || '/site.standard.document/%';

// 10. Publication domains
SELECT * FROM publication_domains
WHERE publication LIKE 'at://' || $1 || '/site.standard.publication/%';
```

### Output Format

Save to `scripts/backup-data/user-restore-data.json`:
```typescript
{
  did: string,
  publications: Array<{
    uri: string,
    identity_did: string,
    name: string,
    record: Json,  // Full SiteStandardPublication.Record
    indexed_at: string,
  }>,
  documents: Array<{
    uri: string,
    data: Json,  // Full SiteStandardDocument.Record
    indexed_at: string,
  }>,
  documentsInPublications: Array<{
    publication: string,
    document: string,
    indexed_at: string,
  }>,
  publicationSubscriptions: Array<{
    publication: string,
    identity: string,
    created_at: string,
    record: Json,
    uri: string,  // NOT NULL - required field
  }>,
  recommendsOnDocuments: Array<{
    uri: string,
    record: Json,
    document: string,
    recommender_did: string,
    indexed_at: string,
  }>,
  comments: Array<{
    uri: string,
    document: string,
    record: Json,
    profile: string | null,
    indexed_at: string,
  }>,
  documentMentions: Array<{
    uri: string,
    document: string,
    link: string,
    indexed_at: string,
  }>,
  leafletsInPublications: Array<{
    publication: string,
    leaflet: string,
    doc: string | null,
    archived: boolean | null,
    title: string,
    description: string,
    cover_image: string | null,
    tags: string[] | null,
  }>,
  leafletsToDocuments: Array<{
    leaflet: string,
    document: string,
    title: string,
    description: string,
    created_at: string,
  }>,
  publicationDomains: Array<{
    publication: string,
    domain: string,
    identity: string,
    created_at: string,
  }>,
}
```

---

## Phase 2: Database Restoration Script

Create `scripts/restore-db-data.ts` to restore all database rows directly to production.

This script connects to the production database and restores all the extracted data. It runs locally with the production service role key.

```typescript
import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import backupData from "./backup-data/user-restore-data.json";

// Production database connection
const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_API_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

async function main() {
  console.log("=== Database Restoration ===");
  console.log(`DID: ${backupData.did}`);
  console.log(`Publications: ${backupData.publications.length}`);
  console.log(`Documents: ${backupData.documents.length}`);
  console.log("");

  // Step 1: Restore publications (must be first - other tables reference this)
  console.log("Restoring publications...");
  for (const pub of backupData.publications) {
    const { error } = await supabase.from("publications").upsert({
      uri: pub.uri,
      identity_did: pub.identity_did,
      name: pub.name,
      record: pub.record,
      indexed_at: pub.indexed_at,
    });
    if (error) console.error(`  Error upserting publication ${pub.uri}:`, error.message);
  }
  console.log(`  ✓ ${backupData.publications.length} publications`);

  // Step 2: Restore documents (must be before tables that reference documents)
  console.log("Restoring documents...");
  for (const doc of backupData.documents) {
    const { error } = await supabase.from("documents").upsert({
      uri: doc.uri,
      data: doc.data,
      indexed_at: doc.indexed_at,
    });
    if (error) console.error(`  Error upserting document ${doc.uri}:`, error.message);
  }
  console.log(`  ✓ ${backupData.documents.length} documents`);

  // Step 3: Restore documents_in_publications
  console.log("Restoring documents_in_publications...");
  for (const dip of backupData.documentsInPublications) {
    const { error } = await supabase.from("documents_in_publications").upsert({
      publication: dip.publication,
      document: dip.document,
      indexed_at: dip.indexed_at,
    });
    if (error) console.error(`  Error upserting doc-in-pub:`, error.message);
  }
  console.log(`  ✓ ${backupData.documentsInPublications.length} documents_in_publications`);

  // Step 4: Restore publication_subscriptions
  console.log("Restoring publication_subscriptions...");
  for (const sub of backupData.publicationSubscriptions) {
    const { error } = await supabase.from("publication_subscriptions").upsert({
      publication: sub.publication,
      identity: sub.identity,
      created_at: sub.created_at,
      record: sub.record,
      uri: sub.uri,
    });
    if (error) console.error(`  Error upserting subscription:`, error.message);
  }
  console.log(`  ✓ ${backupData.publicationSubscriptions.length} publication_subscriptions`);

  // Step 5: Restore recommends_on_documents
  console.log("Restoring recommends_on_documents...");
  for (const rec of backupData.recommendsOnDocuments) {
    const { error } = await supabase.from("recommends_on_documents").upsert({
      uri: rec.uri,
      record: rec.record,
      document: rec.document,
      recommender_did: rec.recommender_did,
      indexed_at: rec.indexed_at,
    });
    if (error) console.error(`  Error upserting recommend:`, error.message);
  }
  console.log(`  ✓ ${backupData.recommendsOnDocuments.length} recommends_on_documents`);

  // Step 6: Restore leaflets_in_publications
  console.log("Restoring leaflets_in_publications...");
  for (const lip of backupData.leafletsInPublications) {
    const { error } = await supabase.from("leaflets_in_publications").upsert({
      publication: lip.publication,
      leaflet: lip.leaflet,
      doc: lip.doc,
      archived: lip.archived,
      title: lip.title,
      description: lip.description,
      cover_image: lip.cover_image,
      tags: lip.tags,
    });
    if (error) console.error(`  Error upserting leaflet-in-pub:`, error.message);
  }
  console.log(`  ✓ ${backupData.leafletsInPublications.length} leaflets_in_publications`);

  // Step 7: Restore leaflets_to_documents
  console.log("Restoring leaflets_to_documents...");
  for (const ltd of backupData.leafletsToDocuments) {
    const { error } = await supabase.from("leaflets_to_documents").upsert({
      leaflet: ltd.leaflet,
      document: ltd.document,
      title: ltd.title,
      description: ltd.description,
      created_at: ltd.created_at,
    });
    if (error) console.error(`  Error upserting leaflet-to-doc:`, error.message);
  }
  console.log(`  ✓ ${backupData.leafletsToDocuments.length} leaflets_to_documents`);

  // Step 8: Restore comments_on_documents
  console.log("Restoring comments_on_documents...");
  for (const comment of backupData.comments) {
    const { error } = await supabase.from("comments_on_documents").upsert({
      uri: comment.uri,
      document: comment.document,
      record: comment.record,
      profile: comment.profile,
      indexed_at: comment.indexed_at,
    });
    if (error) console.error(`  Error upserting comment:`, error.message);
  }
  console.log(`  ✓ ${backupData.comments.length} comments_on_documents`);

  // Step 9: Restore document_mentions_in_bsky
  console.log("Restoring document_mentions_in_bsky...");
  for (const mention of backupData.documentMentions) {
    const { error } = await supabase.from("document_mentions_in_bsky").upsert({
      uri: mention.uri,
      document: mention.document,
      link: mention.link,
      indexed_at: mention.indexed_at,
    });
    if (error) console.error(`  Error upserting doc mention:`, error.message);
  }
  console.log(`  ✓ ${backupData.documentMentions.length} document_mentions_in_bsky`);

  // Step 10: Restore publication_domains
  console.log("Restoring publication_domains...");
  for (const pd of backupData.publicationDomains) {
    const { error } = await supabase.from("publication_domains").upsert({
      publication: pd.publication,
      domain: pd.domain,
      identity: pd.identity,
      created_at: pd.created_at,
    });
    if (error) console.error(`  Error upserting pub domain:`, error.message);
  }
  console.log(`  ✓ ${backupData.publicationDomains.length} publication_domains`);

  console.log("");
  console.log("=== Database restoration complete ===");
  console.log("");
  console.log("Next step: Run the Inngest function to restore PDS records.");
  console.log("Use: npx tsx scripts/trigger-pds-restore.ts");
}

main().catch(console.error);
```

---

## Phase 3: Inngest PDS Write Function

Create `app/api/inngest/functions/write_records_to_pds.ts`

This is a **generic** function that writes an array of records to a user's PDS. Reusable for any future PDS restoration or bulk write needs.

### Event Schema

Add to `app/api/inngest/client.ts` Events type:
```typescript
"user/write-records-to-pds": {
  data: {
    did: string;
    records: Array<{
      collection: string;  // e.g. "site.standard.publication"
      rkey: string;
      record: Json;
    }>;
  };
};
```

### Function Implementation

```typescript
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient } from "lexicons/api";

// Batch size to avoid Inngest payload limits and PDS rate limits
const BATCH_SIZE = 50;

// Helper to create authenticated agent - must be called fresh in each step
// (OAuth sessions cannot be serialized across Inngest steps)
async function createAuthenticatedAgent(did: string): Promise<AtpBaseClient> {
  const result = await restoreOAuthSession(did);
  if (!result.ok) {
    throw new Error(`Failed to restore OAuth session: ${result.error.message}`);
  }
  return new AtpBaseClient(
    result.value.fetchHandler.bind(result.value),
  );
}

export const write_records_to_pds = inngest.createFunction(
  { id: "write-records-to-pds" },
  { event: "user/write-records-to-pds" },
  async ({ event, step }) => {
    const { did, records } = event.data;

    // Step 1: Verify OAuth session is valid before proceeding
    await step.run("verify-oauth-session", async () => {
      const result = await restoreOAuthSession(did);
      if (!result.ok) {
        throw new Error(`OAuth restore failed: ${result.error.message}`);
      }
      return { success: true };
    });

    // Step 2: Write records to PDS in batches
    // Split records into batches to avoid payload limits and rate limiting
    const batches: typeof records[] = [];
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE));
    }

    let totalWritten = 0;
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchWritten = await step.run(`write-batch-${batchIndex}`, async () => {
        const agent = await createAuthenticatedAgent(did);
        let written = 0;
        for (const rec of batch) {
          await agent.com.atproto.repo.putRecord({
            repo: did,
            collection: rec.collection,
            rkey: rec.rkey,
            record: rec.record,
            validate: false,
          });
          written++;
        }
        return written;
      });
      totalWritten += batchWritten;
    }

    return {
      success: true,
      recordsWritten: totalWritten,
      batchCount: batches.length,
    };
  }
);
```

---

## Phase 4: Trigger PDS Restore Script

Create `scripts/trigger-pds-restore.ts`:

```typescript
import { inngest } from "app/api/inngest/client";
import { AtUri } from "@atproto/syntax";
import backupData from "./backup-data/user-restore-data.json";

async function main() {
  const did = backupData.did;

  // Build unified records array from publications and documents
  const records = [
    ...backupData.publications.map(p => ({
      collection: "site.standard.publication",
      rkey: new AtUri(p.uri).rkey,
      record: p.record,
    })),
    ...backupData.documents.map(d => ({
      collection: "site.standard.document",
      rkey: new AtUri(d.uri).rkey,
      record: d.data,
    })),
  ];

  console.log("Sending PDS write event to Inngest...");
  console.log(`DID: ${did}`);
  console.log(`Total records: ${records.length}`);
  console.log(`  - Publications: ${backupData.publications.length}`);
  console.log(`  - Documents: ${backupData.documents.length}`);

  await inngest.send({
    name: "user/write-records-to-pds",
    data: { did, records },
  });

  console.log("Event sent! Monitor Inngest dashboard for progress.");
}

main().catch(console.error);
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `scripts/extract-backup-data.ts` | Create | Extraction script for backup DB |
| `scripts/backup-data/user-restore-data.json` | Create (output) | Extracted data |
| `scripts/restore-db-data.ts` | Create | Local script to restore DB rows |
| `app/api/inngest/functions/write_records_to_pds.ts` | Create | Generic Inngest function for PDS writes |
| `app/api/inngest/client.ts` | Modify | Add `user/write-records-to-pds` event type |
| `app/api/inngest/route.tsx` | Modify | Register `write_records_to_pds` function |
| `scripts/trigger-pds-restore.ts` | Create | Script to trigger PDS restoration |

---

## Execution Order

1. **Run extraction script** against backup DB → outputs JSON file
2. **Review extracted data** - verify counts look reasonable
3. **Run `restore-db-data.ts`** with production env vars → restores all DB rows
4. **Verify DB restoration** - check counts in production DB
5. **Deploy Inngest function** to production (if not already deployed)
6. **Run `trigger-pds-restore.ts`** → triggers PDS restoration via Inngest
7. **Monitor Inngest dashboard** for completion/errors
8. **Run final verification steps**

---

## Verification

### 1. Check PDS Records
```bash
# List publications
curl "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:x2xmijn2egk5g67u3cwkddzy&collection=site.standard.publication"

# List documents
curl "https://bsky.social/xrpc/com.atproto.repo.listRecords?repo=did:plc:x2xmijn2egk5g67u3cwkddzy&collection=site.standard.document"
```

### 2. Check Database Counts
```sql
-- Publications
SELECT COUNT(*) FROM publications
WHERE uri LIKE 'at://did:plc:x2xmijn2egk5g67u3cwkddzy/site.standard.publication/%';

-- Documents
SELECT COUNT(*) FROM documents
WHERE uri LIKE 'at://did:plc:x2xmijn2egk5g67u3cwkddzy/site.standard.document/%';

-- Subscriptions to user's publications
SELECT COUNT(*) FROM publication_subscriptions
WHERE publication LIKE 'at://did:plc:x2xmijn2egk5g67u3cwkddzy/site.standard.publication/%';

-- Recommends on user's documents
SELECT COUNT(*) FROM recommends_on_documents
WHERE document LIKE 'at://did:plc:x2xmijn2egk5g67u3cwkddzy/site.standard.document/%';
```

### 3. UI Verification
- Have user log in
- Check their publications appear in dashboard
- Check documents appear within publications
- Verify leaflet associations work
- Check custom domains still route correctly
- Verify subscriber counts are restored

---

## Risk Mitigation

1. **Firehose race condition**: After PDS restoration, the firehose will pick up the new records and try to upsert them. This is safe - our DB already has the data with correct `indexed_at` timestamps, and upserts are idempotent.

2. **DB restoration is independent**: The database restoration script runs locally and doesn't require OAuth or production deployment. If it fails partway through, you can simply re-run it (upserts are idempotent).

3. **PDS partial failure**: Inngest steps are individually retryable. If the write step fails partway through, it will retry from the beginning, but `putRecord` is idempotent so already-written records are safe.

4. **OAuth session expiry**: If OAuth session is invalid, the Inngest function will fail fast in step 1 before any PDS writes. User would need to re-authenticate and the function can be re-triggered.

5. **Missing FK targets**:
   - `comments_on_documents.profile` → `bsky_profiles.did`: SET NULL on delete, so profiles might be missing. We restore with whatever profile value was in backup.
   - `document_mentions_in_bsky.uri` → `bsky_posts.uri`: The bsky_posts were not deleted, so FK targets still exist.
   - `recommends_on_documents.recommender_did` → `identities.atp_did`: Should exist since identities aren't deleted.
   - `publication_subscriptions.identity` → `identities.atp_did`: Should exist since these are other users who subscribed.

6. **Duplicate rkeys**: If user somehow recreated records with same rkeys, `putRecord` will overwrite. This is correct behavior.

7. **Order of operations**: DB restoration happens first, so the app will work immediately after that step (reads from DB). PDS restoration can happen after, and the firehose will just confirm what's already in the DB.

---

## Complete Cascade Summary

```
publications (deleted)
├── documents_in_publications → CASCADE DELETE
├── publication_subscriptions → CASCADE DELETE
├── publication_domains → CASCADE DELETE
└── leaflets_in_publications → CASCADE DELETE

documents (deleted)
├── documents_in_publications → CASCADE DELETE
├── recommends_on_documents → CASCADE DELETE
├── comments_on_documents → CASCADE DELETE
├── document_mentions_in_bsky → CASCADE DELETE
├── leaflets_to_documents → CASCADE DELETE
└── leaflets_in_publications.doc → SET NULL
```
