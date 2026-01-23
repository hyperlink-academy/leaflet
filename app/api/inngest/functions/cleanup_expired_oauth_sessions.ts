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

    // Step 1: Get all identities with an atp_did (OAuth users)
    const identities = await step.run("fetch-oauth-identities", async () => {
      const { data, error } = await supabaseServerClient
        .from("identities")
        .select("id, atp_did")
        .not("atp_did", "is", null);

      if (error) {
        throw new Error(`Failed to fetch identities: ${error.message}`);
      }
      return data || [];
    });

    stats.totalIdentities = identities.length;
    console.log(`Found ${identities.length} OAuth identities to check`);

    // Step 2: Check each identity's OAuth session and cleanup if expired
    for (const identity of identities) {
      if (!identity.atp_did) continue;

      const result = await step.run(
        `check-session-${identity.id}`,
        async () => {
          console.log(`Checking OAuth session for DID: ${identity.atp_did}`);

          const sessionResult = await restoreOAuthSession(identity.atp_did!);

          if (sessionResult.ok) {
            console.log(`  Session valid for ${identity.atp_did}`);
            return { valid: true, tokensDeleted: 0 };
          }

          // Session is expired/invalid - delete associated auth tokens
          console.log(
            `  Session expired for ${identity.atp_did}: ${sessionResult.error.message}`,
          );

          const { data: deletedTokens, error: deleteError } =
            await supabaseServerClient
              .from("email_auth_tokens")
              .delete()
              .eq("identity", identity.id)
              .select("id");

          if (deleteError) {
            console.error(
              `  Error deleting tokens for identity ${identity.id}: ${deleteError.message}`,
            );
            return {
              valid: false,
              tokensDeleted: 0,
              error: deleteError.message,
            };
          }

          const deletedCount = deletedTokens?.length || 0;
          console.log(
            `  Deleted ${deletedCount} auth tokens for identity ${identity.id}`,
          );

          return { valid: false, tokensDeleted: deletedCount };
        },
      );

      if (result.valid) {
        stats.validSessions++;
      } else {
        stats.expiredSessions++;
        stats.tokensDeleted += result.tokensDeleted;
        if ("error" in result && result.error) {
          stats.errors.push(
            `Identity ${identity.id}: ${result.error}`,
          );
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
