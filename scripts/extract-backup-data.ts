import { createClient } from "@supabase/supabase-js";
import { Database } from "supabase/database.types";
import * as fs from "fs";
import * as path from "path";

const DID = "did:plc:x2xmijn2egk5g67u3cwkddzy";

// Backup database connection
const BACKUP_DB_URL = "https://bjhtnewlvuekinenkoga.supabase.co";
const BACKUP_SERVICE_ROLE_KEY = process.env.BACKUP_SUPABASE_SERVICE_ROLE_KEY;

if (!BACKUP_SERVICE_ROLE_KEY) {
  console.error("Error: BACKUP_SUPABASE_SERVICE_ROLE_KEY environment variable is required");
  process.exit(1);
}

const supabase = createClient<Database>(BACKUP_DB_URL, BACKUP_SERVICE_ROLE_KEY);

async function main() {
  console.log("=== Extracting Backup Data ===");
  console.log(`DID: ${DID}`);
  console.log(`Backup DB: ${BACKUP_DB_URL}`);
  console.log("");

  // 1. Publications (site.standard only)
  console.log("Fetching publications...");
  const { data: publications, error: pubError } = await supabase
    .from("publications")
    .select("*")
    .like("uri", `at://${DID}/site.standard.publication/%`);

  if (pubError) throw new Error(`Failed to fetch publications: ${pubError.message}`);
  console.log(`  Found ${publications?.length ?? 0} publications`);

  // 2. Documents (site.standard only)
  console.log("Fetching documents...");
  const { data: documents, error: docError } = await supabase
    .from("documents")
    .select("*")
    .like("uri", `at://${DID}/site.standard.document/%`);

  if (docError) throw new Error(`Failed to fetch documents: ${docError.message}`);
  console.log(`  Found ${documents?.length ?? 0} documents`);

  // 3. Documents in Publications (for site.standard publications)
  console.log("Fetching documents_in_publications...");
  const { data: documentsInPublications, error: dipError } = await supabase
    .from("documents_in_publications")
    .select("*")
    .like("publication", `at://${DID}/site.standard.publication/%`);

  if (dipError) throw new Error(`Failed to fetch documents_in_publications: ${dipError.message}`);
  console.log(`  Found ${documentsInPublications?.length ?? 0} documents_in_publications`);

  // 4. Publication Subscriptions (OTHER users subscribed to user's publications)
  console.log("Fetching publication_subscriptions...");
  const { data: publicationSubscriptions, error: subError } = await supabase
    .from("publication_subscriptions")
    .select("*")
    .like("publication", `at://${DID}/site.standard.publication/%`);

  if (subError) throw new Error(`Failed to fetch publication_subscriptions: ${subError.message}`);
  console.log(`  Found ${publicationSubscriptions?.length ?? 0} publication_subscriptions`);

  // 5. Recommends on user's documents (OTHER users' recommends)
  console.log("Fetching recommends_on_documents...");
  const { data: recommendsOnDocuments, error: recError } = await supabase
    .from("recommends_on_documents")
    .select("*")
    .like("document", `at://${DID}/site.standard.document/%`);

  if (recError) throw new Error(`Failed to fetch recommends_on_documents: ${recError.message}`);
  console.log(`  Found ${recommendsOnDocuments?.length ?? 0} recommends_on_documents`);

  // 6. Comments on user's site.standard documents
  console.log("Fetching comments_on_documents...");
  const { data: comments, error: commentError } = await supabase
    .from("comments_on_documents")
    .select("*")
    .like("document", `at://${DID}/site.standard.document/%`);

  if (commentError) throw new Error(`Failed to fetch comments_on_documents: ${commentError.message}`);
  console.log(`  Found ${comments?.length ?? 0} comments_on_documents`);

  // 7. Document mentions in bsky
  console.log("Fetching document_mentions_in_bsky...");
  const { data: documentMentions, error: mentionError } = await supabase
    .from("document_mentions_in_bsky")
    .select("*")
    .like("document", `at://${DID}/site.standard.document/%`);

  if (mentionError) throw new Error(`Failed to fetch document_mentions_in_bsky: ${mentionError.message}`);
  console.log(`  Found ${documentMentions?.length ?? 0} document_mentions_in_bsky`);

  // 8. Leaflets in publications (site.standard only)
  console.log("Fetching leaflets_in_publications...");
  const { data: leafletsInPublications, error: lipError } = await supabase
    .from("leaflets_in_publications")
    .select("*")
    .like("publication", `at://${DID}/site.standard.publication/%`);

  if (lipError) throw new Error(`Failed to fetch leaflets_in_publications: ${lipError.message}`);
  console.log(`  Found ${leafletsInPublications?.length ?? 0} leaflets_in_publications`);

  // 9. Leaflets to documents (site.standard only)
  console.log("Fetching leaflets_to_documents...");
  const { data: leafletsToDocuments, error: ltdError } = await supabase
    .from("leaflets_to_documents")
    .select("*")
    .like("document", `at://${DID}/site.standard.document/%`);

  if (ltdError) throw new Error(`Failed to fetch leaflets_to_documents: ${ltdError.message}`);
  console.log(`  Found ${leafletsToDocuments?.length ?? 0} leaflets_to_documents`);

  // 10. Publication domains
  console.log("Fetching publication_domains...");
  const { data: publicationDomains, error: pdError } = await supabase
    .from("publication_domains")
    .select("*")
    .like("publication", `at://${DID}/site.standard.publication/%`);

  if (pdError) throw new Error(`Failed to fetch publication_domains: ${pdError.message}`);
  console.log(`  Found ${publicationDomains?.length ?? 0} publication_domains`);

  // Build output object
  const output = {
    did: DID,
    publications: (publications ?? []).map((p) => ({
      uri: p.uri,
      identity_did: p.identity_did,
      name: p.name,
      record: p.record,
      indexed_at: p.indexed_at,
    })),
    documents: (documents ?? []).map((d) => ({
      uri: d.uri,
      data: d.data,
      indexed_at: d.indexed_at,
    })),
    documentsInPublications: (documentsInPublications ?? []).map((dip) => ({
      publication: dip.publication,
      document: dip.document,
      indexed_at: dip.indexed_at,
    })),
    publicationSubscriptions: (publicationSubscriptions ?? []).map((sub) => ({
      publication: sub.publication,
      identity: sub.identity,
      created_at: sub.created_at,
      record: sub.record,
      uri: sub.uri,
    })),
    recommendsOnDocuments: (recommendsOnDocuments ?? []).map((rec) => ({
      uri: rec.uri,
      record: rec.record,
      document: rec.document,
      recommender_did: rec.recommender_did,
      indexed_at: rec.indexed_at,
    })),
    comments: (comments ?? []).map((c) => ({
      uri: c.uri,
      document: c.document,
      record: c.record,
      profile: c.profile,
      indexed_at: c.indexed_at,
    })),
    documentMentions: (documentMentions ?? []).map((m) => ({
      uri: m.uri,
      document: m.document,
      link: m.link,
      indexed_at: m.indexed_at,
    })),
    leafletsInPublications: (leafletsInPublications ?? []).map((lip) => ({
      publication: lip.publication,
      leaflet: lip.leaflet,
      doc: lip.doc,
      archived: lip.archived,
      title: lip.title,
      description: lip.description,
      cover_image: lip.cover_image,
      tags: lip.tags,
    })),
    leafletsToDocuments: (leafletsToDocuments ?? []).map((ltd) => ({
      leaflet: ltd.leaflet,
      document: ltd.document,
      title: ltd.title,
      description: ltd.description,
      created_at: ltd.created_at,
    })),
    publicationDomains: (publicationDomains ?? []).map((pd) => ({
      publication: pd.publication,
      domain: pd.domain,
      identity: pd.identity,
      created_at: pd.created_at,
    })),
  };

  // Write to file
  const outputPath = path.join(__dirname, "backup-data", "user-restore-data.json");
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log("");
  console.log("=== Extraction Complete ===");
  console.log(`Output written to: ${outputPath}`);
  console.log("");
  console.log("Summary:");
  console.log(`  Publications: ${output.publications.length}`);
  console.log(`  Documents: ${output.documents.length}`);
  console.log(`  Documents in Publications: ${output.documentsInPublications.length}`);
  console.log(`  Publication Subscriptions: ${output.publicationSubscriptions.length}`);
  console.log(`  Recommends on Documents: ${output.recommendsOnDocuments.length}`);
  console.log(`  Comments: ${output.comments.length}`);
  console.log(`  Document Mentions: ${output.documentMentions.length}`);
  console.log(`  Leaflets in Publications: ${output.leafletsInPublications.length}`);
  console.log(`  Leaflets to Documents: ${output.leafletsToDocuments.length}`);
  console.log(`  Publication Domains: ${output.publicationDomains.length}`);
}

main().catch(console.error);
