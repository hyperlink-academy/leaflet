import { supabaseServerClient } from "supabase/serverClient";
import { PublishPost } from "./PublishPost";
import { PubLeafletPublication } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";

import { AtpAgent } from "@atproto/api";
import { ReplicacheProvider } from "src/replicache";

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
  }>;
};
export default async function PublishLeafletPage(props: Props) {
  let leaflet_id = (await props.params).leaflet_id;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `*,
      permission_token_rights(*),
       leaflets_in_publications(
         *,
         publications(
           *,
           documents_in_publications(count)
         ),
       documents(*))`,
    )
    .eq("id", leaflet_id)
    .single();
  let rootEntity = data?.root_entity;
  let publication = data?.leaflets_in_publications[0]?.publications;
  if (!publication) {
    let pub_uri = (await props.searchParams).publication_uri;
    if (!pub_uri) return;
    console.log(decodeURIComponent(pub_uri));
    let { data, error } = await supabaseServerClient
      .from("publications")
      .select("*, documents_in_publications(count)")
      .eq("uri", decodeURIComponent(pub_uri))
      .single();
    console.log(error);
    publication = data;
  }
  if (!data || !rootEntity || !publication)
    return (
      <div>
        missin something
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    );

  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  let title =
    data.leaflets_in_publications[0]?.title ||
    decodeURIComponent((await props.searchParams).title);
  let description =
    data.leaflets_in_publications[0]?.description ||
    decodeURIComponent((await props.searchParams).description);
  let agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  let profile = await agent.getProfile({ actor: identity.atp_did });
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
        profile={profile.data}
        title={title}
        description={description}
        publication_uri={publication.uri}
        record={publication.record as PubLeafletPublication.Record}
        posts_in_pub={publication.documents_in_publications[0].count}
      />
    </ReplicacheProvider>
  );
}
