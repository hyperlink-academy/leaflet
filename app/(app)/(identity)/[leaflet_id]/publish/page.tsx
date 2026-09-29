import { supabaseServerClient } from "supabase/serverClient";
import { PublishPost } from "./PublishPost";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { getIdentityData } from "actions/getIdentityData";

import { AtpAgent } from "@atproto/api";
import { ReplicacheProvider } from "src/replicache";
import { isUuid } from "src/utils/isUuid";
import { emailOnlyIneligibleReason } from "src/emailPosts/eligibility";
import {
  EMAIL_POST_SUMMARY_COLUMNS,
  type EmailPostSummary,
} from "src/emailPosts/types";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = {
  // this is now a token id not leaflet! Should probs rename
  params: Promise<{ leaflet_id: string }>;
  searchParams: Promise<{
    publication_uri: string;
    title: string;
    description: string;
    entitiesToDelete: string;
  }>;
};
export default async function PublishLeafletPage(props: Props) {
  let leaflet_id = (await props.params).leaflet_id;
  if (!isUuid(leaflet_id)) return null;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `*,
      permission_token_rights(*),
       leaflets_in_publications(
         *,
         publications(
           *,
           documents_in_publications(count),
           publication_newsletter_settings(enabled),
           publication_membership_settings(enabled)
         ),
       documents(*)),
       leaflets_to_documents(
         *,
         documents(*)
       )`,
    )
    .eq("id", leaflet_id)
    .single();
  let rootEntity = data?.root_entity;

  // Try to find publication from leaflets_in_publications first
  let publication = data?.leaflets_in_publications[0]?.publications;

  // If not found, check if publication_uri is in searchParams
  if (!publication) {
    let pub_uri = (await props.searchParams).publication_uri;
    if (pub_uri) {
      let { data: pubData } = await supabaseServerClient
        .from("publications")
        .select(
          "*, documents_in_publications(count), publication_newsletter_settings(enabled), publication_membership_settings(enabled)",
        )
        .eq("uri", decodeURIComponent(pub_uri))
        .single();
      publication = pubData;
    }
  }

  // Check basic data requirements
  if (!data || !rootEntity)
    return (
      <div>
        missing something
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    );

  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;

  // Get title and description from either source
  let title =
    data.leaflets_in_publications[0]?.title ||
    data.leaflets_to_documents[0]?.title ||
    decodeURIComponent((await props.searchParams).title || "");
  let description =
    data.leaflets_in_publications[0]?.description ||
    data.leaflets_to_documents[0]?.description ||
    decodeURIComponent((await props.searchParams).description || "");

  let agent = new AtpAgent({ service: "https://public.api.bsky.app" });
  let newsletterEnabled =
    !!publication?.uri &&
    !!publication.publication_newsletter_settings?.enabled;
  // When publishing to a publication, the Bluesky post is created in the
  // publication owner's PDS, so the preview should show the owner's identity.
  let publicationOwnerDid = publication?.identity_did;
  // Only fetch the owner profile separately when the owner is someone other
  // than the viewer; when they're the same DID we reuse the viewer profile
  // (ShareOptions falls back to `publicationOwnerProfile ?? viewerProfile`).
  let shouldFetchOwnerProfile =
    !!publicationOwnerDid && publicationOwnerDid !== identity.atp_did;
  let [viewerProfile, publicationOwnerProfile, subscriberCount] =
    await Promise.all([
    agent.getProfile({ actor: identity.atp_did }),
    shouldFetchOwnerProfile
      ? agent
          .getProfile({ actor: publicationOwnerDid! })
          .then((res) => res.data)
          .catch(() => undefined)
      : Promise.resolve(undefined),
    newsletterEnabled
      ? supabaseServerClient
          .from("publication_email_subscribers")
          .select("*", { count: "exact", head: true })
          .eq("publication", publication!.uri)
          .eq("state", "confirmed")
          .then(({ count }) => count ?? 0)
      : Promise.resolve(undefined),
  ]);

  // Parse entitiesToDelete from URL params
  let searchParams = await props.searchParams;
  let entitiesToDelete: string[] = [];
  try {
    if (searchParams.entitiesToDelete) {
      entitiesToDelete = JSON.parse(
        decodeURIComponent(searchParams.entitiesToDelete),
      );
    }
  } catch (e) {
    // If parsing fails, just use empty array
  }

  // Check if a draft record exists (either in a publication or standalone)
  let hasDraft =
    data.leaflets_in_publications.length > 0 ||
    data.leaflets_to_documents.length > 0;

  let emailOnly = await loadEmailOnlyOptions({
    leaflet_id,
    publication_uri: publication?.uri,
    newsletterEnabled,
    published: !!data.leaflets_in_publications[0]?.doc,
    membershipsEnabled:
      !!publication?.publication_membership_settings?.enabled,
  });

  return (
    <ReplicacheProvider
      rootEntity={rootEntity}
      token={data}
      name={rootEntity}
      initialFacts={[]}
    >
      <PublishPost
        leaflet_id={leaflet_id}
        root_entity={rootEntity}
        viewerProfile={viewerProfile.data}
        publicationOwnerProfile={publicationOwnerProfile}
        publicationOwnerDid={publicationOwnerDid ?? undefined}
        title={title}
        description={description}
        publication_uri={publication?.uri}
        pubRecord={normalizePublicationRecord(publication?.record)}
        posts_in_pub={publication?.documents_in_publications[0]?.count}
        newsletter_enabled={newsletterEnabled}
        subscriberCount={subscriberCount}
        entitiesToDelete={entitiesToDelete}
        hasDraft={hasDraft}
        emailOnly={emailOnly}
      />
    </ReplicacheProvider>
  );
}

// Email-only sending applies to unpublished drafts in a publication with email
// mode on — or to a draft that's already an email-only post, whatever changed
// since.
async function loadEmailOnlyOptions(args: {
  leaflet_id: string;
  publication_uri: string | undefined;
  newsletterEnabled: boolean;
  published: boolean;
  membershipsEnabled: boolean;
}) {
  if (!args.publication_uri) return undefined;
  let { data: existing } = await supabaseServerClient
    .from("publication_email_posts")
    .select(EMAIL_POST_SUMMARY_COLUMNS)
    .eq("leaflet", args.leaflet_id)
    .maybeSingle();
  if (!existing && (!args.newsletterEnabled || args.published))
    return undefined;
  return {
    existing: existing as EmailPostSummary | null,
    ineligibleReason: await emailOnlyIneligibleReason(args.publication_uri),
    membershipsEnabled: args.membershipsEnabled,
  };
}
