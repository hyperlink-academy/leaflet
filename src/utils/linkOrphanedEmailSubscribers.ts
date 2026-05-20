import { supabaseServerClient } from "supabase/serverClient";

// Link any pre-existing email-subscriber rows for `email` to `identityId` if
// they're not already linked. Call this whenever an identity newly comes to
// own an email so that imported / pre-confirmation-flow subscribers become
// visible to their owner. Idempotent — safe to call on every signup/login.
export async function linkOrphanedEmailSubscribers(
  identityId: string,
  email: string,
) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return;
  const { error } = await supabaseServerClient
    .from("publication_email_subscribers")
    .update({ identity_id: identityId })
    .eq("email", normalized)
    .is("identity_id", null);
  if (error) {
    console.error(
      "[linkOrphanedEmailSubscribers] failed:",
      error.message,
      { identityId, email: normalized },
    );
  }
}
