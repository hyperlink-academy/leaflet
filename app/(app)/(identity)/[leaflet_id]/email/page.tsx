import { redirect } from "next/navigation";
import { supabaseServerClient } from "supabase/serverClient";
import { getIdentityData } from "actions/getIdentityData";
import { ReplicacheProvider } from "src/replicache";
import { isUuid } from "src/utils/isUuid";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { emailOnlyIneligibleReason } from "src/emailPosts/eligibility";
import {
  EMAIL_POST_SUMMARY_COLUMNS,
  type EmailPostSummary,
} from "src/emailPosts/types";
import { SendEmail } from "./SendEmail";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// The send flow for an email-only draft: the counterpart of ../publish for a
// draft that goes to subscribers' inboxes instead of the web.
export default async function SendEmailPage(props: {
  params: Promise<{ leaflet_id: string }>;
}) {
  let leaflet_id = (await props.params).leaflet_id;
  if (!isUuid(leaflet_id)) return null;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `*,
      permission_token_rights(*),
      leaflets_in_publications(
        *,
        publications(*, publication_membership_settings(enabled))
      )`,
    )
    .eq("id", leaflet_id)
    .single();
  let rootEntity = data?.root_entity;
  let draft = data?.leaflets_in_publications[0];
  let publication = draft?.publications;
  if (!data || !rootEntity || !draft || !publication) return null;
  if (!draft.email_only) redirect(`/${leaflet_id}/publish`);

  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  let [{ data: existing }, ineligibleReason, { count: subscriberCount }] =
    await Promise.all([
      supabaseServerClient
        .from("publication_email_posts")
        .select(EMAIL_POST_SUMMARY_COLUMNS)
        .eq("leaflet", leaflet_id)
        .maybeSingle(),
      emailOnlyIneligibleReason(publication.uri),
      supabaseServerClient
        .from("publication_email_subscribers")
        .select("*", { count: "exact", head: true })
        .eq("publication", publication.uri)
        .eq("state", "confirmed"),
    ]);

  return (
    <ReplicacheProvider
      rootEntity={rootEntity}
      token={data}
      name={rootEntity}
      initialFacts={[]}
    >
      <SendEmail
        leaflet_id={leaflet_id}
        root_entity={rootEntity}
        title={draft.title}
        description={draft.description}
        publication_uri={publication.uri}
        pubRecord={normalizePublicationRecord(publication.record)}
        subscriberCount={subscriberCount ?? 0}
        membershipsEnabled={
          !!publication.publication_membership_settings?.enabled
        }
        ineligibleReason={ineligibleReason}
        existing={existing as EmailPostSummary | null}
      />
    </ReplicacheProvider>
  );
}
