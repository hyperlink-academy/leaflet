import { getIdentityData } from "actions/getIdentityData";
import { getFactsFromHomeLeaflets } from "app/api/rpc/[command]/getFactsFromHomeLeaflets";
import { supabaseServerClient } from "supabase/serverClient";

import { HomeLayout } from "./HomeLayout";

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
    <HomeLayout
      titles={{
        ...home_docs_initialFacts.titles,
        ...auth_res?.permission_token_on_homepage.reduce(
          (acc, tok) => {
            let title =
              tok.permission_tokens.leaflets_in_publications[0]?.title ||
              tok.permission_tokens.leaflets_to_documents?.title;
            if (title) acc[tok.permission_tokens.root_entity] = title;
            return acc;
          },
          {} as { [k: string]: string },
        ),
      }}
      entityID={auth_res?.home_leaflet?.root_entity || null}
      initialFacts={home_docs_initialFacts.facts || {}}
    />
  );
}
