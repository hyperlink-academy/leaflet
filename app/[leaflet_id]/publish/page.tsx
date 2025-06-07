import { supabaseServerClient } from "supabase/serverClient";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";
import { PublishPost } from "./PublishPost";
import { PubLeafletPublication } from "lexicons/api";
import { getIdentityData } from "actions/getIdentityData";

import { AtpAgent } from "@atproto/api";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

type Props = {
  // this is now a token id not leaflet! Should probs rename
  params: Promise<{ leaflet_id: string }>;
};
export default async function LeafletPage(props: Props) {
  let leaflet_id = (await props.params).leaflet_id;
  let { result: res } = await get_leaflet_data.handler(
    { token_id: leaflet_id },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (
    !rootEntity ||
    !res.data ||
    res.data.blocked_by_admin ||
    !res.data.leaflets_in_publications[0]
  )
    return (
      <div>
        missin something
        <pre>{JSON.stringify(res.data, undefined, 2)}</pre>
      </div>
    );

  let identity = await getIdentityData();
  if (!identity || !identity.atp_did) return null;
  let pub = res.data.leaflets_in_publications[0];
  let agent = new AtpAgent({ service: "https://public.api.bsky.app" });

  let profile = await agent.getProfile({ actor: identity.atp_did });
  return (
    <PublishPost
      leaflet_id={leaflet_id}
      root_entity={rootEntity}
      profile={profile.data}
      title={pub.title}
      publication_uri={pub.publication}
      description={pub.description}
      record={pub.publications?.record as PubLeafletPublication.Record}
    />
  );
}
