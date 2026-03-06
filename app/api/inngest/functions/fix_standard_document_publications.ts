import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import { AtpBaseClient, SiteStandardDocument } from "lexicons/api";
import { AtUri } from "@atproto/syntax";
import { Json } from "supabase/database.types";

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

/**
 * Fixes site.standard.document records that have stale pub.leaflet.publication
 * references in their site field. Updates both the PDS record and database.
 */
export const fix_standard_document_publications = inngest.createFunction(
  { id: "fix_standard_document_publications" },
  { event: "documents/fix-publication-references" },
  async ({ event, step }) => {
    const { documentUris } = event.data as { documentUris: string[] };

    const stats = {
      documentsFixed: 0,
      joinEntriesFixed: 0,
      errors: [] as string[],
    };

    if (!documentUris || documentUris.length === 0) {
      return { success: true, stats, message: "No documents to fix" };
    }

    // Group documents by DID (author) for efficient OAuth session handling
    const docsByDid = new Map<string, string[]>();
    for (const uri of documentUris) {
      try {
        const aturi = new AtUri(uri);
        const did = aturi.hostname;
        const existing = docsByDid.get(did) || [];
        existing.push(uri);
        docsByDid.set(did, existing);
      } catch (e) {
        stats.errors.push(`Invalid URI: ${uri}`);
      }
    }

    // Process each DID's documents
    for (const [did, uris] of docsByDid) {
      // Verify OAuth session for this user
      const oauthValid = await step.run(
        `verify-oauth-${did.slice(-8)}`,
        async () => {
          const result = await restoreOAuthSession(did);
          return result.ok;
        },
      );

      if (!oauthValid) {
        stats.errors.push(`No valid OAuth session for ${did}`);
        continue;
      }

      // Fix each document
      for (const docUri of uris) {
        const result = await step.run(
          `fix-doc-${docUri.slice(-12)}`,
          async () => {
            // Fetch the document
            const { data: doc, error: fetchError } = await supabaseServerClient
              .from("documents")
              .select("uri, data")
              .eq("uri", docUri)
              .single();

            if (fetchError || !doc) {
              return {
                success: false as const,
                error: `Document not found: ${fetchError?.message || "no data"}`,
              };
            }

            const data = doc.data as SiteStandardDocument.Record;
            const oldSite = data?.site;

            if (!oldSite || !oldSite.includes("/pub.leaflet.publication/")) {
              return {
                success: false as const,
                error: "Document does not have a pub.leaflet.publication site reference",
              };
            }

            // Convert to new publication URI
            const oldPubAturi = new AtUri(oldSite);
            const newSite = `at://${oldPubAturi.hostname}/site.standard.publication/${oldPubAturi.rkey}`;

            // Update the record
            const updatedRecord: SiteStandardDocument.Record = {
              ...data,
              site: newSite,
            };

            // Write to PDS
            const docAturi = new AtUri(docUri);
            const agent = await createAuthenticatedAgent(did);
            await agent.com.atproto.repo.putRecord({
              repo: did,
              collection: "site.standard.document",
              rkey: docAturi.rkey,
              record: updatedRecord,
              validate: false,
            });

            // Update database
            const { error: dbError } = await supabaseServerClient
              .from("documents")
              .update({ data: updatedRecord as Json })
              .eq("uri", docUri);

            if (dbError) {
              return {
                success: false as const,
                error: `Database update failed: ${dbError.message}`,
              };
            }

            return {
              success: true as const,
              oldSite,
              newSite,
            };
          },
        );

        if (result.success) {
          stats.documentsFixed++;

          // Fix the documents_in_publications entry
          const joinResult = await step.run(
            `fix-join-${docUri.slice(-12)}`,
            async () => {
              // Find the publication URI that exists in the database
              const { data: doc } = await supabaseServerClient
                .from("documents")
                .select("data")
                .eq("uri", docUri)
                .single();

              const newSite = (doc?.data as any)?.site;
              if (!newSite) {
                return { success: false as const, error: "Could not read updated document" };
              }

              // Check which publication URI exists
              const newPubAturi = new AtUri(newSite);
              const oldPubUri = `at://${newPubAturi.hostname}/pub.leaflet.publication/${newPubAturi.rkey}`;

              const { data: pubs } = await supabaseServerClient
                .from("publications")
                .select("uri")
                .in("uri", [newSite, oldPubUri]);

              const existingPubUri = pubs?.find((p) => p.uri === newSite)?.uri ||
                pubs?.find((p) => p.uri === oldPubUri)?.uri;

              if (!existingPubUri) {
                return { success: false as const, error: "No matching publication found" };
              }

              // Delete any existing entries for this document
              await supabaseServerClient
                .from("documents_in_publications")
                .delete()
                .eq("document", docUri);

              // Insert the correct entry
              const { error: insertError } = await supabaseServerClient
                .from("documents_in_publications")
                .insert({
                  document: docUri,
                  publication: existingPubUri,
                });

              if (insertError) {
                return { success: false as const, error: insertError.message };
              }

              return { success: true as const, publication: existingPubUri };
            },
          );

          if (joinResult.success) {
            stats.joinEntriesFixed++;
          } else {
            stats.errors.push(`Join table fix failed for ${docUri}: ${"error" in joinResult ? joinResult.error : "unknown error"}`);
          }
        } else {
          stats.errors.push(`${docUri}: ${result.error}`);
        }
      }
    }

    return {
      success: stats.errors.length === 0,
      stats,
    };
  },
);
