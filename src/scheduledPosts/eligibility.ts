import { supabaseServerClient } from "supabase/serverClient";
import { canSchedulePosts, isPro } from "src/entitlements";
import { ownerEntitlements } from "src/emailPosts/eligibility";

export type ScheduledPostIneligibleReason = "feature_not_enabled" | "not_pro";

// Scheduling is a Pro feature of the publication's owner; contributors
// schedule on the owner's plan. While the feature is rolling out the owner
// also needs its flag, which is reported first so the UI can hide the feature
// rather than upsell it.
export async function scheduledPostIneligibleReason(
  publicationUri: string,
): Promise<ScheduledPostIneligibleReason | null> {
  const { data: pub } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!pub) return "feature_not_enabled";
  const entitlements = await ownerEntitlements(pub.identity_did);
  if (!canSchedulePosts(entitlements)) return "feature_not_enabled";
  if (!isPro(entitlements)) return "not_pro";
  return null;
}
