import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { getPublicationURL } from "src/utils/getPublicationURL";
import { buildMembershipTiers } from "src/membership";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { MembershipPageContent } from "./MembershipPageContent";

// On-demand ISR like /subscribe: the tiers render from the cached page for
// everyone, and the viewer's own state (identity, membership, wallet) loads
// client-side to change the buttons. Tier and settings edits invalidate via
// revalidateAllPublicationPaths.
export const revalidate = 3600;
export async function generateStaticParams() {
  return [];
}

async function fetchPublicationForMembership(
  did: string,
  publicationName: string,
) {
  const { data } = await supabaseServerClient
    .from("publications")
    .select(
      `uri, name, identity_did, record,
       publication_membership_settings(enabled, subscriber_tier_name, subscriber_tier_description),
       publication_newsletter_settings(enabled),
       publication_membership_tiers(id, name, description, monthly_price_cents, annual_price_cents, active, sort_order)`,
    )
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publicationName))
    .order("uri", { ascending: false })
    .limit(1);
  return data?.[0] ?? null;
}

export async function generateMetadata(props: {
  params: Promise<{ publication: string; did: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const robots = { index: false };
  const publication = await fetchPublicationForMembership(
    decodeURIComponent(params.did),
    decodeURIComponent(params.publication),
  );
  if (!publication) return { title: "404", robots };
  return { title: `${publication.name} Membership`, robots };
}

export default async function MembershipPage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication_name = decodeURIComponent(params.publication);

  const publication = await fetchPublicationForMembership(
    did,
    publication_name,
  );
  if (!publication || !publication.publication_membership_settings?.enabled)
    notFound();

  const record = normalizePublicationRecord(publication.record);
  const tiers = buildMembershipTiers(
    publication.publication_membership_settings,
    publication.publication_membership_tiers,
  );

  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
        className="min-h-screen"
      >
        <div className="publicationMembershipPage w-full min-h-screen flex flex-col items-center px-3 py-8 sm:py-12">
          <MembershipPageContent
            publicationUri={publication.uri}
            publicationName={publication.name}
            publicationUrl={getPublicationURL(publication)}
            newsletterMode={
              !!publication.publication_newsletter_settings?.enabled
            }
            tiers={tiers}
          />
        </div>
      </PublicationBackgroundProvider>
    </PublicationThemeProvider>
  );
}
