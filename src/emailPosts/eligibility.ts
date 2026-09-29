import { supabaseServerClient } from "supabase/serverClient";
import { canSendEmailPosts, isPro } from "src/entitlements";
import { keyEntitlements } from "src/identityPayload";

export type EmailOnlyIneligibleReason =
  | "feature_not_enabled"
  | "newsletter_not_enabled"
  | "not_pro";

export async function ownerEntitlements(ownerDid: string) {
  const { data: owner } = await supabaseServerClient
    .from("identities")
    .select(
      "user_entitlements(entitlement_key, granted_at, expires_at, source, metadata)",
    )
    .eq("atp_did", ownerDid)
    .maybeSingle();
  return keyEntitlements(owner?.user_entitlements);
}

export async function emailPostsEnabledForOwner(ownerDid: string) {
  return canSendEmailPosts(await ownerEntitlements(ownerDid));
}

// Email-only posts are a Pro feature of the publication's owner (contributors
// send on the owner's plan), and need email mode on to have anyone to send to.
// While the feature is rolling out the owner also needs its flag, which is
// reported first so the UI can hide the feature rather than upsell it.
export async function emailOnlyIneligibleReason(
  publicationUri: string,
): Promise<EmailOnlyIneligibleReason | null> {
  const { data: pub } = await supabaseServerClient
    .from("publications")
    .select("identity_did, publication_newsletter_settings(enabled)")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!pub) return "feature_not_enabled";
  const entitlements = await ownerEntitlements(pub.identity_did);
  if (!canSendEmailPosts(entitlements)) return "feature_not_enabled";
  if (!pub.publication_newsletter_settings?.enabled)
    return "newsletter_not_enabled";
  if (!isPro(entitlements)) return "not_pro";
  return null;
}
