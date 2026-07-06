import { supabaseServerClient } from "supabase/serverClient";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";

// Server-side companions to src/membership.ts (which stays client-safe).

export async function getReaderMembership(
  publicationUri: string,
  identityId: string,
) {
  const { data } = await supabaseServerClient
    .from("publication_memberships")
    .select(
      "id, tier, status, current_period_end, stripe_customer_id, stripe_subscription_id, stripe_account_id, cadence",
    )
    .eq("publication", publicationUri)
    .eq("identity_id", identityId)
    .maybeSingle();
  return data;
}

// The tier-selection page URL when the publication has memberships enabled;
// null otherwise. May be a custom-domain absolute URL or a relative /lish path
// — resolve against the current origin before redirecting.
export async function membershipJoinUrl(
  publicationUri: string,
): Promise<string | null> {
  const { data } = await supabaseServerClient
    .from("publications")
    .select("uri, record, publication_membership_settings(enabled)")
    .eq("uri", publicationUri)
    .maybeSingle();
  if (!data?.publication_membership_settings?.enabled) return null;
  return `${getPublicationURL(data).replace(/\/$/, "")}/join`;
}
