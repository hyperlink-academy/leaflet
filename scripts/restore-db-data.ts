import { createClient } from "@supabase/supabase-js";
import { Database, Json } from "supabase/database.types";
import backupDataRaw from "./backup-data/user-restore-data.json";

// Type definition for the backup data structure
interface BackupData {
  did: string;
  publications: Array<{
    uri: string;
    identity_did: string;
    name: string;
    record: Json;
    indexed_at: string;
  }>;
  documents: Array<{
    uri: string;
    data: Json;
    indexed_at: string;
  }>;
  documentsInPublications: Array<{
    publication: string;
    document: string;
    indexed_at: string;
  }>;
  publicationSubscriptions: Array<{
    publication: string;
    identity: string;
    created_at: string;
    record: Json;
    uri: string;
  }>;
  recommendsOnDocuments: Array<{
    uri: string;
    record: Json;
    document: string;
    recommender_did: string;
    indexed_at: string;
  }>;
  comments: Array<{
    uri: string;
    document: string | null;
    record: Json;
    profile: string | null;
    indexed_at: string;
  }>;
  documentMentions: Array<{
    uri: string;
    document: string;
    link: string;
    indexed_at: string;
  }>;
  leafletsInPublications: Array<{
    publication: string;
    leaflet: string;
    doc: string | null;
    archived: boolean | null;
    title: string;
    description: string;
    cover_image: string | null;
    tags: string[] | null;
  }>;
  leafletsToDocuments: Array<{
    leaflet: string;
    document: string;
    title: string;
    description: string;
    created_at: string;
  }>;
  publicationDomains: Array<{
    publication: string;
    domain: string;
    identity: string;
    created_at: string;
  }>;
}

const backupData = backupDataRaw as BackupData;

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
