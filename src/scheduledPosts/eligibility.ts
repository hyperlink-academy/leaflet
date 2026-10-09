import { supabaseServerClient } from "supabase/serverClient";
import { isPro } from "src/entitlements";
import { ownerEntitlements } from "src/emailPosts/eligibility";

export type ScheduledPostIneligibleReason = "not_pro";

// Scheduling is a Pro feature of the publication's owner; contributors
// schedule on the owner's plan.
export async function scheduledPostIneligibleReason(
  publicationUri: string,
): Promise<ScheduledPostIneligibleReason | null> {
  const { data: pub } = await supabaseServerClient
    .from("publications")
    .select("identity_did")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!pub || !isPro(await ownerEntitlements(pub.identity_did)))
    return "not_pro";
  return null;
}
