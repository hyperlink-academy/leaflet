import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient, SiteStandardPublication, SiteStandardDocument, SiteStandardGraphSubscription } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";
import { normalizePublicationRecord, normalizeDocumentRecord } from "src/utils/normalizeRecords";

type MigrationResult =
  | { success: true; oldUri: string; newUri: string; skipped?: boolean }
  | { success: false; error: string };

async function createAuthenticatedAgent(did: string): Promise<AtpBaseClient> {
  const result = await restoreOAuthSession(did);
  if (!result.ok) {
    throw new Error(`Failed to restore OAuth session: ${result.error.message}`);
  }
  const credentialSession = result.value;
  return new AtpBaseClient(
    credentialSession.fetchHandler.bind(credentialSession)
  );
}

export const migrate_user_to_standard = inngest.createFunction(
  { id: "migrate_user_to_standard" },
  { event: "user/migrate-to-standard" },
  async ({ event, step }) => {
    const { did } = event.data;

    const stats = {
      publicationsMigrated: 0,
      documentsMigrated: 0,
      userSubscriptionsMigrated: 0,
      referencesUpdated: 0,
      errors: [] as string[],
    };

    // Step 1: Verify OAuth session is valid
    await step.run("verify-oauth-session", async () => {
      const result = await restoreOAuthSession(did);
      if (!result.ok) {
        throw new Error(`Failed to restore OAuth session: ${result.error.message}`);
      }
      return { success: true };
    });

    // Step 2: Get user's pub.leaflet.publication records
    const oldPublications = await step.run("fetch-old-publications", async () => {
      const { data, error } = await supabaseServerClient
        .from("publications")
        .select("*")
        .eq("identity_did", did)
        .like("uri", `at://${did}/pub.leaflet.publication/%`);

      if (error) throw new Error(`Failed to fetch publications: ${error.message}`);
      return data || [];
    });

    // Step 3: Migrate each publication
    const publicationUriMap: Record<string, string> = {}; // old URI -> new URI

    for (const pub of oldPublications) {
      const aturi = new AtUri(pub.uri);

      // Skip if already a site.standard.publication
      if (aturi.collection === "site.standard.publication") {
        publicationUriMap[pub.uri] = pub.uri;
        continue;
      }

      const rkey = aturi.rkey;
      const normalized = normalizePublicationRecord(pub.record);

      if (!normalized) {
        stats.errors.push(`Publication ${pub.uri}: Failed to normalize publication record`);
        continue;
      }

      // Build site.standard.publication record
      const newRecord: SiteStandardPublication.Record = {
        $type: "site.standard.publication",
        name: normalized.name,
        url: normalized.url,
        description: normalized.description,
        icon: normalized.icon,
        theme: normalized.theme,
        basicTheme: normalized.basicTheme,
        preferences: normalized.preferences,
      };

      // Step: Write to PDS
      const pdsResult = await step.run(`pds-write-publication-${pub.uri}`, async () => {
        const agent = await createAuthenticatedAgent(did);
        const putResult = await agent.com.atproto.repo.putRecord({
          repo: did,
          collection: "site.standard.publication",
          rkey,
          record: newRecord,
          validate: false,
        });
        return { newUri: putResult.data.uri };
      });

      const newUri = pdsResult.newUri;

      // Step: Write to database
      const dbResult = await step.run(`db-write-publication-${pub.uri}`, async () => {
        const { error: dbError } = await supabaseServerClient
          .from("publications")
          .upsert({
            uri: newUri,
            identity_did: did,
            name: normalized.name,
            record: newRecord as Json,
          });

        if (dbError) {
          return { success: false as const, error: dbError.message };
        }
        return { success: true as const };
      });

      if (dbResult.success) {
        publicationUriMap[pub.uri] = newUri;
        stats.publicationsMigrated++;
      } else {
        stats.errors.push(`Publication ${pub.uri}: Database error: ${dbResult.error}`);
      }
    }

    // Step 4: Get and migrate documents for these publications
    const oldDocuments = await step.run("fetch-old-documents", async () => {
      const oldPubUris = Object.keys(publicationUriMap);
      if (oldPubUris.length === 0) return [];

      const { data, error } = await supabaseServerClient
        .from("documents_in_publications")
        .select("document, publication, documents(uri, data)")
        .in("publication", oldPubUris);

      if (error) throw new Error(`Failed to fetch documents: ${error.message}`);
      return data || [];
    });

    const documentUriMap: Record<string, string> = {}; // old URI -> new URI

    for (const docRow of oldDocuments) {
      if (!docRow.documents) continue;
      const doc = docRow.documents as { uri: string; data: Json };
      const aturi = new AtUri(doc.uri);

      // Skip if already a site.standard.document
      if (aturi.collection === "site.standard.document") {
        documentUriMap[doc.uri] = doc.uri;
        continue;
      }

      const rkey = aturi.rkey;
      const normalized = normalizeDocumentRecord(doc.data);

      if (!normalized) {
        stats.errors.push(`Document ${doc.uri}: Failed to normalize document record`);
        continue;
      }

      // Get the new publication URI
      const newPubUri = publicationUriMap[docRow.publication];
      if (!newPubUri) {
        stats.errors.push(`Document ${doc.uri}: No migrated publication found`);
        continue;
      }

      // Build site.standard.document record
      const newRecord: SiteStandardDocument.Record = {
        $type: "site.standard.document",
        title: normalized.title || "Untitled",
        site: newPubUri,
        publishedAt: normalized.publishedAt || new Date().toISOString(),
        description: normalized.description,
        content: normalized.content,
        path: normalized.path,
        tags: normalized.tags,
        coverImage: normalized.coverImage,
        bskyPostRef: normalized.bskyPostRef,
      };

      // Step: Write to PDS
      const pdsResult = await step.run(`pds-write-document-${doc.uri}`, async () => {
        const agent = await createAuthenticatedAgent(did);
        const putResult = await agent.com.atproto.repo.putRecord({
          repo: did,
          collection: "site.standard.document",
          rkey,
          record: newRecord,
          validate: false,
        });
        return { newUri: putResult.data.uri };
      });

      const newUri = pdsResult.newUri;

      // Step: Write to database
      const dbResult = await step.run(`db-write-document-${doc.uri}`, async () => {
        const { error: dbError } = await supabaseServerClient
          .from("documents")
          .upsert({
            uri: newUri,
            data: newRecord as Json,
          });

        if (dbError) {
          return { success: false as const, error: dbError.message };
        }

        // Add to documents_in_publications with new URIs
        await supabaseServerClient
          .from("documents_in_publications")
          .upsert({
            publication: newPubUri,
            document: newUri,
          });

        return { success: true as const };
      });

      if (dbResult.success) {
        documentUriMap[doc.uri] = newUri;
        stats.documentsMigrated++;
      } else {
        stats.errors.push(`Document ${doc.uri}: Database error: ${dbResult.error}`);
      }
    }

    // Step 5: Update references in database tables
    await step.run("update-references", async () => {
      // Update leaflets_in_publications - update publication and doc references
      for (const [oldUri, newUri] of Object.entries(publicationUriMap)) {
        const { error } = await supabaseServerClient
          .from("leaflets_in_publications")
          .update({ publication: newUri })
          .eq("publication", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      for (const [oldUri, newUri] of Object.entries(documentUriMap)) {
        const { error } = await supabaseServerClient
          .from("leaflets_in_publications")
          .update({ doc: newUri })
          .eq("doc", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update leaflets_to_documents - update document references
      for (const [oldUri, newUri] of Object.entries(documentUriMap)) {
        const { error } = await supabaseServerClient
          .from("leaflets_to_documents")
          .update({ document: newUri })
          .eq("document", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update publication_domains - update publication references
      for (const [oldUri, newUri] of Object.entries(publicationUriMap)) {
        const { error } = await supabaseServerClient
          .from("publication_domains")
          .update({ publication: newUri })
          .eq("publication", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update comments_on_documents - update document references
      for (const [oldUri, newUri] of Object.entries(documentUriMap)) {
        const { error } = await supabaseServerClient
          .from("comments_on_documents")
          .update({ document: newUri })
          .eq("document", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update document_mentions_in_bsky - update document references
      for (const [oldUri, newUri] of Object.entries(documentUriMap)) {
        const { error } = await supabaseServerClient
          .from("document_mentions_in_bsky")
          .update({ document: newUri })
          .eq("document", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update subscribers_to_publications - update publication references
      for (const [oldUri, newUri] of Object.entries(publicationUriMap)) {
        const { error } = await supabaseServerClient
          .from("subscribers_to_publications")
          .update({ publication: newUri })
          .eq("publication", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      // Update publication_subscriptions - update publication references for incoming subscriptions
      for (const [oldUri, newUri] of Object.entries(publicationUriMap)) {
        const { error } = await supabaseServerClient
          .from("publication_subscriptions")
          .update({ publication: newUri })
          .eq("publication", oldUri);

        if (!error) stats.referencesUpdated++;
      }

      return stats.referencesUpdated;
    });

    // Step 6: Migrate user's own subscriptions - subscriptions BY this user to other publications
    const userSubscriptions = await step.run("fetch-user-subscriptions", async () => {
      const { data, error } = await supabaseServerClient
        .from("publication_subscriptions")
        .select("*")
        .eq("identity", did)
        .like("uri", `at://${did}/pub.leaflet.graph.subscription/%`);

      if (error) throw new Error(`Failed to fetch user subscriptions: ${error.message}`);
      return data || [];
    });

    const userSubscriptionUriMap: Record<string, string> = {}; // old URI -> new URI

    for (const sub of userSubscriptions) {
      const aturi = new AtUri(sub.uri);

      // Skip if already a site.standard.graph.subscription
      if (aturi.collection === "site.standard.graph.subscription") {
        userSubscriptionUriMap[sub.uri] = sub.uri;
        continue;
      }

      const rkey = aturi.rkey;

      // Build site.standard.graph.subscription record
      const newRecord: SiteStandardGraphSubscription.Record = {
        $type: "site.standard.graph.subscription",
        publication: sub.publication,
      };

      // Step: Write to PDS
      const pdsResult = await step.run(`pds-write-subscription-${sub.uri}`, async () => {
        const agent = await createAuthenticatedAgent(did);
        const putResult = await agent.com.atproto.repo.putRecord({
          repo: did,
          collection: "site.standard.graph.subscription",
          rkey,
          record: newRecord,
          validate: false,
        });
        return { newUri: putResult.data.uri };
      });

      const newUri = pdsResult.newUri;

      // Step: Write to database
      const dbResult = await step.run(`db-write-subscription-${sub.uri}`, async () => {
        const { error: dbError } = await supabaseServerClient
          .from("publication_subscriptions")
          .update({
            uri: newUri,
            record: newRecord as Json,
          })
          .eq("uri", sub.uri);

        if (dbError) {
          return { success: false as const, error: dbError.message };
        }
        return { success: true as const };
      });

      if (dbResult.success) {
        userSubscriptionUriMap[sub.uri] = newUri;
        stats.userSubscriptionsMigrated++;
      } else {
        stats.errors.push(`User subscription ${sub.uri}: Database error: ${dbResult.error}`);
      }
    }

    // Step 7: Delete old records from our database tables
    await step.run("delete-old-db-records", async () => {
      const oldPubUris = Object.keys(publicationUriMap).filter(uri =>
        new AtUri(uri).collection === "pub.leaflet.publication"
      );
      const oldDocUris = Object.keys(documentUriMap).filter(uri =>
        new AtUri(uri).collection === "pub.leaflet.document"
      );

      // NOTE: We intentionally keep old documents_in_publications entries.
      // New entries are created in Step 4 with the new URIs, but the old entries
      // should remain so that notifications and other references that point to
      // old document/publication URIs can still look up the relationship.

      // Delete from documents (old document URIs)
      if (oldDocUris.length > 0) {
        await supabaseServerClient
          .from("documents")
          .delete()
          .in("uri", oldDocUris);
      }

      // Delete from publications (old publication URIs)
      if (oldPubUris.length > 0) {
        await supabaseServerClient
          .from("publications")
          .delete()
          .in("uri", oldPubUris);
      }
    });

    return {
      success: stats.errors.length === 0,
      stats,
      publicationUriMap,
      documentUriMap,
      userSubscriptionUriMap,
    };
  }
);
