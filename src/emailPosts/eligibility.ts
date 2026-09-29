import { supabaseServerClient } from "supabase/serverClient";
import { isPro } from "src/entitlements";
import { keyEntitlements } from "src/identityPayload";

export type EmailOnlyIneligibleReason = "newsletter_not_enabled" | "not_pro";

// Email-only posts are a Pro feature of the publication's owner (contributors
// send on the owner's plan), and need email mode on to have anyone to send to.
export async function emailOnlyIneligibleReason(
  publicationUri: string,
): Promise<EmailOnlyIneligibleReason | null> {
  const { data: pub } = await supabaseServerClient
    .from("publications")
    .select("identity_did, publication_newsletter_settings(enabled)")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!pub?.publication_newsletter_settings?.enabled)
    return "newsletter_not_enabled";
  const { data: owner } = await supabaseServerClient
    .from("identities")
    .select(
      "user_entitlements(entitlement_key, granted_at, expires_at, source, metadata)",
    )
    .eq("atp_did", pub.identity_did)
    .maybeSingle();
  if (!isPro(keyEntitlements(owner?.user_entitlements))) return "not_pro";
  return null;
}
