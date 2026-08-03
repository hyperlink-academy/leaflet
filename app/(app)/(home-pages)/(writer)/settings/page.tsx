import { redirect } from "next/navigation";
import { getIdentityData } from "actions/getIdentityData";
import { getMyMemberships } from "actions/memberships";
import { supabaseServerClient } from "supabase/serverClient";
import { getBasePublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import {
  SettingsPageContent,
  type MonetizationPub,
} from "./SettingsPageContent";

export default async function SettingsPage() {
  const identity = await getIdentityData();
  if (!identity) redirect("/home");

  const memberships = await getMyMemberships();

  const pubUris = identity.publications.map((p) => p.uri);
  const { data: membershipSettings } = pubUris.length
    ? await supabaseServerClient
        .from("publication_membership_settings")
        .select("publication, enabled")
        .in("publication", pubUris)
    : { data: [] };
  const enabledPubs = new Set(
    (membershipSettings ?? [])
      .filter((s) => s.enabled)
      .map((s) => s.publication),
  );
  const monetizationPubs: MonetizationPub[] = identity.publications.map(
    (p) => ({
      uri: p.uri,
      name: p.name,
      settingsHref: `${getBasePublicationURL(p)}/dashboard/settings?tab=monetization`,
      monetizationEnabled: enabledPubs.has(p.uri),
    }),
  );

  return (
    <SettingsPageContent
      memberships={memberships}
      monetizationPubs={monetizationPubs}
    />
  );
}
