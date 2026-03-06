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
 * Build set of valid site values for a publication.
 * A site value is valid if it matches the publication or its legacy equivalent.
 */
function buildValidSiteValues(pubUri: string): Set<string> {
  const validValues = new Set<string>([pubUri]);

  try {
    const aturi = new AtUri(pubUri);

    if (pubUri.includes("/site.standard.publication/")) {
      // Also accept legacy pub.leaflet.publication
      validValues.add(
        `at://${aturi.hostname}/pub.leaflet.publication/${aturi.rkey}`,
      );
    } else if (pubUri.includes("/pub.leaflet.publication/")) {
      // Also accept new site.standard.publication
      validValues.add(
        `at://${aturi.hostname}/site.standard.publication/${aturi.rkey}`,
      );
    }
  } catch (e) {
    // Invalid URI, just use the original
  }

  return validValues;
}

/**
 * This function finds and fixes documents that have incorrect site values.
 * A document has an incorrect site value if its `site` field doesn't match
 * the publication it belongs to (via documents_in_publications).
 *
 * Takes a DID as input and processes publications owned by that identity.
 */
export const fix_incorrect_site_values = inngest.createFunction(
  { id: "fix_incorrect_site_values" },
  { event: "documents/fix-incorrect-site-values" },
  async ({ event, step }) => {
    const { did } = event.data;

    const stats = {
      publicationsChecked: 0,
      documentsChecked: 0,
      documentsWithIncorrectSite: 0,
      documentsFixed: 0,
      documentsMissingSite: 0,
      errors: [] as string[],
    };

    // Step 1: Get all publications owned by this identity
    const publications = await step.run("fetch-publications", async () => {
      const { data, error } = await supabaseServerClient
        .from("publications")
        .select("uri")
        .eq("identity_did", did);

      if (error) {
        throw new Error(`Failed to fetch publications: ${error.message}`);
      }
      return data || [];
    });

    stats.publicationsChecked = publications.length;

    if (publications.length === 0) {
      return {
        success: true,
        message: "No publications found for this identity",
        stats,
      };
    }

    // Step 2: Get all documents_in_publications entries for these publications
    const publicationUris = publications.map((p) => p.uri);

    const joinEntries = await step.run(
      "fetch-documents-in-publications",
      async () => {
        const { data, error } = await supabaseServerClient
          .from("documents_in_publications")
          .select("document, publication")
          .in("publication", publicationUris);

        if (error) {
          throw new Error(
            `Failed to fetch documents_in_publications: ${error.message}`,
          );
        }
        return data || [];
      },
    );

    if (joinEntries.length === 0) {
      return {
        success: true,
        message: "No documents found in publications",
        stats,
      };
    }

    // Create a map of document URI -> expected publication URI
    const documentToPublication = new Map<string, string>();
    for (const row of joinEntries) {
      documentToPublication.set(row.document, row.publication);
    }

    // Step 3: Fetch all document records
    const documentUris = Array.from(documentToPublication.keys());

    const allDocuments = await step.run("fetch-documents", async () => {
      const { data, error } = await supabaseServerClient
        .from("documents")
        .select("uri, data")
        .in("uri", documentUris);

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }
      return data || [];
    });

    stats.documentsChecked = allDocuments.length;

    // Step 4: Find documents with incorrect site values
    const documentsToFix: Array<{
      uri: string;
      currentSite: string | null;
      correctSite: string;
      docData: SiteStandardDocument.Record;
    }> = [];

    for (const doc of allDocuments) {
      const expectedPubUri = documentToPublication.get(doc.uri);
      if (!expectedPubUri) continue;

      const data = doc.data as unknown as SiteStandardDocument.Record;
      const currentSite = data?.site;

      if (!currentSite) {
        stats.documentsMissingSite++;
        continue;
      }

      const validSiteValues = buildValidSiteValues(expectedPubUri);

      if (!validSiteValues.has(currentSite)) {
        // Document has incorrect site value - determine the correct one
        // Prefer the site.standard.publication format if the doc is site.standard.document
        let correctSite = expectedPubUri;

        if (doc.uri.includes("/site.standard.document/")) {
          // For site.standard.document, use site.standard.publication format
          try {
            const pubAturi = new AtUri(expectedPubUri);
            if (expectedPubUri.includes("/pub.leaflet.publication/")) {
              correctSite = `at://${pubAturi.hostname}/site.standard.publication/${pubAturi.rkey}`;
            }
          } catch (e) {
            // Use as-is
          }
        }

        documentsToFix.push({
          uri: doc.uri,
          currentSite,
          correctSite,
          docData: data,
        });
      }
    }

    stats.documentsWithIncorrectSite = documentsToFix.length;

    if (documentsToFix.length === 0) {
      return {
        success: true,
        message: "All documents have correct site values",
        stats,
      };
    }

    // Step 5: Group documents by author DID for efficient OAuth session handling
    const docsByDid = new Map<string, typeof documentsToFix>();
    for (const doc of documentsToFix) {
      try {
        const aturi = new AtUri(doc.uri);
        const authorDid = aturi.hostname;
        const existing = docsByDid.get(authorDid) || [];
        existing.push(doc);
        docsByDid.set(authorDid, existing);
      } catch (e) {
        stats.errors.push(`Invalid URI: ${doc.uri}`);
      }
    }

    // Step 6: Process each author's documents
    for (const [authorDid, docs] of docsByDid) {
      // Verify OAuth session for this author
      const oauthValid = await step.run(
        `verify-oauth-${authorDid.slice(-8)}`,
        async () => {
          const result = await restoreOAuthSession(authorDid);
          return result.ok;
        },
      );

      if (!oauthValid) {
        stats.errors.push(`No valid OAuth session for ${authorDid}`);
        continue;
      }

      // Fix each document for this author
      for (const docToFix of docs) {
        const result = await step.run(
          `fix-doc-${docToFix.uri.slice(-12)}`,
          async () => {
            try {
              const docAturi = new AtUri(docToFix.uri);

              // Build updated record
              const updatedRecord: SiteStandardDocument.Record = {
                ...docToFix.docData,
                site: docToFix.correctSite,
              };

              // Update on PDS
              const agent = await createAuthenticatedAgent(authorDid);
              await agent.com.atproto.repo.putRecord({
                repo: authorDid,
                collection: docAturi.collection,
                rkey: docAturi.rkey,
                record: updatedRecord,
                validate: false,
              });

              // Update in database
              const { error: dbError } = await supabaseServerClient
                .from("documents")
                .update({ data: updatedRecord as Json })
                .eq("uri", docToFix.uri);

              if (dbError) {
                return {
                  success: false as const,
                  error: `Database update failed: ${dbError.message}`,
                };
              }

              return {
                success: true as const,
                oldSite: docToFix.currentSite,
                newSite: docToFix.correctSite,
              };
            } catch (e) {
              return {
                success: false as const,
                error: e instanceof Error ? e.message : String(e),
              };
            }
          },
        );

        if (result.success) {
          stats.documentsFixed++;
        } else {
          stats.errors.push(`${docToFix.uri}: ${result.error}`);
        }
      }
    }

    return {
      success: stats.errors.length === 0,
      stats,
      documentsToFix: documentsToFix.map((d) => ({
        uri: d.uri,
        oldSite: d.currentSite,
        newSite: d.correctSite,
      })),
    };
  },
);
