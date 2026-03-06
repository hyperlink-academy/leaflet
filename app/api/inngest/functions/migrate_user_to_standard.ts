import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import {
  AtpBaseClient,
  SiteStandardPublication,
  SiteStandardDocument,
  SiteStandardGraphSubscription,
} from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";
import {
  normalizePublicationRecord,
  normalizeDocumentRecord,
} from "src/utils/normalizeRecords";

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
    credentialSession.fetchHandler.bind(credentialSession),
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
      standardDocumentsFixed: 0,
      userSubscriptionsMigrated: 0,
      referencesUpdated: 0,
      errors: [] as string[],
    };

    // Step 1: Verify OAuth session is valid
    const oauthValid = await step.run("verify-oauth-session", async () => {
      const result = await restoreOAuthSession(did);
      if (!result.ok) {
        // Mark identity as needing migration so we can retry later
        await supabaseServerClient
          .from("identities")
          .update({
            metadata: { needsStandardSiteMigration: true },
          })
          .eq("atp_did", did);

        return { success: false, error: result.error.message };
      }
      return { success: true };
    });

    if (!oauthValid.success) {
      return {
        success: false,
        error: `Failed to restore OAuth session`,
        stats,
        publicationUriMap: {},
        documentUriMap: {},
        userSubscriptionUriMap: {},
      };
    }

    // Step 2: Get user's pub.leaflet.publication records
    const oldPublications = await step.run(
      "fetch-old-publications",
      async () => {
        const { data, error } = await supabaseServerClient
          .from("publications")
          .select("*")
          .eq("identity_did", did)
          .like("uri", `at://${did}/pub.leaflet.publication/%`);

        if (error)
          throw new Error(`Failed to fetch publications: ${error.message}`);
        return data || [];
      },
    );

    // Step 3: Migrate all publications in parallel
    const publicationUriMap: Record<string, string> = {}; // old URI -> new URI

    // Prepare publications that need migration
    const publicationsToMigrate = oldPublications
      .map((pub) => {
        const aturi = new AtUri(pub.uri);

        // Skip if already a site.standard.publication
        if (aturi.collection === "site.standard.publication") {
          publicationUriMap[pub.uri] = pub.uri;
          return null;
        }

        const rkey = aturi.rkey;
        const normalized = normalizePublicationRecord(pub.record);

        if (!normalized) {
          stats.errors.push(
            `Publication ${pub.uri}: Failed to normalize publication record`,
          );
          return null;
        }

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

        return { pub, rkey, normalized, newRecord };
      })
      .filter((x) => x !== null);

    // Run PDS + DB writes together for each publication
    const pubResults = await Promise.all(
      publicationsToMigrate.map(({ pub, rkey, normalized, newRecord }) =>
        step.run(`migrate-publication-${pub.uri}`, async () => {
          // PDS write
          const agent = await createAuthenticatedAgent(did);
          const putResult = await agent.com.atproto.repo.putRecord({
            repo: did,
            collection: "site.standard.publication",
            rkey,
            record: newRecord,
            validate: false,
          });
          const newUri = putResult.data.uri;

          // DB write
          const { error: dbError } = await supabaseServerClient
            .from("publications")
            .upsert({
              uri: newUri,
              identity_did: did,
              name: normalized.name,
              record: newRecord as Json,
            });

          if (dbError) {
            return {
              success: false as const,
              oldUri: pub.uri,
              newUri,
              error: dbError.message,
            };
          }
          return { success: true as const, oldUri: pub.uri, newUri };
        }),
      ),
    );

    // Process results
    for (const result of pubResults) {
      if (result.success) {
        publicationUriMap[result.oldUri] = result.newUri;
        stats.publicationsMigrated++;
      } else {
        stats.errors.push(
          `Publication ${result.oldUri}: Database error: ${result.error}`,
        );
      }
    }

    // Step 4: Get ALL user's documents and their publication associations in parallel
    const [oldDocuments, allDocumentPublications] = await Promise.all([
      step.run("fetch-old-documents", async () => {
        const { data, error } = await supabaseServerClient
          .from("documents")
          .select("uri, data")
          .like("uri", `at://${did}/pub.leaflet.document/%`);

        if (error)
          throw new Error(`Failed to fetch documents: ${error.message}`);
        return data || [];
      }),
      step.run("fetch-document-publications", async () => {
        const { data, error } = await supabaseServerClient
          .from("documents_in_publications")
          .select("document, publication")
          .like("document", `at://${did}/pub.leaflet.document/%`);

        if (error)
          throw new Error(
            `Failed to fetch document publications: ${error.message}`,
          );
        return data || [];
      }),
    ]);

    // Create a map of document URI -> publication URI
    const documentPublicationMap: Record<string, string> = {};
    for (const row of allDocumentPublications) {
      documentPublicationMap[row.document] = row.publication;
    }

    const documentUriMap: Record<string, string> = {}; // old URI -> new URI

    // Prepare documents that need migration
    const documentsToMigrate = oldDocuments
      .map((doc) => {
        const aturi = new AtUri(doc.uri);

        // Skip if already a site.standard.document
        if (aturi.collection === "site.standard.document") {
          documentUriMap[doc.uri] = doc.uri;
          return null;
        }

        const rkey = aturi.rkey;
        const normalized = normalizeDocumentRecord(doc.data, doc.uri);

        if (!normalized) {
          stats.errors.push(
            `Document ${doc.uri}: Failed to normalize document record`,
          );
          return null;
        }

        // Determine the site field:
        // - If document is in a publication, use the new publication URI (if migrated) or old URI
        // - If standalone, use the HTTPS URL format
        const oldPubUri = documentPublicationMap[doc.uri];
        let siteValue: string;

        if (oldPubUri) {
          // Document is in a publication - use new URI if migrated, otherwise keep old
          siteValue = publicationUriMap[oldPubUri] || oldPubUri;
        } else {
          // Standalone document - use HTTPS URL format
          siteValue = `https://leaflet.pub/p/${did}`;
        }

        // Build site.standard.document record
        const newRecord: SiteStandardDocument.Record = {
          $type: "site.standard.document",
          title: normalized.title || "Untitled",
          site: siteValue,
          path: "/" + rkey,
          publishedAt: normalized.publishedAt || new Date().toISOString(),
          description: normalized.description,
          content: normalized.content,
          tags: normalized.tags,
          coverImage: normalized.coverImage,
          bskyPostRef: normalized.bskyPostRef,
        };

        return { doc, rkey, normalized, newRecord, oldPubUri };
      })
      .filter((x) => x !== null);

    // Run PDS + DB writes together for each document
    const docResults = await Promise.all(
      documentsToMigrate.map(({ doc, rkey, newRecord, oldPubUri }) =>
        step.run(`migrate-document-${doc.uri}`, async () => {
          // PDS write
          const agent = await createAuthenticatedAgent(did);
          const putResult = await agent.com.atproto.repo.putRecord({
            repo: did,
            collection: "site.standard.document",
            rkey,
            record: newRecord,
            validate: false,
          });
          const newUri = putResult.data.uri;

          // DB write
          const { error: dbError } = await supabaseServerClient
            .from("documents")
            .upsert({
              uri: newUri,
              data: newRecord as Json,
            });

          if (dbError) {
            return {
              success: false as const,
              oldUri: doc.uri,
              newUri,
              error: dbError.message,
            };
          }

          // If document was in a publication, add to documents_in_publications with new URIs
          if (oldPubUri) {
            const newPubUri = publicationUriMap[oldPubUri] || oldPubUri;
            await supabaseServerClient
              .from("documents_in_publications")
              .upsert({
                publication: newPubUri,
                document: newUri,
              });
          }

          return { success: true as const, oldUri: doc.uri, newUri };
        }),
      ),
    );

    // Process results
    for (const result of docResults) {
      if (result.success) {
        documentUriMap[result.oldUri] = result.newUri;
        stats.documentsMigrated++;
      } else {
        stats.errors.push(
          `Document ${result.oldUri}: Database error: ${result.error}`,
        );
      }
    }

    // Step 4b: Fix existing site.standard.document records that reference pub.leaflet.publication
    // This handles the case where site.standard.document records were created pointing to
    // pub.leaflet.publication URIs before the publication was migrated to site.standard.publication
    const existingStandardDocs = await step.run(
      "fetch-existing-standard-documents",
      async () => {
        const { data, error } = await supabaseServerClient
          .from("documents")
          .select("uri, data")
          .like("uri", `at://${did}/site.standard.document/%`);

        if (error)
          throw new Error(
            `Failed to fetch existing standard documents: ${error.message}`,
          );
        return data || [];
      },
    );

    // Find documents that reference pub.leaflet.publication and need their site field updated
    const standardDocsToFix = existingStandardDocs
      .map((doc) => {
        const data = doc.data as SiteStandardDocument.Record;
        const site = data?.site;

        // Check if site field references a pub.leaflet.publication
        if (!site || !site.includes("/pub.leaflet.publication/")) {
          return null;
        }

        try {
          const oldPubAturi = new AtUri(site);
          const newPubUri = `at://${oldPubAturi.hostname}/site.standard.publication/${oldPubAturi.rkey}`;

          // Only fix if we have the new publication in our map (meaning it was migrated)
          // or if the new publication exists (check against all migrated publications)
          if (
            publicationUriMap[site] ||
            Object.values(publicationUriMap).includes(newPubUri)
          ) {
            const docAturi = new AtUri(doc.uri);
            const updatedRecord: SiteStandardDocument.Record = {
              ...data,
              site: newPubUri,
            };

            return {
              doc,
              rkey: docAturi.rkey,
              oldSite: site,
              newSite: newPubUri,
              updatedRecord,
            };
          }
        } catch (e) {
          stats.errors.push(`Invalid site URI in document ${doc.uri}: ${site}`);
        }

        return null;
      })
      .filter((x) => x !== null);

    // Update these documents on PDS and in database
    if (standardDocsToFix.length > 0) {
      const fixResults = await Promise.all(
        standardDocsToFix.map(({ doc, rkey, oldSite, newSite, updatedRecord }) =>
          step.run(`fix-standard-document-${doc.uri}`, async () => {
            // PDS write to update the site field
            const agent = await createAuthenticatedAgent(did);
            await agent.com.atproto.repo.putRecord({
              repo: did,
              collection: "site.standard.document",
              rkey,
              record: updatedRecord,
              validate: false,
            });

            // DB write
            const { error: dbError } = await supabaseServerClient
              .from("documents")
              .update({ data: updatedRecord as Json })
              .eq("uri", doc.uri);

            if (dbError) {
              return {
                success: false as const,
                uri: doc.uri,
                error: dbError.message,
              };
            }

            // Update documents_in_publications to point to new publication URI
            await supabaseServerClient
              .from("documents_in_publications")
              .upsert({
                publication: newSite,
                document: doc.uri,
              });

            // Remove old publication reference if different
            if (oldSite !== newSite) {
              await supabaseServerClient
                .from("documents_in_publications")
                .delete()
                .eq("publication", oldSite)
                .eq("document", doc.uri);
            }

            return { success: true as const, uri: doc.uri };
          }),
        ),
      );

      for (const result of fixResults) {
        if (result.success) {
          stats.standardDocumentsFixed++;
        } else {
          stats.errors.push(
            `Fix standard document ${result.uri}: Database error: ${result.error}`,
          );
        }
      }
    }

    // Step 5: Update references in database tables (all in parallel)
    await step.run("update-references", async () => {
      const pubEntries = Object.entries(publicationUriMap);
      const docEntries = Object.entries(documentUriMap);

      const updatePromises = [
        // Update leaflets_in_publications - publication references
        ...pubEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("leaflets_in_publications")
            .update({ publication: newUri })
            .eq("publication", oldUri),
        ),
        // Update leaflets_in_publications - doc references
        ...docEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("leaflets_in_publications")
            .update({ doc: newUri })
            .eq("doc", oldUri),
        ),
        // Update leaflets_to_documents - document references
        ...docEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("leaflets_to_documents")
            .update({ document: newUri })
            .eq("document", oldUri),
        ),
        // Update publication_domains - publication references
        ...pubEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("publication_domains")
            .update({ publication: newUri })
            .eq("publication", oldUri),
        ),
        // Update comments_on_documents - document references
        ...docEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("comments_on_documents")
            .update({ document: newUri })
            .eq("document", oldUri),
        ),
        // Update document_mentions_in_bsky - document references
        ...docEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("document_mentions_in_bsky")
            .update({ document: newUri })
            .eq("document", oldUri),
        ),
        // Update subscribers_to_publications - publication references
        ...pubEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("subscribers_to_publications")
            .update({ publication: newUri })
            .eq("publication", oldUri),
        ),
        // Update publication_subscriptions - publication references
        ...pubEntries.map(([oldUri, newUri]) =>
          supabaseServerClient
            .from("publication_subscriptions")
            .update({ publication: newUri })
            .eq("publication", oldUri),
        ),
      ];

      const results = await Promise.all(updatePromises);
      stats.referencesUpdated = results.filter((r) => !r.error).length;
      return stats.referencesUpdated;
    });

    // Step 6: Migrate user's own subscriptions - subscriptions BY this user to other publications
    const userSubscriptions = await step.run(
      "fetch-user-subscriptions",
      async () => {
        const { data, error } = await supabaseServerClient
          .from("publication_subscriptions")
          .select("*")
          .eq("identity", did)
          .like("uri", `at://${did}/pub.leaflet.graph.subscription/%`);

        if (error)
          throw new Error(
            `Failed to fetch user subscriptions: ${error.message}`,
          );
        return data || [];
      },
    );

    const userSubscriptionUriMap: Record<string, string> = {}; // old URI -> new URI

    // Prepare subscriptions that need migration
    const subscriptionsToMigrate = userSubscriptions
      .map((sub) => {
        const aturi = new AtUri(sub.uri);

        // Skip if already a site.standard.graph.subscription
        if (aturi.collection === "site.standard.graph.subscription") {
          userSubscriptionUriMap[sub.uri] = sub.uri;
          return null;
        }

        const rkey = aturi.rkey;
        const newRecord: SiteStandardGraphSubscription.Record = {
          $type: "site.standard.graph.subscription",
          publication: sub.publication,
        };

        return { sub, rkey, newRecord };
      })
      .filter((x) => x !== null);

    // Run PDS + DB writes together for each subscription
    const subResults = await Promise.all(
      subscriptionsToMigrate.map(({ sub, rkey, newRecord }) =>
        step.run(`migrate-subscription-${sub.uri}`, async () => {
          // PDS write
          const agent = await createAuthenticatedAgent(did);
          const putResult = await agent.com.atproto.repo.putRecord({
            repo: did,
            collection: "site.standard.graph.subscription",
            rkey,
            record: newRecord,
            validate: false,
          });
          const newUri = putResult.data.uri;

          // DB write
          const { error: dbError } = await supabaseServerClient
            .from("publication_subscriptions")
            .update({
              uri: newUri,
              record: newRecord as Json,
            })
            .eq("uri", sub.uri);

          if (dbError) {
            return {
              success: false as const,
              oldUri: sub.uri,
              newUri,
              error: dbError.message,
            };
          }
          return { success: true as const, oldUri: sub.uri, newUri };
        }),
      ),
    );

    // Process results
    for (const result of subResults) {
      if (result.success) {
        userSubscriptionUriMap[result.oldUri] = result.newUri;
        stats.userSubscriptionsMigrated++;
      } else {
        stats.errors.push(
          `User subscription ${result.oldUri}: Database error: ${result.error}`,
        );
      }
    }

    // NOTE: We intentionally keep old documents, publications, and documents_in_publications entries.
    // New entries are created with the new URIs, but the old entries remain so that:
    // 1. Notifications referencing old document/publication URIs can still resolve
    // 2. External references (e.g., from other AT Proto apps) to old URIs continue to work
    // 3. The normalization layer handles both schemas transparently for reads
    // Old records are also kept on the user's PDS so existing AT-URI references remain valid.

    // Clear the migration flag on success
    if (stats.errors.length === 0) {
      await step.run("clear-migration-flag", async () => {
        await supabaseServerClient
          .from("identities")
          .update({ metadata: null })
          .eq("atp_did", did);
      });
    }

    return {
      success: stats.errors.length === 0,
      stats,
      publicationUriMap,
      documentUriMap,
      userSubscriptionUriMap,
    };
  },
);
