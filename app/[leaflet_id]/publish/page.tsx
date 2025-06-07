import { supabaseServerClient } from "supabase/serverClient";
import { get_leaflet_data } from "app/api/rpc/[command]/get_leaflet_data";
import { PublishPost } from "./PublishPost";

export const preferredRegion = ["sfo1"];
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function LeafletPage(props: Props) {
  let { result: res } = await get_leaflet_data.handler(
    { token_id: (await props.params).leaflet_id },
    { supabase: supabaseServerClient },
  );
  let rootEntity = res.data?.root_entity;
  if (
    !rootEntity ||
    !res.data ||
    res.data.blocked_by_admin ||
    !res.data.leaflets_in_publications[9]
  )
    return null;

  let pub = res.data.leaflets_in_publications[0];
  return (
    <PublishPost
      title={pub.title}
      publication_uri={pub.publication}
      description={pub.description}
    />
  );
}
