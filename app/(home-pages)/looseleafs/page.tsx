import { getIdentityData } from "actions/getIdentityData";
import { DashboardLayout } from "components/PageLayouts/DashboardLayout";
import { Actions } from "../home/Actions/Actions";
import { Fact } from "src/replicache";
import { Attribute } from "src/replicache/attributes";
import { getFactsFromHomeLeaflets } from "app/api/rpc/[command]/getFactsFromHomeLeaflets";
import { supabaseServerClient } from "supabase/serverClient";
import { LooseleafsLayout } from "./LooseleafsLayout";

export default async function Home() {
  let auth_res = await getIdentityData();

  let [allLeafletFacts] = await Promise.all([
    auth_res
      ? getFactsFromHomeLeaflets.handler(
          {
            tokens: auth_res.permission_token_on_homepage.map(
              (r) => r.permission_tokens.root_entity,
            ),
          },
          { supabase: supabaseServerClient },
        )
      : undefined,
  ]);

  let home_docs_initialFacts = allLeafletFacts?.result || {};

  return (
    <LooseleafsLayout
      entityID={auth_res?.home_leaflet?.root_entity || null}
      titles={{
        ...home_docs_initialFacts.titles,
        ...auth_res?.permission_token_on_homepage.reduce(
          (acc, tok) => {
            let title =
              tok.permission_tokens.leaflets_in_publications[0]?.title;
            if (title) acc[tok.permission_tokens.root_entity] = title;
            return acc;
          },
          {} as { [k: string]: string },
        ),
      }}
      initialFacts={home_docs_initialFacts.facts || {}}
    />
  );
}
