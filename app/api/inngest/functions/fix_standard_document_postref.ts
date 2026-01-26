import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";
import {
  AtpBaseClient,
  SiteStandardDocument,
  ComAtprotoRepoStrongRef,
} from "lexicons/api";
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
 * Fixes site.standard.document records that have the legacy `postRef` field set.
 * Migrates the value to `bskyPostRef` (the correct field for site.standard.document)
 * and removes the legacy `postRef` field.
 *
 * Can be triggered with specific document URIs, or will find all affected documents
 * if no URIs are provided.
 */
export const fix_standard_document_postref = inngest.createFunction(
  { id: "fix_standard_document_postref" },
  { event: "documents/fix-postref" },
  async ({ event, step }) => {
    const { documentUris: providedUris } = event.data as {
      documentUris?: string[];
    };

    const stats = {
      documentsFound: 0,
      documentsFixed: 0,
      documentsSkipped: 0,
      errors: [] as string[],
    };

    // Step 1: Find documents to fix (either provided or query for them)
    const documentUris = await step.run("find-documents", async () => {
      if (providedUris && providedUris.length > 0) {
        return providedUris;
      }

      // Find all site.standard.document records with postRef set
      const { data: documents, error } = await supabaseServerClient
        .from("documents")
        .select("uri")
        .like("uri", "at://%/site.standard.document/%")
        .not("data->postRef", "is", null);

      if (error) {
        throw new Error(`Failed to query documents: ${error.message}`);
      }

      return (documents || []).map((d) => d.uri);
    });

    stats.documentsFound = documentUris.length;

    if (documentUris.length === 0) {
      return {
        success: true,
        message: "No documents found with postRef field",
        stats,
      };
    }

    // Step 2: Group documents by DID for efficient OAuth session handling
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

    // Step 3: Process each DID's documents
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
        stats.documentsSkipped += uris.length;
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

            const data = doc.data as Record<string, unknown>;
            const postRef = data.postRef as
              | ComAtprotoRepoStrongRef.Main
              | undefined;

            if (!postRef) {
              return {
                success: false as const,
                skipped: true,
                error: "Document does not have postRef field",
              };
            }

            // Build updated record: move postRef to bskyPostRef
            const { postRef: _, ...restData } = data;
            let updatedRecord: SiteStandardDocument.Record = {
              ...(restData as SiteStandardDocument.Record),
            };

            updatedRecord.bskyPostRef = data.bskyPostRef
              ? (data.bskyPostRef as ComAtprotoRepoStrongRef.Main)
              : postRef;

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
              postRef,
              bskyPostRef: updatedRecord.bskyPostRef,
            };
          },
        );

        if (result.success) {
          stats.documentsFixed++;
        } else if ("skipped" in result && result.skipped) {
          stats.documentsSkipped++;
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
