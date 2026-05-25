import { supabaseServerClient } from "supabase/serverClient";
import { publicationNameOrUriFilter } from "src/utils/uriHelpers";
import { getIdentityData } from "actions/getIdentityData";
import { normalizePublicationRecord } from "src/utils/normalizeRecords";
import { AcceptContent } from "./AcceptContent";

type Params = { did: string; publication: string };

export default async function ContributorAcceptPage(props: {
  params: Promise<Params>;
}) {
  let params = await props.params;
  let did = decodeURIComponent(params.did);
  let publication_name = decodeURIComponent(params.publication);

  let { data: publications } = await supabaseServerClient
    .from("publications")
    .select("uri, name, identity_did, record")
    .eq("identity_did", did)
    .or(publicationNameOrUriFilter(did, publication_name))
    .order("uri", { ascending: false })
    .limit(1);
  let publication = publications?.[0];

  let pubRecord = publication?.record
    ? normalizePublicationRecord(publication.record)
    : null;
  let pubName = pubRecord?.name || publication?.name || "this publication";

  let identity = await getIdentityData();
  let signedIn = !!identity?.atp_did;

  let inviteState:
    | { state: "no_publication" }
    | { state: "not_signed_in" }
    | { state: "not_invited" }
    | { state: "already_owner" }
    | { state: "pending" }
    | { state: "already_member" };

  if (!publication) {
    inviteState = { state: "no_publication" };
  } else if (!identity?.atp_did) {
    inviteState = { state: "not_signed_in" };
  } else if (identity.atp_did === publication.identity_did) {
    inviteState = { state: "already_owner" };
  } else {
    let { data: row } = await supabaseServerClient
      .from("publication_contributors")
      .select("confirmed")
      .eq("publication_uri", publication.uri)
      .eq("contributor_did", identity.atp_did)
      .maybeSingle();
    if (!row) inviteState = { state: "not_invited" };
    else if (row.confirmed) inviteState = { state: "already_member" };
    else inviteState = { state: "pending" };
  }

  let dashboardHref = publication
    ? `/lish/${encodeURIComponent(did)}/${encodeURIComponent(
        publication_name,
      )}/dashboard`
    : "/home";

  return (
    <AcceptContent
      publicationUri={publication?.uri ?? null}
      publicationName={pubName}
      state={inviteState.state}
      signedIn={signedIn}
      dashboardHref={dashboardHref}
    />
  );
}
