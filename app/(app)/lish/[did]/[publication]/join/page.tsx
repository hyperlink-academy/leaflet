import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { getPublicationURL } from "app/(app)/lish/createPub/getPublicationURL";
import { filterJoinableTiers } from "src/membership";
import {
  PublicationThemeProvider,
  PublicationBackgroundProvider,
} from "components/ThemeManager/PublicationThemeProvider";
import { JoinPageContent } from "./JoinPageContent";

async function fetchPublicationForJoin(did: string, publicationName: string) {
  const { data } = await supabaseServerClient
    .from("publications")
    .select(
      `uri, name, identity_did, record,
       publication_membership_settings(enabled),
       publication_newsletter_settings(enabled),
       publication_membership_tiers(id, name, description, monthly_price_cents, annual_price_cents, currency, active, sort_order, stripe_price_monthly_id, is_free)`,
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
  const publication = await fetchPublicationForJoin(
    decodeURIComponent(params.did),
    decodeURIComponent(params.publication),
  );
  if (!publication) return { title: "404" };
  return { title: `Join ${publication.name}` };
}

export default async function JoinPage(props: {
  params: Promise<{ publication: string; did: string }>;
}) {
  const params = await props.params;
  const did = decodeURIComponent(params.did);
  const publication_name = decodeURIComponent(params.publication);

  const publication = await fetchPublicationForJoin(did, publication_name);
  if (!publication || !publication.publication_membership_settings?.enabled)
    notFound();

  const record = normalizePublicationRecord(publication.record);
  const tiers = filterJoinableTiers(
    publication.publication_membership_tiers,
  ).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    monthly_price_cents: t.monthly_price_cents,
    annual_price_cents: t.annual_price_cents,
    is_free: t.is_free,
  }));

  return (
    <PublicationThemeProvider
      record={record}
      pub_creator={publication.identity_did}
    >
      <PublicationBackgroundProvider
        record={record}
        pub_creator={publication.identity_did}
      >
        <div className="publicationJoinPage w-full h-full min-h-screen flex flex-col items-center px-3 py-8 sm:py-12 overflow-y-auto">
          <JoinPageContent
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
