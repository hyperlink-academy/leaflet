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
};
export default async function PublishLeafletPage(props: Props) {
  let leaflet_id = (await props.params).leaflet_id;
  let { data } = await supabaseServerClient
    .from("permission_tokens")
    .select(
      `*,
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
  if (!data || !rootEntity || !data.leaflets_in_publications[0])
    return (
      <div>
        missin something
        <pre>{JSON.stringify(data, undefined, 2)}</pre>
      </div>
    );

  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  let pub = data.leaflets_in_publications[0];
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
        title={pub.title}
        publication_uri={pub.publication}
        description={pub.description}
        record={pub.publications?.record as PubLeafletPublication.Record}
        posts_in_pub={pub.publications?.documents_in_publications[0].count}
      />
    </ReplicacheProvider>
  );
}
