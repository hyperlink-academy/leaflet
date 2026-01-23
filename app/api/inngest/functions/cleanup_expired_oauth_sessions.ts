import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";

export const cleanup_expired_oauth_sessions = inngest.createFunction(
  { id: "cleanup_expired_oauth_sessions" },
  { event: "user/cleanup-expired-oauth-sessions" },
  async ({ step }) => {
    const stats = {
      totalIdentities: 0,
      validSessions: 0,
      expiredSessions: 0,
      tokensDeleted: 0,
      errors: [] as string[],
    };

    // Step 1: Get all identities with an atp_did (OAuth users) that have at least one auth token
    const identities = await step.run("fetch-oauth-identities", async () => {
      const { data, error } = await supabaseServerClient
        .from("identities")
        .select("id, atp_did, email_auth_tokens(count)")
        .not("atp_did", "is", null);

      if (error) {
        throw new Error(`Failed to fetch identities: ${error.message}`);
      }

      // Filter to only include identities with at least one auth token
      return (data || [])
        .filter((identity) => {
          const tokenCount = identity.email_auth_tokens?.[0]?.count ?? 0;
          return tokenCount > 0;
        })
        .map((identity) => ({
          id: identity.id,
          atp_did: identity.atp_did,
          tokenCount: identity.email_auth_tokens?.[0]?.count ?? 0,
        }));
    });

    stats.totalIdentities = identities.length;
    console.log(`Found ${identities.length} OAuth identities with active sessions to check`);

    // Step 2: Check identities' OAuth sessions in batched parallel and cleanup if expired
    const BATCH_SIZE = 150;
    const allResults: {
      identityId: string;
      valid: boolean;
      tokensDeleted: number;
      error?: string;
    }[] = [];

    for (let i = 0; i < identities.length; i += BATCH_SIZE) {
      const batch = identities.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(identities.length / BATCH_SIZE);

      console.log(
        `Processing batch ${batchNum}/${totalBatches} (${batch.length} identities)`,
      );

      const batchResults = await Promise.all(
        batch.map((identity) =>
          step.run(`check-session-${identity.id}`, async () => {
            console.log(
              `Checking OAuth session for DID: ${identity.atp_did} (${identity.tokenCount} tokens)`,
            );

            const sessionResult = await restoreOAuthSession(identity.atp_did!);

            if (sessionResult.ok) {
              console.log(`  Session valid for ${identity.atp_did}`);
              return { identityId: identity.id, valid: true, tokensDeleted: 0 };
            }

            // Session is expired/invalid - delete associated auth tokens
            console.log(
              `  Session expired for ${identity.atp_did}: ${sessionResult.error.message}`,
            );

            const { error: deleteError } = await supabaseServerClient
              .from("email_auth_tokens")
              .delete()
              .eq("identity", identity.id);

            if (deleteError) {
              console.error(
                `  Error deleting tokens for identity ${identity.id}: ${deleteError.message}`,
              );
              return {
                identityId: identity.id,
                valid: false,
                tokensDeleted: 0,
                error: deleteError.message,
              };
            }

            console.log(
              `  Deleted ${identity.tokenCount} auth tokens for identity ${identity.id}`,
            );

            return {
              identityId: identity.id,
              valid: false,
              tokensDeleted: identity.tokenCount,
            };
          }),
        ),
      );

      allResults.push(...batchResults);
    }

    // Aggregate results
    for (const result of allResults) {
      if (result.valid) {
        stats.validSessions++;
      } else {
        stats.expiredSessions++;
        stats.tokensDeleted += result.tokensDeleted;
        if ("error" in result && result.error) {
          stats.errors.push(`Identity ${result.identityId}: ${result.error}`);
        }
      }
    }

    console.log("Cleanup completed:", stats);

    return {
      success: stats.errors.length === 0,
      stats,
    };
  },
);
