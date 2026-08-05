import { getIdentityData } from "actions/getIdentityData";
import { getHomeLeaflet } from "src/homeLeaflet";
import { getLeafletTitle } from "src/utils/getLeafletTitle";

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

  return (
    <HomeContent titles={titles} entityID={home_leaflet?.root_entity || null} />
  );
}
