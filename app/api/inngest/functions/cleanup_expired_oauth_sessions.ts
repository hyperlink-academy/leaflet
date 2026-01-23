import { supabaseServerClient } from "supabase/serverClient";
import { inngest } from "../client";
import { restoreOAuthSession } from "src/atproto-oauth";

// Main function that fetches identities and publishes events for each one
export const cleanup_expired_oauth_sessions = inngest.createFunction(
  { id: "cleanup_expired_oauth_sessions" },
  { event: "user/cleanup-expired-oauth-sessions" },
  async ({ step }) => {
    // Get all identities with an atp_did (OAuth users) that have at least one auth token
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
          atp_did: identity.atp_did!,
          tokenCount: identity.email_auth_tokens?.[0]?.count ?? 0,
        }));
    });

    console.log(
      `Found ${identities.length} OAuth identities with active sessions to check`,
    );

    // Publish events for each identity in batches
    const BATCH_SIZE = 100;
    let totalSent = 0;

    for (let i = 0; i < identities.length; i += BATCH_SIZE) {
      const batch = identities.slice(i, i + BATCH_SIZE);

      await step.run(`send-events-batch-${i}`, async () => {
        const events = batch.map((identity) => ({
          name: "user/check-oauth-session" as const,
          data: {
            identityId: identity.id,
            did: identity.atp_did,
            tokenCount: identity.tokenCount,
          },
        }));

        await inngest.send(events);
        return events.length;
      });

      totalSent += batch.length;
    }

    console.log(`Published ${totalSent} check-oauth-session events`);

    return {
      success: true,
      identitiesQueued: totalSent,
    };
  },
);

// Function that checks a single identity's OAuth session and cleans up if expired
export const check_oauth_session = inngest.createFunction(
  { id: "check_oauth_session" },
  { event: "user/check-oauth-session" },
  async ({ event, step }) => {
    const { identityId, did, tokenCount } = event.data;

    const result = await step.run("check-and-cleanup", async () => {
      console.log(`Checking OAuth session for DID: ${did} (${tokenCount} tokens)`);

      const sessionResult = await restoreOAuthSession(did);

      if (sessionResult.ok) {
        console.log(`  Session valid for ${did}`);
        return { valid: true, tokensDeleted: 0 };
      }

      // Session is expired/invalid - delete associated auth tokens
      console.log(
        `  Session expired for ${did}: ${sessionResult.error.message}`,
      );

      const { error: deleteError } = await supabaseServerClient
        .from("email_auth_tokens")
        .delete()
        .eq("identity", identityId);

      if (deleteError) {
        console.error(
          `  Error deleting tokens for identity ${identityId}: ${deleteError.message}`,
        );
        return {
          valid: false,
          tokensDeleted: 0,
          error: deleteError.message,
        };
      }

      console.log(`  Deleted ${tokenCount} auth tokens for identity ${identityId}`);

      return {
        valid: false,
        tokensDeleted: tokenCount,
      };
    });

    return {
      identityId,
      did,
      ...result,
    };
  },
);
