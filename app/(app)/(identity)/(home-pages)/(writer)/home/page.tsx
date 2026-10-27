import { getIdentityData } from "actions/getIdentityData";
import { getHomeLeaflet } from "src/homeLeaflet";
import { getLeafletTitle } from "src/utils/getLeafletTitle";
import {
  EAGERLY_VISIBLE_CARDS,
  identityHomeLeaflets,
  newestFirst,
} from "src/utils/homeLeaflets";
import { getFactsForRoots } from "app/api/rpc/[command]/getFactsForRoots";
import { supabaseServerClient } from "supabase/serverClient";

import { HomeContent } from "./HomeLayout";

export default async function Home() {
  let [auth_res, home_leaflet] = await Promise.all([
    getIdentityData(),
    getHomeLeaflet(),
  ]);

  let titles: { [k: string]: string } = {};
  for (let tok of auth_res?.permission_token_on_homepage ?? []) {
    let title = getLeafletTitle(tok.permission_tokens);
    if (title) titles[tok.permission_tokens.root_entity] = title;
  }

  // Include titles for drafts the user is a contributor on
  for (let row of auth_res?.contributor_leaflets ?? []) {
    let title = getLeafletTitle(row.permission_tokens);
    if (title) titles[row.permission_tokens.root_entity] = title;
  }

  // The first screen of card previews renders from the server instead of
  // waiting on a post-hydration fetch.
  let previewRoots = auth_res
    ? identityHomeLeaflets(auth_res)
        .filter((l) => !l.archived)
        .sort(newestFirst)
        .slice(0, EAGERLY_VISIBLE_CARDS)
        .map((l) => l.token.root_entity)
    : [];
  let { result: previews } = await getFactsForRoots.handler(
    { roots: previewRoots },
    { supabase: supabaseServerClient },
  );

  return (
    <HomeContent
      titles={titles}
      previewFacts={previews.facts}
      entityID={home_leaflet?.root_entity || null}
    />
  );
}
